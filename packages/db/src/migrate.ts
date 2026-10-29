import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb } from './client';

/** Thư mục migration khi chạy từ mã nguồn của package. */
export const DEFAULT_MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

/**
 * Áp dụng các migration chưa chạy. An toàn khi chạy lại: migration đã chạy được ghi nhớ
 * trong bảng drizzle.__drizzle_migrations và sẽ bị bỏ qua.
 */
export async function runMigrations(url: string, migrationsFolder = DEFAULT_MIGRATIONS_DIR) {
  const { db, close } = createDb(url);
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await close();
  }
}
