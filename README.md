# Game Hub OPES

Nền tảng tạo và vận hành minigame marketing cho nhãn hàng.

- **CMS** (`apps/cms`): nhân viên OPES quản lý template, media, link chơi thử.
- **Trang chơi** (`apps/play`): link chơi thử `/try/<mã>`; sau này là link chiến dịch `/c/<slug>`.
- **API** (`apps/api`): nơi duy nhất đọc/ghi dữ liệu.

Tài liệu thiết kế: [`docs/`](docs/). Hướng dẫn triển khai Vercel: [`docs/huong-dan/vercel.md`](docs/huong-dan/vercel.md).

## Cấu trúc

```
apps/api        API (Hono) – chạy trên Vercel hoặc Docker
apps/cms        CMS (Next.js + Material UI)
apps/play       Trang chơi (Next.js, nhẹ)
packages/contracts   Mô tả dữ liệu vào/ra của API (Zod)
packages/module-sdk  Chuẩn module template
packages/i18n        Chuỗi giao diện tiếng Việt
docker/              Dockerfile
```

## Chạy trên máy

Cần Node.js 24 và pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env
pnpm dev
```

- CMS: http://localhost:3000
- Trang chơi: http://localhost:3001/try/demo
- API: http://localhost:4000/api/health

## Lệnh thường dùng

| Lệnh | Việc |
|---|---|
| `pnpm lint` | Kiểm tra quy tắc code |
| `pnpm typecheck` | Kiểm tra kiểu TypeScript |
| `pnpm test` | Chạy kiểm thử |
| `pnpm build` | Build cả 3 ứng dụng |
| `pnpm format` | Định dạng code |

## Chạy bằng Docker

```bash
docker compose up -d --build
```

Chạy CMS, trang chơi, API cùng PostgreSQL và MinIO trên một máy. Dùng khi chuyển sang máy chủ riêng.
