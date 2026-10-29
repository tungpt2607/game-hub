import { sql } from 'drizzle-orm';
import { schema, type Database } from '@opes/db';

/**
 * Đếm số lần gọi theo khóa trong khung thời gian cố định; trả về true nếu còn trong giới hạn.
 * Lưu trong PostgreSQL nên hoạt động đúng cả khi chạy nhiều hàm serverless song song.
 */
export async function hitRateLimit(
  db: Database,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date,
): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.key, schema.rateLimits.windowStart],
      set: { count: sql`${schema.rateLimits.count} + 1` },
    })
    .returning({ count: schema.rateLimits.count });
  return (row?.count ?? 0) <= limit;
}
