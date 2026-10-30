import { eq, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { ErrorCode, type TryResponse, TryUnlockRequestSchema } from '@opes/contracts';
import { schema, type Database } from '@opes/db';
import { clientIp } from '../auth/session';
import type { AppDeps, AppEnv } from '../context';
import { hashToken, verifyPassword } from '../lib/crypto';
import { AppError, parseInput, readJson } from '../lib/errors';
import { rewriteMediaUrls } from '../lib/media-urls';
import { sandbox } from '../lib/module-sandbox';
import { getModuleVersion } from '../lib/modules';
import { hitRateLimit } from '../lib/rate-limit';

type LinkRow = typeof schema.previewLinks.$inferSelect;
const UNLOCK_TTL_MS = 30 * 24 * 3600 * 1000;

/** Tên cookie mở khóa riêng cho từng link (mỗi link một mật khẩu). */
const unlockCookie = (link: LinkRow) => `opes_try_${link.id.replace(/-/g, '').slice(0, 12)}`;
/** Giá trị cookie gắn với mật khẩu hiện tại: đổi mật khẩu thì cookie cũ hết tác dụng. */
const unlockValue = (link: LinkRow, secret: string) => hashToken(`${link.id}:${link.passwordHash}`, secret);

async function findLink(db: Database, token: string) {
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(token)) return null;
  const [row] = await db
    .select({ link: schema.previewLinks, template: schema.templates })
    .from(schema.previewLinks)
    .innerJoin(schema.templates, eq(schema.templates.id, schema.previewLinks.templateId))
    .where(eq(schema.previewLinks.token, token))
    .limit(1);
  return row ?? null;
}

function titleOf(config: Record<string, unknown> | null, fallback: string): string {
  const content = config?.content;
  const title = content && typeof content === 'object' ? (content as Record<string, unknown>).title : undefined;
  return typeof title === 'string' && title.trim() ? title : fallback;
}

export function publicRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  const respond = (c: Context, body: TryResponse, status: 200 | 401 | 404 | 410 = 200) => c.json(body, status);

  /** Trang chơi thử tải cấu hình game theo mã link. */
  app.get('/try/:token', async (c) => {
    const db = c.get('db');
    const found = await findLink(db, c.req.param('token'));
    if (!found) return respond(c, { status: 'not_found' }, 404);
    const { link, template } = found;
    const now = deps.now();
    if (link.disabledAt || template.archivedAt) return respond(c, { status: 'disabled' }, 410);
    if (link.expiresAt && link.expiresAt <= now) return respond(c, { status: 'expired' }, 410);

    const raw = link.mode === 'snapshot' ? (link.snapshot?.config ?? null) : template.publishedConfig;
    const moduleKey = link.mode === 'snapshot' ? (link.snapshot?.moduleKey ?? template.moduleKey) : template.moduleKey;
    const moduleVersion =
      link.mode === 'snapshot'
        ? (link.snapshot?.moduleVersion ?? template.moduleVersion)
        : (template.publishedModuleVersion ?? template.moduleVersion);
    if (link.passwordHash && getCookie(c, unlockCookie(link)) !== unlockValue(link, deps.sessionSecret())) {
      return respond(c, { status: 'password_required', title: titleOf(raw, template.name) }, 401);
    }
    const mod = raw
      ? await getModuleVersion(db, moduleKey, moduleVersion).catch(() => getModuleVersion(db, moduleKey).catch(() => null))
      : null;
    if (!raw || !mod) return respond(c, { status: 'not_published' }, 404);

    let config = await sandbox.normalize(mod.schemaJs, raw);
    const storage = deps.getStorage();
    if (deps.mediaProxy() && storage) config = rewriteMediaUrls(config, storage.publicUrl(''));

    await db
      .update(schema.previewLinks)
      .set({ viewCount: sql`${schema.previewLinks.viewCount} + 1`, lastViewedAt: now })
      .where(eq(schema.previewLinks.id, link.id));

    return respond(c, {
      status: 'ok',
      moduleKey: mod.key,
      moduleVersion: mod.version,
      title: titleOf(config, template.name),
      config,
    });
  });

  /** Nhập mật khẩu của link; đúng thì đặt cookie mở khóa 30 ngày. */
  app.post('/try/:token/unlock', async (c) => {
    const db = c.get('db');
    const input = parseInput(TryUnlockRequestSchema, await readJson(c.req));
    const found = await findLink(db, c.req.param('token'));
    const link = found?.link;
    const passwordHash = link?.passwordHash;
    if (!link || !passwordHash) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy link.');
    const allowed = await hitRateLimit(db, `try-unlock:${clientIp(c) ?? 'unknown'}:${link.id}`, 10, 15 * 60, deps.now());
    if (!allowed) {
      throw new AppError(429, ErrorCode.RATE_LIMITED, 'Bạn nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
    }
    if (!(await verifyPassword(input.password, passwordHash))) {
      throw new AppError(401, ErrorCode.WRONG_PASSWORD, 'Mật khẩu không đúng.');
    }
    setCookie(c, unlockCookie(link), unlockValue(link, deps.sessionSecret()), {
      path: '/',
      httpOnly: true,
      secure: deps.secureCookies(),
      sameSite: 'Lax',
      expires: new Date(deps.now().getTime() + UNLOCK_TTL_MS),
    });
    return c.json({ ok: true });
  });

  return app;
}
