import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Địa chỉ API mà /api/* được chuyển tiếp tới (cùng tên miền với trang chơi, nên cookie phiên hoạt động).
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

// Địa chỉ kho media (ví dụ https://pub-xxx.r2.dev). Có thì /media/* trên tên miền trang chơi được chuyển
// tiếp tới kho, để người chơi không phụ thuộc tên miền của kho (một số mạng chặn r2.dev).
// Đi cùng biến PLAY_MEDIA_PROXY=true ở API.
const mediaOrigin = process.env.MEDIA_PROXY_ORIGIN?.replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker dùng bản "standalone"; Vercel dùng bản mặc định.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  outputFileTracingRoot: repoRoot,
  transpilePackages: ['@opes/i18n', '@opes/contracts', '@opes/module-sdk', '@opes/modules'],
  // Lint chạy riêng ở bước kiểm tra chung của repo.
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      ...(mediaOrigin ? [{ source: '/media/:path*', destination: `${mediaOrigin}/media/:path*` }] : []),
    ];
  },
};

export default nextConfig;
