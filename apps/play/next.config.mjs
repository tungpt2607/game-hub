import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Địa chỉ API mà /api/* được chuyển tiếp tới (cùng tên miền với trang chơi, nên cookie phiên hoạt động).
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker dùng bản "standalone"; Vercel dùng bản mặc định.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  outputFileTracingRoot: repoRoot,
  transpilePackages: ['@opes/i18n'],
  // Lint chạy riêng ở bước kiểm tra chung của repo.
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
