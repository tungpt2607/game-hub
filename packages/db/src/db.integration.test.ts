import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createDb, pingDb, type Database } from './client';
import { runMigrations } from './migrate';
import * as schema from './schema';

/**
 * Kiểm thử với PostgreSQL thật. Chạy khi có TEST_DATABASE_URL (GitHub Actions luôn có);
 * trên máy không có biến này thì bỏ qua.
 */
const url = process.env.TEST_DATABASE_URL;

// Trên GitHub Actions bắt buộc có TEST_DATABASE_URL, để kiểm thử dưới đây không bị bỏ qua âm thầm.
it.runIf(process.env.CI)('CI có cấu hình TEST_DATABASE_URL', () => {
  expect(url).toBeTruthy();
});

describe.skipIf(!url)('cơ sở dữ liệu (PostgreSQL thật)', () => {
  let db: Database;
  let close: () => Promise<void>;

  beforeAll(async () => {
    await runMigrations(url!);
    // Chạy lại lần hai phải an toàn, không lỗi.
    await runMigrations(url!);
    ({ db, close } = createDb(url!));
    await db.execute(
      sql`truncate table ${schema.rateLimits}, ${schema.previewLinks}, ${schema.templates}, ${schema.media}, ${schema.auditLogs}, ${schema.adminSessions}, ${schema.users} cascade`,
    );
  });

  afterAll(async () => {
    await close?.();
  });

  it('kết nối được', async () => {
    expect(await pingDb(db)).toBe(true);
  });

  it('tạo tài khoản với giá trị mặc định đúng, và email là duy nhất', async () => {
    const [user] = await db
      .insert(schema.users)
      .values({ email: 'admin@opes.vn', name: 'Quản trị', passwordHash: 'x' })
      .returning();
    expect(user?.role).toBe('admin');
    expect(user?.status).toBe('active');
    expect(user?.mustChangePassword).toBe(false);

    await expect(
      db.insert(schema.users).values({ email: 'admin@opes.vn', name: 'Trùng', passwordHash: 'y' }),
    ).rejects.toThrow();
  });

  it('lưu template và link chơi thử; xoá template thì xoá link theo', async () => {
    const [template] = await db
      .insert(schema.templates)
      .values({
        name: 'Hứng Sen Mùa Hạ',
        moduleKey: 'game.catch',
        moduleVersion: '1.0.0',
        config: { duration: 30, items: ['🪷'] },
      })
      .returning();
    expect(template?.revision).toBe(1);
    expect(template?.config).toEqual({ duration: 30, items: ['🪷'] });

    await db.insert(schema.previewLinks).values({
      token: 'abcdefghijklmnopqrstuv',
      templateId: template!.id,
      mode: 'snapshot',
      snapshot: {
        moduleKey: 'game.catch',
        moduleVersion: '1.0.0',
        templateRevision: 1,
        config: { duration: 30 },
      },
    });

    await expect(
      db.insert(schema.previewLinks).values({
        token: 'abcdefghijklmnopqrstuv',
        templateId: template!.id,
        mode: 'live',
      }),
    ).rejects.toThrow();

    await db.delete(schema.templates).where(eq(schema.templates.id, template!.id));
    const left = await db.select().from(schema.previewLinks);
    expect(left).toHaveLength(0);
  });

  it('giới hạn truy cập cộng dồn theo khóa và khung thời gian', async () => {
    const windowStart = new Date('2026-10-29T12:00:00Z');
    for (let i = 0; i < 3; i++) {
      await db
        .insert(schema.rateLimits)
        .values({ key: 'ip:test', windowStart, count: 1 })
        .onConflictDoUpdate({
          target: [schema.rateLimits.key, schema.rateLimits.windowStart],
          set: { count: sql`${schema.rateLimits.count} + 1` },
        });
    }
    const [row] = await db.select().from(schema.rateLimits);
    expect(row?.count).toBe(3);
  });
});
