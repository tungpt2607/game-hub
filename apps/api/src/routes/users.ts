import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  ErrorCode,
  type TemporaryPasswordResponse,
  UserCreateRequestSchema,
  type UserListResponse,
  UserUpdateRequestSchema,
} from '@opes/contracts';
import { schema } from '@opes/db';
import { requireAuth, requireRole, revokeAllSessions } from '../auth/session';
import type { AppDeps, AppEnv } from '../context';
import { audit } from '../lib/audit';
import { hashPassword, temporaryPassword } from '../lib/crypto';
import { AppError, parseInput, readJson } from '../lib/errors';
import { countActiveAdmins, toUser } from '../lib/users';

/** Lỗi trùng giá trị duy nhất của PostgreSQL (mã 23505); Drizzle có thể bọc lỗi gốc trong `cause`. */
const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  if ((error as { code?: unknown }).code === '23505') return true;
  return isUniqueViolation((error as { cause?: unknown }).cause);
};

export function userRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  app.use('*', requireAuth(deps), requireRole('admin'));

  const findUser = async (db: AppEnv['Variables']['db'], id: string) => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
    const [row] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return row;
  };

  app.get('/', async (c) => {
    const db = c.get('db');
    const rows = await db.select().from(schema.users).orderBy(asc(schema.users.createdAt));
    const body: UserListResponse = {
      users: rows.map(toUser),
      activeAdminCount: await countActiveAdmins(db),
    };
    return c.json(body);
  });

  /** Tạo tài khoản với mật khẩu tạm; mật khẩu tạm chỉ trả về một lần trong kết quả này. */
  app.post('/', async (c) => {
    const input = parseInput(UserCreateRequestSchema, await readJson(c.req));
    const db = c.get('db');
    const password = temporaryPassword();
    try {
      const [user] = await db
        .insert(schema.users)
        .values({
          email: input.email,
          name: input.name,
          passwordHash: await hashPassword(password),
          role: 'admin',
          mustChangePassword: true,
        })
        .returning();
      await audit(db, {
        userId: c.get('user').id,
        action: 'user.create',
        entity: 'user',
        entityId: user!.id,
        data: { email: user!.email },
      });
      const body: TemporaryPasswordResponse = { user: toUser(user!), temporaryPassword: password };
      return c.json(body, 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, ErrorCode.EMAIL_TAKEN, 'Email này đã có tài khoản.', {
          fields: { email: 'Email này đã có tài khoản.' },
        });
      }
      throw error;
    }
  });

  app.patch('/:id', async (c) => {
    const input = parseInput(UserUpdateRequestSchema, await readJson(c.req));
    const db = c.get('db');
    const target = await findUser(db, c.req.param('id'));
    if (!target) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy tài khoản.');

    const disabling = input.status === 'disabled' && target.status === 'active';
    if (disabling && target.role === 'admin' && (await countActiveAdmins(db)) <= 1) {
      throw new AppError(
        409,
        ErrorCode.LAST_ADMIN,
        'Không thể vô hiệu hóa quản trị viên cuối cùng. Hãy tạo thêm một quản trị viên trước.',
      );
    }

    const [updated] = await db
      .update(schema.users)
      .set({ ...input, updatedAt: deps.now() })
      .where(eq(schema.users.id, target.id))
      .returning();
    if (disabling) await revokeAllSessions(db, target.id, deps.now());
    await audit(db, {
      userId: c.get('user').id,
      action: 'user.update',
      entity: 'user',
      entityId: target.id,
      data: { ...input },
    });
    return c.json({ user: toUser(updated!) });
  });

  /** Đặt lại mật khẩu cho người quên: tạo mật khẩu tạm, buộc đổi khi đăng nhập, đăng xuất mọi thiết bị. */
  app.post('/:id/reset-password', async (c) => {
    const db = c.get('db');
    const target = await findUser(db, c.req.param('id'));
    if (!target) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy tài khoản.');
    const password = temporaryPassword();
    const [updated] = await db
      .update(schema.users)
      .set({
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: deps.now(),
      })
      .where(eq(schema.users.id, target.id))
      .returning();
    await revokeAllSessions(db, target.id, deps.now());
    await audit(db, {
      userId: c.get('user').id,
      action: 'user.reset_password',
      entity: 'user',
      entityId: target.id,
    });
    const body: TemporaryPasswordResponse = { user: toUser(updated!), temporaryPassword: password };
    return c.json(body);
  });

  return app;
}
