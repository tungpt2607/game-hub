import { defineConfig } from 'tsup';

/**
 * Đóng gói API thành file .mjs tự chứa mọi thư viện (kể cả các package @opes/*),
 * để cùng một bản build chạy được trên Vercel (dist/vercel.mjs) và trong Docker (dist/server.mjs).
 */
export default defineConfig({
  entry: ['src/server.ts', 'src/vercel.ts'],
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/.*/],
  outExtension: () => ({ js: '.mjs' }),
});
