import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import builtin from '@opes/modules/bundles';
import { ErrorCode } from '@opes/contracts';
import { schema, type Database, type GameModuleMeta } from '@opes/db';
import { AppError } from './errors';
import { LruCache } from './lru';
import { sandbox } from './module-sandbox';

/**
 * Danh sách game lấy từ cơ sở dữ liệu (Bước 7). Game có sẵn trong code được nạp vào lần đầu
 * (chỉ khi chưa có trong cơ sở dữ liệu; sửa trong CMS thì không bị ghi đè).
 */

export interface ModuleVersion {
  key: string;
  version: string;
  meta: GameModuleMeta;
  schemaJs: string;
  runtimeJs: string;
}

interface BuiltinBundle {
  folder: string;
  meta: GameModuleMeta;
  files: Record<string, string>;
  schemaJs: string;
  runtimeJs: string;
}

/** Gói đã biên dịch không đổi sau khi phát hành, nên giữ trong bộ nhớ theo khóa key@version. */
const cache = new LruCache<string, ModuleVersion>(50);
/**
 * Cấu hình đã chuẩn hóa theo key@version + bản băm cấu hình gốc. Chuẩn hóa chạy code game trong
 * sandbox (tốn vài ms đến vài chục ms), nên trang chơi không phải chạy lại cho mỗi lượt xem.
 */
const normalized = new LruCache<string, Record<string, unknown>>(500);
let seeded: Promise<void> | null = null;

/** Nạp các game có sẵn còn thiếu; chạy một lần cho mỗi tiến trình. */
export function ensureBuiltinModules(db: Database): Promise<void> {
  seeded ??= (async () => {
    for (const b of builtin as BuiltinBundle[]) {
      const inserted = await db
        .insert(schema.gameModules)
        .values({
          key: b.meta.key,
          kind: b.meta.kind,
          name: b.meta.name,
          description: b.meta.description,
          latestVersion: b.meta.version,
          builtin: true,
        })
        .onConflictDoNothing({ target: schema.gameModules.key })
        .returning({ key: schema.gameModules.key });
      if (inserted.length === 0) continue;
      await db
        .insert(schema.gameModuleVersions)
        .values({
          moduleKey: b.meta.key,
          version: b.meta.version,
          files: b.files,
          schemaJs: b.schemaJs,
          runtimeJs: b.runtimeJs,
          meta: b.meta,
          notes: 'Nạp sẵn từ code của hệ thống',
        })
        .onConflictDoNothing();
    }
  })().catch((e) => {
    seeded = null;
    throw e;
  });
  return seeded;
}

/** Quên trạng thái đã nạp (dùng trong kiểm thử sau khi xóa dữ liệu). */
export function resetModuleRegistry() {
  seeded = null;
  cache.clear();
  normalized.clear();
}

/**
 * Chuẩn hóa cấu hình theo game, có lưu đệm. Kết quả chỉ phụ thuộc vào phiên bản game (không đổi sau khi
 * phát hành) và nội dung cấu hình, nên khóa đệm là key@version + sha256 của cấu hình.
 * Không được sửa đối tượng trả về (dùng chung giữa các request).
 */
export async function normalizeConfig(mod: ModuleVersion, config: unknown): Promise<Record<string, unknown>> {
  const digest = createHash('sha256').update(JSON.stringify(config ?? null)).digest('base64url');
  const cacheKey = `${mod.key}@${mod.version}:${digest}`;
  const hit = normalized.get(cacheKey);
  if (hit) return hit;
  const result = await sandbox.normalize(mod.schemaJs, config);
  normalized.set(cacheKey, result);
  return result;
}

/** Phiên bản của game: `version` cụ thể, hoặc bản phát hành mới nhất. */
export async function getModuleVersion(db: Database, key: string, version?: string | null): Promise<ModuleVersion> {
  await ensureBuiltinModules(db);
  let wanted = version ?? null;
  if (!wanted) {
    const [row] = await db
      .select({ latest: schema.gameModules.latestVersion })
      .from(schema.gameModules)
      .where(eq(schema.gameModules.key, key))
      .limit(1);
    wanted = row?.latest ?? null;
  }
  if (!wanted) throw new AppError(400, ErrorCode.MODULE_NOT_FOUND, `Không có loại game "${key}".`);
  const cacheKey = `${key}@${wanted}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const [row] = await db
    .select()
    .from(schema.gameModuleVersions)
    .where(and(eq(schema.gameModuleVersions.moduleKey, key), eq(schema.gameModuleVersions.version, wanted)))
    .limit(1);
  if (!row) throw new AppError(400, ErrorCode.MODULE_NOT_FOUND, `Không có loại game "${key}" phiên bản ${wanted}.`);
  const found: ModuleVersion = { key, version: row.version, meta: row.meta, schemaJs: row.schemaJs, runtimeJs: row.runtimeJs };
  cache.set(cacheKey, found);
  return found;
}

/** Tên hiển thị của các game (để hiện trong danh sách template). */
export async function moduleNames(db: Database): Promise<Map<string, string>> {
  await ensureBuiltinModules(db);
  const rows = await db.select({ key: schema.gameModules.key, name: schema.gameModules.name }).from(schema.gameModules);
  return new Map(rows.map((r) => [r.key, r.name]));
}
