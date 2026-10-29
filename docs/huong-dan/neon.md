# Hướng dẫn: cơ sở dữ liệu Neon

Mục tiêu: một cơ sở dữ liệu PostgreSQL miễn phí ở Singapore, nối với API trên Vercel và với quy trình migration trên GitHub.

## 1. Tạo tài khoản và dự án Neon

1. Vào https://neon.com, bấm **Sign up**, chọn **Continue with GitHub** (hoặc email).
2. Tạo dự án (Project):
   - **Project name**: `opes-gamehub`
   - **Postgres version**: bản mới nhất mặc định
   - **Cloud provider**: **AWS**
   - **Region**: **Asia Pacific (Singapore)**, mã `ap-southeast-1`
   - Bấm **Create project**.

## 2. Lấy hai chuỗi kết nối

Trên trang dự án, bấm **Connect**. Có hai loại chuỗi kết nối, dùng cho hai nơi khác nhau:

| Chuỗi | Cách lấy | Dùng cho |
|---|---|---|
| **Pooled** | Bật công tắc **Connection pooling**; trong chuỗi có `-pooler` | Biến `DATABASE_URL` của dự án API trên Vercel |
| **Direct** | Tắt công tắc **Connection pooling**; trong chuỗi không có `-pooler` | Secret `DATABASE_URL` trên GitHub (chạy migration) |

Chuỗi có dạng `postgresql://<user>:<mật-khẩu>@<host>/<tên-db>?sslmode=require`. Đây là **thông tin bí mật**: không dán vào chat, tài liệu hay code.

## 3. Đặt chuỗi Direct vào GitHub Secrets

1. Mở https://github.com/tungpt2607/game-hub/settings/secrets/actions
2. Bấm **New repository secret**.
3. **Name**: `DATABASE_URL`. **Secret**: dán chuỗi **Direct**. Bấm **Add secret**.

GitHub luôn che giá trị secret trong nhật ký, kể cả khi repo công khai.

## 4. Chạy migration lần đầu

1. Mở https://github.com/tungpt2607/game-hub/actions/workflows/migrate.yml
2. Bấm **Run workflow** → **Run workflow**.
3. Chờ khoảng 1 phút, thấy dấu tích xanh là các bảng đã được tạo.

Từ sau, migration tự chạy mỗi khi có migration mới được gộp vào `main`.

## 5. Đặt chuỗi Pooled vào Vercel

1. Mở dự án `opes-gamehub-api` trên Vercel → **Settings** → **Environment Variables**.
2. **Key**: `DATABASE_URL`. **Value**: dán chuỗi **Pooled**. Để chọn cả 3 môi trường (Production, Preview, Development). Bấm **Save**.
3. Vào **Deployments** → bản mới nhất → **⋯** → **Redeploy**.

## 6. Kiểm tra

Mở CMS → trang **Tổng quan**. Ô **Cơ sở dữ liệu** hiện **Hoạt động** là thành công.
