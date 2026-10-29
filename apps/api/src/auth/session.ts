import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { ErrorCode } from '@opes/contracts';
import { schema, type Database } from '@opes/db';
import type { AppDeps, AppEnv, AuthUser } from '../context';
import { hashToken, randomToken } from '../lib/crypto';
import { AppError } from '../lib/errors';

export const SESSION_COOKIE = 'opes_session';
/** Phiên sống 7 ngày kể từ lần dùng gần nhất. */
export const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;
/** Chỉ gia hạn khi phiên đã dùng quá 1 giờ kể từ lần gia hạn trước, để không ghi DB mỗi request. */
const RENEW_AFTER_MS = 3600 * 1000;

export function clientIp(c: Context): string | null {
  const forwarded = c.req.header('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || c.req.header('x-real-ip') || null;
}

function writeCookie(c: Context, token: string, expires: Date, secure: boolean) {
  setCookie(c, SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    expires,
  });
}

/** Tạo phiên mới cho tài khoản và đặt cookie. */
export async function startSession(c: Context, deps: AppDeps, db: Database, userId: string) {
  const token = randomToken(32);
  const now = deps.now();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(schema.adminSessions).values({
    userId,
    tokenHash: hashToken(token, deps.sessionSecret()),
    expiresAt,
    ip: clientIp(c),
    userAgent: c.req.header('user-agent')?.slice(0, 500) ?? null,
  });
  writeCookie(c, token, expiresAt, deps.secureCookies());
}

/** Thu hồi phiên hiện tại (đăng xuất) và xóa cookie. */
export async function endSession(c: Context, deps: AppDeps, db: Database) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await db
      .update(schema.adminSessions)
      .set({ revokedAt: deps.now() })
      .where(eq(schema.adminSessions.tokenHash, hashToken(token, deps.sessionSecret())));
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

/** Thu hồi mọi phiên của một tài khoản (khi đổi/đặt lại mật khẩu hoặc vô hiệu hóa). */
export async function revokeAllSessions(db: Database, userId: string, now: Date, exceptSessionId?: string) {
  const rows = await db
    .select({ id: schema.adminSessions.id })
    .from(schema.adminSessions)
    .where(and(eq(schema.adminSessions.userId, userId), isNull(schema.adminSessions.revokedAt)));
  for (const row of rows) {
    if (row.id === exceptSessionId) continue;
    await db
      .update(schema.adminSessions)
      .set({ revokedAt: now })
      .where(eq(schema.adminSessions.id, row.id));
  }
}

/**
 * Bắt buộc đã đăng nhập. Gắn `user` vào request; tự gia hạn phiên 7 ngày khi được dùng.
 * Tài khoản phải đổi mật khẩu chỉ được gọi các đường dẫn cho phép (`allowWhenMustChange`).
 */
export function requireAuth(deps: AppDeps, options: { allowWhenMustChange?: boolean } = {}) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) {
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Bạn cần đăng nhập.');
    }
    const db = c.get('db');
    const now = deps.now();
    const [row] = await db
      .select({ session: schema.adminSessions, user: schema.users })
      .from(schema.adminSessions)
      .innerJoin(schema.users, eq(schema.users.id, schema.adminSessions.userId))
      .where(
        and(
          eq(schema.adminSessions.tokenHash, hashToken(token, deps.sessionSecret())),
          isNull(schema.adminSessions.revokedAt),
          gt(schema.adminSessions.expiresAt, now),
        ),
      )
      .limit(1);

    if (!row || row.user.status !== 'active') {
      deleteCookie(c, SESSION_COOKIE, { path: '/' });
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const newExpiry = new Date(now.getTime() + SESSION_TTL_MS);
    if (newExpiry.getTime() - row.session.expiresAt.getTime() > RENEW_AFTER_MS) {
      await db
        .update(schema.adminSessions)
        .set({ expiresAt: newExpiry })
        .where(eq(schema.adminSessions.id, row.session.id));
      writeCookie(c, token, newExpiry, deps.secureCookies());
    }

    const user: AuthUser = {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role,
      mustChangePassword: row.user.mustChangePassword,
      sessionId: row.session.id,
    };
    if (user.mustChangePassword && !options.allowWhenMustChange) {
      throw new AppError(
        403,
        ErrorCode.PASSWORD_CHANGE_REQUIRED,
        'Bạn cần đổi mật khẩu trước khi tiếp tục.',
      );
    }
    c.set('user', user);
    await next();
  });
}

/** Bắt buộc vai trò. Giai đoạn 1 mọi tài khoản là admin, nhưng API vẫn kiểm tra để sẵn cho giai đoạn 2. */
export function requireRole(...roles: AuthUser['role'][]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get('user').role)) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Bạn không có quyền thực hiện thao tác này.');
    }
    await next();
  });
}
