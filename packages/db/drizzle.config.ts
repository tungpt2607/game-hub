import { defineConfig } from 'drizzle-kit';

/** Cấu hình cho `drizzle-kit generate`: đọc lược đồ, sinh file SQL vào ./migrations. Không cần kết nối DB. */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
});
