import { runMigrations } from './migrate';

/** `pnpm db:migrate`: chạy migration vào cơ sở dữ liệu trong biến DATABASE_URL. */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Thiếu biến môi trường DATABASE_URL.');
  process.exit(1);
}

runMigrations(url)
  .then(() => {
    console.log('Đã chạy xong migration.');
  })
  .catch((error: unknown) => {
    // Chỉ in thông báo lỗi, không in chuỗi kết nối.
    console.error('Chạy migration thất bại:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
