import { and, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  ErrorCode,
  TemplateCreateRequestSchema,
  type TemplateDetail,
  type TemplateListResponse,
  TemplatePublishRequestSchema,
  TemplateSaveRequestSchema,
  TemplateStatusSchema,
  type TemplateSummary,
  type TemplateVersionResponse,
} from '@opes/contracts';
import { schema, type Database } from '@opes/db';
import { requireAuth, requireRole } from '../auth/session';
import type { AppDeps, AppEnv } from '../context';
import { audit } from '../lib/audit';
import { AppError, parseInput, readJson } from '../lib/errors';
import { sandbox } from '../lib/module-sandbox';
import { getModuleVersion, moduleNames, type ModuleVersion } from '../lib/modules';

type TemplateRow = typeof schema.templates.$inferSelect;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Phiên bản game mà template đang dùng; không còn thì lấy bản mới nhất. */
async function moduleFor(db: Database, row: Pick<TemplateRow, 'moduleKey' | 'moduleVersion'>): Promise<ModuleVersion> {
  try {
    return await getModuleVersion(db, row.moduleKey, row.moduleVersion);
  } catch {
    return getModuleVersion(db, row.moduleKey);
  }
}

function toSummary(row: TemplateRow, names: Map<string, string>): TemplateSummary {
  return {
    id: row.id,
    name: row.name,
    brandName: row.brandName,
    note: row.description,
    moduleKey: row.moduleKey,
    moduleName: names.get(row.moduleKey) ?? row.moduleKey,
    status: row.archivedAt ? 'archived' : 'active',
    publishedVersion: row.publishedVersion,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    hasUnpublishedChanges: row.publishedRevision !== row.revision,
    updatedAt: row.updatedAt.toISOString(),
    config: row.config,
  };
}

async function findTemplate(db: Database, id: string): Promise<TemplateRow> {
  const [row] = UUID.test(id)
    ? await db.select().from(schema.templates).where(eq(schema.templates.id, id)).limit(1)
    : [];
  if (!row) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy template.');
  return row;
}

function ensureActive(row: TemplateRow) {
  if (row.archivedAt) {
    throw new AppError(409, ErrorCode.TEMPLATE_ARCHIVED, 'Template đã lưu trữ. Khôi phục để sửa tiếp.');
  }
}

const conflict = (revision: number) =>
  new AppError(
    409,
    ErrorCode.TEMPLATE_CONFLICT,
    'Template vừa được lưu ở nơi khác (có thể bởi đồng nghiệp hoặc ở thẻ khác). Tải lại để xem bản mới nhất.',
    { details: { revision } },
  );

function ensureRevision(row: TemplateRow, baseRevision: number) {
  if (row.revision !== baseRevision) throw conflict(row.revision);
}

async function detail(db: Database, row: TemplateRow): Promise<TemplateDetail> {
  const versions = await db
    .select({
      version: schema.templateVersions.version,
      moduleVersion: schema.templateVersions.moduleVersion,
      publishedAt: schema.templateVersions.publishedAt,
      publishedByName: schema.users.name,
    })
    .from(schema.templateVersions)
    .leftJoin(schema.users, eq(schema.users.id, schema.templateVersions.publishedBy))
    .where(eq(schema.templateVersions.templateId, row.id))
    .orderBy(desc(schema.templateVersions.version));
  const mod = await moduleFor(db, row).catch(() => null);
  return {
    ...toSummary(row, await moduleNames(db)),
    moduleVersion: row.moduleVersion,
    revision: row.revision,
    publishedConfig: row.publishedConfig,
    errors: mod ? await sandbox.validate(mod.schemaJs, row.config) : {},
    versions: versions.map((v) => ({
      version: v.version,
      moduleVersion: v.moduleVersion,
      publishedAt: v.publishedAt.toISOString(),
      publishedByName: v.publishedByName ?? null,
    })),
  };
}

