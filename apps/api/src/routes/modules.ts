import { asc, desc } from 'drizzle-orm';
import { Hono } from 'hono';
import type { GameModuleListResponse } from '@opes/contracts';
import { schema } from '@opes/db';
import { requireAuth, requireRole } from '../auth/session';
import type { AppDeps, AppEnv } from '../context';
import { ensureBuiltinModules } from '../lib/modules';

/** /admin/modules: danh sách game lưu trong cơ sở dữ liệu (Bước 7a chỉ đọc; sửa và phát hành ở 7c). */
export function moduleRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  app.use('*', requireAuth(deps), requireRole('admin'));

  app.get('/', async (c) => {
    const db = c.get('db');
    await ensureBuiltinModules(db);
    const modules = await db.select().from(schema.gameModules).orderBy(asc(schema.gameModules.createdAt), asc(schema.gameModules.key));
    const versions = await db
      .select({
        moduleKey: schema.gameModuleVersions.moduleKey,
        version: schema.gameModuleVersions.version,
        publishedAt: schema.gameModuleVersions.publishedAt,
        notes: schema.gameModuleVersions.notes,
        meta: schema.gameModuleVersions.meta,
      })
      .from(schema.gameModuleVersions)
      .orderBy(desc(schema.gameModuleVersions.publishedAt));
    const body: GameModuleListResponse = {
      items: modules.map((m) => {
        const own = versions.filter((v) => v.moduleKey === m.key);
        const latest = own.find((v) => v.version === m.latestVersion);
        return {
          key: m.key,
          kind: m.kind,
          name: m.name,
          description: m.description,
          latestVersion: m.latestVersion,
          builtin: m.builtin,
          versions: own.map((v) => ({ version: v.version, publishedAt: v.publishedAt.toISOString(), notes: v.notes })),
          presets: (latest?.meta.presets ?? []).map((p) => ({ id: p.id, name: p.name, description: p.description })),
          updatedAt: m.updatedAt.toISOString(),
        };
      }),
    };
    return c.json(body);
  });

  return app;
}
