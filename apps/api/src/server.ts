import { serve } from '@hono/node-server';
import { createApp } from './app';

/** Chạy API như một máy chủ Node.js thường: dùng khi phát triển và trong Docker. */
const port = Number(process.env.PORT ?? 4000);

serve({ fetch: createApp().fetch, port }, (info) => {
  console.log(`API đang chạy tại http://localhost:${info.port}/api/health`);
});
