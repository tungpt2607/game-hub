import { defineConfig } from 'vitest/config';

// Các file kiểm thử dùng chung một cơ sở dữ liệu kiểm thử, nên chạy lần lượt.
export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
