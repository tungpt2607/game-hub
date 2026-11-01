import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Địa chỉ API mà /api/* được chuyển tiếp tới (cùng tên miền với trang chơi, nên cookie phiên hoạt động).
const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

// Địa chỉ kho media (ví dụ https://pub-xxx.r2.dev). Có thì /media/* trên tên miền trang chơi được chuyển
// tiếp tới kho, để người chơi không phụ thuộc tên miền của kho (một số mạng chặn r2.dev).
// Đi cùng biến PLAY_MEDIA_PROXY=true ở API.
const mediaOrigin = process.env.MEDIA_PROXY_ORIGIN?.replace(/\/+$/, '');
/**
 * Thư mục trên kho được chuyển tiếp (khi bật MEDIA_PROXY, API trả địa chỉ dạng "/<thư mục>/..."):
 * media/ là thư viện Media, game-assets/ là file kèm của game (ảnh, âm thanh trong thư mục assets/ của gói).
 * Thêm thư mục mới trên kho thì thêm vào đây, ở cả CMS và trang chơi.
 */
const MEDIA_PREFIXES = ['media', 'game-assets'];

// Các tên miền CMS được nhúng khung chạy game /embed (xem trước trong CMS). Nhiều địa chỉ cách nhau dấu phẩy.
const cmsOrigins = (
  process.env.CMS_PUBLIC_URL || 'https://opes-gamehub-cms.vercel.app,http://localhost:3000'
)
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean)
  .map((u) => new URL(u).origin);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker dùng bản "standalone"; Vercel dùng bản mặc định.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  outputFileTracingRoot: repoRoot,
  transpilePackages: ['@opes/i18n', '@opes/contracts', '@opes/module-sdk'],
  // Lint chạy riêng ở bước kiểm tra chung của repo.
  eslint: { ignoreDuringBuilds: true },
  env: { OPES_CMS_ORIGINS: cmsOrigins.join(',') },
  async headers() {
    return [
      {
        source: '/embed',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors ${cmsOrigins.join(' ')}` },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      ...(mediaOrigin
        ? MEDIA_PREFIXES.map((prefix) => ({
            source: `/${prefix}/:path*`,
            destination: `${mediaOrigin}/${prefix}/:path*`,
          }))
        : []),
    ];
  },
};

export default nextConfig;
