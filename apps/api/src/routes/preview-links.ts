import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  ErrorCode,
  type PreviewLink,
  PreviewLinkCreateRequestSchema,
  type PreviewLinkListResponse,
  PreviewLinkUpdateRequestSchema,
} from '@opes/contracts';
import { schema, type Database } from '@opes/db';
import { validateConfig } from '@opes/module-sdk/core';
import { getModuleSchema } from '@opes/modules/schemas';
import { requireAuth, requireRole } from '../auth/session';
import type { AppDeps, AppEnv } from '../context';
import { audit } from '../lib/audit';
import { hashPassword, randomToken } from '../lib/crypto';
import { AppError, parseInput, readJson } from '../lib/errors';

type LinkRow = typeof schema.previewLinks.$inferSelect;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mã tự đặt không được trùng các đường dẫn khác của trang chơi. */
const RESERVED_SLUGS = new Set(['api', 'media', 'admin', 'try', 'play', 'static', 'next']);

export function toPreviewLink(row: LinkRow, deps: AppDeps): PreviewLink {
  return {
    id: row.id,
    templateId: row.templateId,
    label: row.label,
    token: row.token,
    url: `${deps.playPublicUrl()}/try/${row.token}`,
    mode: row.mode,
    snapshotVersion: row.mode === 'snapshot' ? (row.snapshot?.publishedVersion ?? null) : null,
    hasPassword: Boolean(row.passwordHash),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    disabled: Boolean(row.disabledAt),
    viewCount: row.viewCount,
    lastViewedAt: row.lastViewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findTemplate(db: Database, id: string) {
  const [row] = UUID.test(id) ? await db.select().from(schema.templates).where(eq(schema.templates.id, id)).limit(1) : [];
  if (!row) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy template.');
  return row;
}

async function findLink(db: Database, id: string) {
  const [row] = UUID.test(id) ? await db.select().from(schema.previewLinks).where(eq(schema.previewLinks.id, id)).limit(1) : [];
  if (!row) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy link.');
  return row;
}

const isUniqueViolation = (e: unknown): boolean => {
  const code = (e as { code?: string })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  return code === '23505';
};

/**
 * /admin/preview-links
 *   GET  /?templateId=   danh sách link của template
 *   POST /?templateId=   tạo link
 *   PATCH /:id, DELETE /:id
 */
export function previewLinkRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  app.use('*', requireAuth(deps), requireRole('admin'));

  app.get('/', async (c) => {
    const db = c.get('db');
    const template = await findTemplate(db, c.req.query('templateId') ?? '');
    const rows = await db
      .select()
      .from(schema.previewLinks)
      .where(eq(schema.previewLinks.templateId, template.id))
      .orderBy(desc(schema.previewLinks.createdAt));
    const body: PreviewLinkListResponse = { items: rows.map((r) => toPreviewLink(r, deps)) };
    return c.json(body);
  });

  app.post('/', async (c) => {
    const db = c.get('db');
    const input = parseInput(PreviewLinkCreateRequestSchema, await readJson(c.req));
    const template = await findTemplate(db, c.req.query('templateId') ?? '');
    if (template.archivedAt) {
      throw new AppError(409, ErrorCode.TEMPLATE_ARCHIVED, 'Template đã lưu trữ, không tạo link mới được.');
    }

    let snapshot: LinkRow['snapshot'] = null;
    if (input.mode === 'snapshot') {
      const source = input.snapshotSource ?? 'published';
      if (source === 'published') {
        if (!template.publishedConfig) {
          throw new AppError(400, ErrorCode.VALIDATION, 'Template chưa công bố lần nào; hãy chụp từ bản nháp hoặc công bố trước.');
        }
        snapshot = {
          moduleKey: template.moduleKey,
          moduleVersion: template.publishedModuleVersion ?? template.moduleVersion,
          templateRevision: template.publishedRevision ?? template.revision,
          publishedVersion: template.publishedVersion,
          config: template.publishedConfig,
        };
      } else {
        const mod = getModuleSchema(template.moduleKey);
        const count = mod ? Object.keys(validateConfig(mod.fields, template.config)).length : 0;
        if (count > 0) {
          throw new AppError(422, ErrorCode.TEMPLATE_INVALID, `Bản nháp còn ${count} lỗi nên chưa chụp được. Sửa và lưu nháp trước.`);
        }
        snapshot = {
          moduleKey: template.moduleKey,
          moduleVersion: template.moduleVersion,
          templateRevision: template.revision,
          publishedVersion: null,
          config: template.config,
        };
      }
    }

    if (input.slug && RESERVED_SLUGS.has(input.slug)) {
      throw new AppError(409, ErrorCode.SLUG_TAKEN, 'Mã link này đã được dùng. Chọn mã khác.', { fields: { slug: 'Mã link này đã được dùng.' } });
    }
    const user = c.get('user');
    let row: LinkRow | undefined;
    try {
      [row] = await db
        .insert(schema.previewLinks)
        .values({
          token: input.slug ?? randomToken(16),
          templateId: template.id,
          label: input.label,
          mode: input.mode,
          snapshot,
          passwordHash: input.password ? await hashPassword(input.password) : null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          createdBy: user.id,
        })
        .returning();
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new AppError(409, ErrorCode.SLUG_TAKEN, 'Mã link này đã được dùng. Chọn mã khác.', { fields: { slug: 'Mã link này đã được dùng.' } });
      }
      throw e;
    }
    await audit(db, {
      userId: user.id,
      action: 'preview_link.create',
      entity: 'preview_link',
      entityId: row!.id,
      data: { template: template.name, mode: input.mode, label: input.label },
    });
    return c.json({ link: toPreviewLink(row!, deps) }, 201);
  });



  app.patch('/:id', async (c) => {
    const db = c.get('db');
    const input = parseInput(PreviewLinkUpdateRequestSchema, await readJson(c.req));
    const link = await findLink(db, c.req.param('id'));
    const set: Partial<typeof schema.previewLinks.$inferInsert> = {};
    if (input.label !== undefined) set.label = input.label;
    if (input.password !== undefined) set.passwordHash = input.password === null ? null : await hashPassword(input.password);
    if (input.expiresAt !== undefined) set.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.disabled !== undefined) set.disabledAt = input.disabled ? (link.disabledAt ?? deps.now()) : null;
    const [row] = Object.keys(set).length
      ? await db.update(schema.previewLinks).set(set).where(eq(schema.previewLinks.id, link.id)).returning()
      : [link];
    await audit(db, {
      userId: c.get('user').id,
      action: 'preview_link.update',
      entity: 'preview_link',
      entityId: link.id,
      // Không ghi mật khẩu vào nhật ký, chỉ ghi là có đổi.
      data: { ...input, password: input.password === undefined ? undefined : input.password === null ? 'removed' : 'changed' },
    });
    return c.json({ link: toPreviewLink(row!, deps) });
  });

  app.delete('/:id', async (c) => {
    const db = c.get('db');
    const link = await findLink(db, c.req.param('id'));
    await db.delete(schema.previewLinks).where(eq(schema.previewLinks.id, link.id));
    await audit(db, { userId: c.get('user').id, action: 'preview_link.delete', entity: 'preview_link', entityId: link.id, data: { label: link.label } });
    return c.body(null, 204);
  });

  return app;
}