export function templateRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  app.use('*', requireAuth(deps), requireRole('admin'));

  /** Danh sách: ?status=active|archived (mặc định active), ?q= tìm theo tên hoặc nhãn hàng. */
  app.get('/', async (c) => {
    const db = c.get('db');
    const status = TemplateStatusSchema.safeParse(c.req.query('status') ?? 'active');
    if (!status.success) throw new AppError(400, ErrorCode.VALIDATION, 'Trạng thái không hợp lệ.');
    const filters: SQL[] = [
      status.data === 'archived' ? isNotNull(schema.templates.archivedAt) : isNull(schema.templates.archivedAt),
    ];
    const q = c.req.query('q')?.trim();
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
      filters.push(or(ilike(schema.templates.name, like), ilike(schema.templates.brandName, like))!);
    }
    const moduleKey = c.req.query('module');
    if (moduleKey) filters.push(eq(schema.templates.moduleKey, moduleKey));
    const rows = await db
      .select()
      .from(schema.templates)
      .where(and(...filters))
      .orderBy(desc(schema.templates.updatedAt))
      .limit(500);
    const names = await moduleNames(db);
    const body: TemplateListResponse = { items: rows.map((r) => toSummary(r, names)) };
    return c.json(body);
  });

  /** Tạo template từ mặc định, mẫu có sẵn, cấu hình gửi lên, hoặc nhân bản. */
  app.post('/', async (c) => {
    const db = c.get('db');
    const input = parseInput(TemplateCreateRequestSchema, await readJson(c.req));
    let moduleKey = input.moduleKey;
    let raw: unknown;
    const source = input.source;
    if (source.type === 'duplicate') {
      const original = await findTemplate(db, source.templateId);
      moduleKey = original.moduleKey;
      raw = original.config;
    }
    if (!moduleKey) throw new AppError(400, ErrorCode.VALIDATION, 'Chọn loại game.', { fields: { moduleKey: 'Chọn loại game.' } });
    const mod = await getModuleVersion(db, moduleKey);
    if (source.type === 'defaults') raw = mod.meta.defaults;
    if (source.type === 'config') raw = source.config;
    if (source.type === 'preset') {
      const preset = mod.meta.presets.find((p) => p.id === source.presetId);
      if (!preset) throw new AppError(400, ErrorCode.VALIDATION, 'Không có mẫu này.');
      raw = preset.config;
    }
    const user = c.get('user');
    const [row] = await db
      .insert(schema.templates)
      .values({
        name: input.name,
        brandName: input.brandName,
        description: input.note,
        moduleKey: mod.key,
        moduleVersion: mod.version,
        config: await sandbox.normalize(mod.schemaJs, raw),
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning();
    await audit(db, {
      userId: user.id,
      action: 'template.create',
      entity: 'template',
      entityId: row!.id,
      data: { name: row!.name, source: source.type },
    });
    return c.json({ template: await detail(db, row!) }, 201);
  });

  app.get('/:id', async (c) => {
    const db = c.get('db');
    const row = await findTemplate(db, c.req.param('id'));
    return c.json({ template: await detail(db, row) });
  });

  /** Lưu nháp: được lưu cả khi cấu hình còn lỗi; không đổi link "luôn mới nhất". */
  app.put('/:id', async (c) => {
    const db = c.get('db');
    const input = parseInput(TemplateSaveRequestSchema, await readJson(c.req));
    const row = await findTemplate(db, c.req.param('id'));
    ensureActive(row);
    const mod = await moduleFor(db, row);
    const [saved] = await db
      .update(schema.templates)
      .set({
        name: input.name,
        brandName: input.brandName,
        description: input.note,
        config: await sandbox.normalize(mod.schemaJs, input.config),
        moduleVersion: mod.version,
        revision: sql`${schema.templates.revision} + 1`,
        updatedBy: c.get('user').id,
        updatedAt: deps.now(),
      })
      // Chỉ ghi khi chưa ai lưu chen (tránh ghi đè thay đổi của người khác).
      .where(and(eq(schema.templates.id, row.id), eq(schema.templates.revision, input.baseRevision)))
      .returning();
    if (!saved) throw conflict((await findTemplate(db, row.id)).revision);
    return c.json({ template: await detail(db, saved!) });
  });

  /** Công bố bản nháp hiện tại; bị chặn nếu còn lỗi (quyết định 81). */
  app.post('/:id/publish', async (c) => {
    const db = c.get('db');
    const input = parseInput(TemplatePublishRequestSchema, await readJson(c.req));
    const user = c.get('user');
    const now = deps.now();
    const id = (await findTemplate(db, c.req.param('id'))).id;
    const result = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(schema.templates).where(eq(schema.templates.id, id)).for('update');
      if (!row) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy template.');
      ensureActive(row);
      ensureRevision(row, input.baseRevision);
      const mod = await moduleFor(db, row);
      const errors = await sandbox.validate(mod.schemaJs, row.config);
      const count = Object.keys(errors).length;
      if (count > 0) {
        throw new AppError(422, ErrorCode.TEMPLATE_INVALID, `Còn ${count} lỗi cần sửa trước khi công bố.`, {
          fields: errors,
        });
      }
      const version = row.publishedVersion + 1;
      await tx.insert(schema.templateVersions).values({
        templateId: row.id,
        version,
        moduleVersion: row.moduleVersion,
        config: row.config,
        publishedBy: user.id,
        publishedAt: now,
      });
      const [published] = await tx
        .update(schema.templates)
        .set({
          publishedConfig: row.config,
          publishedModuleVersion: row.moduleVersion,
          publishedVersion: version,
          publishedRevision: row.revision,
          publishedAt: now,
          publishedBy: user.id,
        })
        .where(eq(schema.templates.id, row.id))
        .returning();
      return published!;
    });
    await audit(db, {
      userId: user.id,
      action: 'template.publish',
      entity: 'template',
      entityId: result.id,
      data: { name: result.name, version: result.publishedVersion },
    });
    return c.json({ template: await detail(db, result) });
  });

  async function findVersion(db: Database, templateId: string, versionParam: string) {
    const version = Number(versionParam);
    const [v] = Number.isInteger(version)
      ? await db
          .select({
            version: schema.templateVersions.version,
            moduleVersion: schema.templateVersions.moduleVersion,
            config: schema.templateVersions.config,
            publishedAt: schema.templateVersions.publishedAt,
            publishedByName: schema.users.name,
          })
          .from(schema.templateVersions)
          .leftJoin(schema.users, eq(schema.users.id, schema.templateVersions.publishedBy))
          .where(and(eq(schema.templateVersions.templateId, templateId), eq(schema.templateVersions.version, version)))
          .limit(1)
      : [];
    if (!v) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy phiên bản này.');
    return v;
  }

  /** Xem lại một lần công bố. */
  app.get('/:id/versions/:version', async (c) => {
    const db = c.get('db');
    const row = await findTemplate(db, c.req.param('id'));
    const v = await findVersion(db, row.id, c.req.param('version'));
    const body: TemplateVersionResponse = {
      version: v.version,
      moduleVersion: v.moduleVersion,
      config: v.config,
      publishedAt: v.publishedAt.toISOString(),
      publishedByName: v.publishedByName ?? null,
    };
    return c.json(body);
  });

  /** Khôi phục một lần công bố vào bản nháp; muốn áp dụng cho link thì bấm Công bố. */
  app.post('/:id/versions/:version/restore', async (c) => {
    const db = c.get('db');
    const input = parseInput(TemplatePublishRequestSchema, await readJson(c.req));
    const row = await findTemplate(db, c.req.param('id'));
    ensureActive(row);
    const v = await findVersion(db, row.id, c.req.param('version'));
    const mod = await moduleFor(db, row);
    const [saved] = await db
      .update(schema.templates)
      .set({
        config: await sandbox.normalize(mod.schemaJs, v.config),
        moduleVersion: mod.version,
        revision: sql`${schema.templates.revision} + 1`,
        updatedBy: c.get('user').id,
        updatedAt: deps.now(),
      })
      .where(and(eq(schema.templates.id, row.id), eq(schema.templates.revision, input.baseRevision)))
      .returning();
    if (!saved) throw conflict((await findTemplate(db, row.id)).revision);
    await audit(db, {
      userId: c.get('user').id,
      action: 'template.restore',
      entity: 'template',
      entityId: row.id,
      data: { name: row.name, version: v.version },
    });
    return c.json({ template: await detail(db, saved!) });
  });

  /** Lưu trữ: ẩn khỏi danh sách, mọi link chơi thử ngừng chạy (quyết định 106). */
  app.post('/:id/archive', async (c) => {
    const db = c.get('db');
    const row = await findTemplate(db, c.req.param('id'));
    const [saved] = await db
      .update(schema.templates)
      .set({ archivedAt: row.archivedAt ?? deps.now() })
      .where(eq(schema.templates.id, row.id))
      .returning();
    await audit(db, { userId: c.get('user').id, action: 'template.archive', entity: 'template', entityId: row.id, data: { name: row.name } });
    return c.json({ template: await detail(db, saved!) });
  });

  app.post('/:id/unarchive', async (c) => {
    const db = c.get('db');
    const row = await findTemplate(db, c.req.param('id'));
    const [saved] = await db
      .update(schema.templates)
      .set({ archivedAt: null })
      .where(eq(schema.templates.id, row.id))
      .returning();
    await audit(db, { userId: c.get('user').id, action: 'template.unarchive', entity: 'template', entityId: row.id, data: { name: row.name } });
    return c.json({ template: await detail(db, saved!) });
  });

  /** Xóa hẳn: chỉ template đã lưu trữ; mất luôn lịch sử và link chơi thử. */
  app.delete('/:id', async (c) => {
    const db = c.get('db');
    const row = await findTemplate(db, c.req.param('id'));
    if (!row.archivedAt) {
      throw new AppError(409, ErrorCode.TEMPLATE_NOT_ARCHIVED, 'Lưu trữ template trước rồi mới xóa hẳn được.');
    }
    await db.delete(schema.templates).where(eq(schema.templates.id, row.id));
    await audit(db, { userId: c.get('user').id, action: 'template.delete', entity: 'template', entityId: row.id, data: { name: row.name } });
    return c.body(null, 204);
  });

  return app;
}
