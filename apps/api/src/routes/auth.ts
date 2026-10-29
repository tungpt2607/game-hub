import { count, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  ChangePasswordRequestSchema,
  ErrorCode,
  LoginRequestSchema,
  type MeResponse,
  type SetupStatus,
  SetupRequestSchema,
} from '@opes/contracts';
import { schema } from '@opes/db';
import { clientIp, endSession, requireAuth, revokeAllSessions, startSession } from '../auth/session';
import type { AppDeps, AppEnv } from '../context';
import { audit } from '../lib/audit';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { AppError, parseInput, readJson } from '../lib/errors';
import { hitRateLimit } from '../lib/rate-limit';
import { toUser } from '../lib/users';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
/** Khóa cố định cho pg_advisory_xact_lock để hai yêu cầu thiết lập lần đầu không chạy song song. */
const SETUP_LOCK_KEY = 7_202_601;

let dummyHash: Promise<string> | undefined;
/** Băm giả để thời gian trả lời như nhau dù email có tồn tại hay không. */
const getDummyHash = () => (dummyHash ??= hashPassword('mat-khau-gia-de-can-bang-thoi-gian'));

export function authRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.get('/setup-status', async (c) => {
    const [row] = await c.get('db').select({ value: count() }).from(schema.users);
    const body: SetupStatus = { needsSetup: (row?.value ?? 0) === 0 };
    return c.json(body);
  });

  /** Tạo quản trị viên đầu tiên. Có tài khoản rồi thì luôn từ chối. */
  app.post('/setup', async (c) => {
    const input = parseInput(SetupRequestSchema, await readJson(c.req));
    const db = c.get('db');
    const passwordHash = await hashPassword(input.password);

    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${SETUP_LOCK_KEY})`);
      const [row] = await tx.select({ value: count() }).from(schema.users);
      if ((row?.value ?? 0) > 0) {
        throw new AppError(409, ErrorCode.SETUP_DONE, 'Hệ thống đã có tài khoản. Vui lòng đăng nhập.');
      }
      const [user] = await tx
        .insert(schema.users)
        .values({ email: input.email, name: input.name, passwordHash, role: 'admin' })
        .returning();
      return user!;
    });

    await audit(db, { userId: created.id, action: 'setup', entity: 'user', entityId: created.id });
    await startSession(c, deps, db, created.id);
    const body: MeResponse = { user: toUser(created) };
    return c.json(body, 201);
  });

  app.post('/login', async (c) => {
    const input = parseInput(LoginRequestSchema, await readJson(c.req));
    const db = c.get('db');
    const now = deps.now();

    const ip = clientIp(c) ?? 'unknown';
    if (!(await hitRateLimit(db, `login:ip:${ip}`, 30, 15 * 60, now))) {
      throw new AppError(429, ErrorCode.RATE_LIMITED, 'Bạn thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.');
    }

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, input.email)).limit(1);
    if (!user) {
      await verifyPassword(input.password, await getDummyHash());
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Email hoặc mật khẩu không đúng.');
    }

    if (user.lockedUntil && user.lockedUntil > now) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      throw new AppError(
        423,
        ErrorCode.ACCOUNT_LOCKED,
        `Tài khoản tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${minutes} phút.`,
      );
    }

    if (!(await verifyPassword(input.password, user.passwordHash))) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await db
        .update(schema.users)
        .set(
          lock
            ? { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60000) }
            : { failedLoginCount: failed },
        )
        .where(eq(schema.users.id, user.id));
      if (lock) {
        await audit(db, { userId: user.id, action: 'login.locked', entity: 'user', entityId: user.id });
        throw new AppError(
          423,
          ErrorCode.ACCOUNT_LOCKED,
          `Bạn đã nhập sai ${MAX_FAILED_LOGINS} lần. Tài khoản tạm khóa ${LOCK_MINUTES} phút.`,
        );
      }
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Email hoặc mật khẩu không đúng.');
    }

    if (user.status !== 'active') {
      throw new AppError(403, ErrorCode.ACCOUNT_DISABLED, 'Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên.');
    }

    const [updated] = await db
      .update(schema.users)
      .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: now })
      .where(eq(schema.users.id, user.id))
      .returning();
    await startSession(c, deps, db, user.id);
    await audit(db, { userId: user.id, action: 'login', entity: 'user', entityId: user.id });
    const body: MeResponse = { user: toUser(updated!) };
    return c.json(body);
  });

  app.post('/logout', async (c) => {
    await endSession(c, deps, c.get('db'));
    return c.body(null, 204);
  });

  app.get('/me', requireAuth(deps, { allowWhenMustChange: true }), async (c) => {
    const [user] = await c
      .get('db')
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, c.get('user').id))
      .limit(1);
    const body: MeResponse = { user: toUser(user!) };
    return c.json(body);
  });

  app.post('/password', requireAuth(deps, { allowWhenMustChange: true }), async (c) => {
    const input = parseInput(ChangePasswordRequestSchema, await readJson(c.req));
    const db = c.get('db');
    const me = c.get('user');
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, me.id)).limit(1);
    if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new AppError(400, ErrorCode.VALIDATION, 'Mật khẩu hiện tại không đúng.', {
        fields: { currentPassword: 'Mật khẩu hiện tại không đúng.' },
      });
    }
    const [updated] = await db
      .update(schema.users)
      .set({
        passwordHash: await hashPassword(input.newPassword),
        mustChangePassword: false,
        updatedAt: deps.now(),
      })
      .where(eq(schema.users.id, me.id))
      .returning();
    // Đăng xuất các thiết bị khác, giữ phiên hiện tại.
    await revokeAllSessions(db, me.id, deps.now(), me.sessionId);
    await audit(db, { userId: me.id, action: 'password.change', entity: 'user', entityId: me.id });
    const body: MeResponse = { user: toUser(updated!) };
    return c.json(body);
  });

  return app;
}
