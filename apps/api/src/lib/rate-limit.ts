import { lt, sql } from 'drizzle-orm';
import { schema, type Database } from '@opes/db';

/** Giữ dữ liệu đếm trong 1 ngày; mọi khung giới hạn phải ngắn hơn khoảng này. */
const RETENTION_MS = 24 * 3600 * 1000;
/** Tỉ lệ lượt gọi kiêm dọn các khung đã hết hạn, để bảng không phình mãi mà không cần chạy định kỳ. */
const CLEANUP_PROBABILITY = 0.01;

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
  random: () => number = Math.random,
): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  if (windowMs > RETENTION_MS) throw new Error('Khung giới hạn tối đa 24 giờ.');
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.key, schema.rateLimits.windowStart],
      set: { count: sql`${schema.rateLimits.count} + 1` },
    })
    .returning({ count: schema.rateLimits.count });
  if (random() < CLEANUP_PROBABILITY) {
    await db.delete(schema.rateLimits).where(lt(schema.rateLimits.windowStart, new Date(now.getTime() - RETENTION_MS)));
  }
  return (row?.count ?? 0) <= limit;
}
