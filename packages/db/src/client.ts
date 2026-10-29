import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>['db'];

/**
 * Tạo kết nối PostgreSQL. Dùng được với Neon (qua cổng pooled) và với PostgreSQL thường.
 * `serverless`: mỗi hàm Vercel giữ tối đa 1 kết nối và tắt prepared statements
 * (bắt buộc khi đi qua PgBouncer của Neon).
 */
export function createDb(url: string, options: { serverless?: boolean } = {}) {
  const client = postgres(url, {
    max: options.serverless ? 1 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: !options.serverless,
    onnotice: () => {},
  });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end({ timeout: 5 }) };
}

/** Kiểm tra kết nối bằng một truy vấn nhỏ, có giới hạn thời gian. */
export async function pingDb(db: Database, timeoutMs = 3000): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    const ok = db.execute(sql`select 1`).then(() => true as const);
    return await Promise.race([ok, timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
