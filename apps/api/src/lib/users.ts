import { and, count, eq } from 'drizzle-orm';
import type { User } from '@opes/contracts';
import { schema, type Database } from '@opes/db';

type UserRow = typeof schema.users.$inferSelect;

/** Chuyển dòng dữ liệu thành thông tin tài khoản trả về CMS (bỏ mật khẩu và trường nội bộ). */
export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function countActiveAdmins(db: Database): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(schema.users)
    .where(and(eq(schema.users.role, 'admin'), eq(schema.users.status, 'active')));
  return row?.value ?? 0;
}
