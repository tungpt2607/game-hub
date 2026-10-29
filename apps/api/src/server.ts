import { serve } from '@hono/node-server';
import { runMigrations } from '@opes/db';
import { createApp } from './app';

/**
 * Chạy API như một máy chủ Node.js thường: dùng khi phát triển và trong Docker.
 * Đặt RUN_MIGRATIONS=true (và MIGRATIONS_DIR trong Docker) để chạy migration trước khi mở cổng.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (process.env.RUN_MIGRATIONS === 'true' && url) {
    await runMigrations(url, process.env.MIGRATIONS_DIR || undefined);
    console.log('Đã chạy xong migration.');
  }

  const port = Number(process.env.PORT ?? 4000);
  serve({ fetch: createApp().fetch, port }, (info) => {
    console.log(`API đang chạy tại http://localhost:${info.port}/api/health`);
  });
}

main().catch((error: unknown) => {
  console.error('Không khởi động được API:', error instanceof Error ? error.message : error);
  process.exit(1);
});
