import { desc, eq } from 'drizzle-orm';
import { ErrorCode, type TemplateDetail, type TemplateSummary } from '@opes/contracts';
import { schema, type Database } from '@opes/db';
import { AppError } from './errors';
import { sandbox } from './module-sandbox';
import { getModuleVersion, moduleNames, type ModuleVersion } from './modules';

/** Đọc và kiểm tra template dùng chung cho các route /admin/templates. */

export type TemplateRow = typeof schema.templates.$inferSelect;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Phiên bản game mà template đang dùng; không còn thì lấy bản mới nhất. */
export async function moduleFor(
  db: Database,
  row: Pick<TemplateRow, 'moduleKey' | 'moduleVersion'>,
): Promise<ModuleVersion> {
  try {
    return await getModuleVersion(db, row.moduleKey, row.moduleVersion);
  } catch {
    return getModuleVersion(db, row.moduleKey);
  }
}

/** Các cột cần để hiển thị danh sách (không lấy cấu hình đã công bố và các cột lớn khác). */
export const SUMMARY_COLUMNS = {
  id: schema.templates.id,
  name: schema.templates.name,
  brandName: schema.templates.brandName,
  description: schema.templates.description,
  moduleKey: schema.templates.moduleKey,
  archivedAt: schema.templates.archivedAt,
  publishedVersion: schema.templates.publishedVersion,
  publishedAt: schema.templates.publishedAt,
  publishedRevision: schema.templates.publishedRevision,
  revision: schema.templates.revision,
  updatedAt: schema.templates.updatedAt,
  config: schema.templates.config,
};

type SummaryRow = Pick<TemplateRow, keyof typeof SUMMARY_COLUMNS>;

export function toSummary(row: SummaryRow, names: Map<string, string>): TemplateSummary {
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

export async function findTemplate(db: Database, id: string): Promise<TemplateRow> {
  const [row] = UUID.test(id)
    ? await db.select().from(schema.templates).where(eq(schema.templates.id, id)).limit(1)
    : [];
  if (!row) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy template.');
  return row;
}

export function ensureActive(row: TemplateRow) {
  if (row.archivedAt) {
    throw new AppError(
      409,
      ErrorCode.TEMPLATE_ARCHIVED,
      'Template đã lưu trữ. Khôi phục để sửa tiếp.',
    );
  }
}

export const conflict = (revision: number) =>
  new AppError(
    409,
    ErrorCode.TEMPLATE_CONFLICT,
    'Template vừa được lưu ở nơi khác (có thể bởi đồng nghiệp hoặc ở thẻ khác). Tải lại để xem bản mới nhất.',
    { details: { revision } },
  );

export function ensureRevision(row: TemplateRow, baseRevision: number) {
  if (row.revision !== baseRevision) throw conflict(row.revision);
}

export async function latestVersionOf(db: Database, key: string): Promise<string | null> {
  const [m] = await db
    .select({ latest: schema.gameModules.latestVersion })
    .from(schema.gameModules)
    .where(eq(schema.gameModules.key, key))
    .limit(1);
  return m?.latest ?? null;
}

export async function detail(db: Database, row: TemplateRow): Promise<TemplateDetail> {
  // Các truy vấn độc lập: chạy song song.
  const [versions, mod, names, latestModuleVersion] = await Promise.all([
    db
      .select({
        version: schema.templateVersions.version,
        moduleVersion: schema.templateVersions.moduleVersion,
        publishedAt: schema.templateVersions.publishedAt,
        publishedByName: schema.users.name,
      })
      .from(schema.templateVersions)
      .leftJoin(schema.users, eq(schema.users.id, schema.templateVersions.publishedBy))
      .where(eq(schema.templateVersions.templateId, row.id))
      .orderBy(desc(schema.templateVersions.version)),
    moduleFor(db, row).catch(() => null),
    moduleNames(db),
    latestVersionOf(db, row.moduleKey),
  ]);
  return {
    ...toSummary(row, names),
    moduleVersion: mod?.version ?? row.moduleVersion,
    latestModuleVersion,
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
