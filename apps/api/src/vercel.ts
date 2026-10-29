import { handle } from '@hono/node-server/vercel';
import { createApp } from './app';

/** Điểm vào khi chạy dạng hàm serverless trên Vercel (runtime Node.js). */
export default handle(createApp());
