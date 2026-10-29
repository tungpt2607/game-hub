import { createDb, type Database } from '@opes/db';

let cached: Database | null | undefined;

/**
 * Kết nối dùng chung trong một tiến trình. Trả về null khi chưa đặt DATABASE_URL.
 * Trên Vercel (biến VERCEL có sẵn) dùng chế độ serverless: 1 kết nối, không prepared statements.
 */
export function getDb(): Database | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  cached = url ? createDb(url, { serverless: Boolean(process.env.VERCEL) }).db : null;
  return cached;
}
