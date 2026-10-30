# Hướng dẫn: triển khai lên Vercel

Mục tiêu: 3 dự án Vercel cùng trỏ vào repo `tungpt2607/game-hub`, tự triển khai mỗi khi có code mới trên `main`, và tạo link xem trước cho mỗi pull request.

| Dự án Vercel | Thư mục gốc (Root Directory) | Tên miền |
|---|---|---|
| `opes-gamehub-api` | `apps/api` | `opes-gamehub-api.vercel.app` |
| `opes-gamehub-cms` | `apps/cms` | `opes-gamehub-cms.vercel.app` |
| `opes-gamehub-play` | `apps/play` | `opes-gamehub-play.vercel.app` |

Tạo **API trước**, vì CMS và trang chơi cần địa chỉ của API.

## 1. Tạo tài khoản và nối GitHub

1. Vào https://vercel.com/signup, chọn **Continue with GitHub**, đăng nhập bằng tài khoản GitHub `tungpt2607`.
2. Khi Vercel hỏi quyền truy cập repo, chọn **Only select repositories** → `game-hub` → **Install**.

## 2. Tạo dự án API

1. Trên trang tổng quan Vercel, bấm **Add New… → Project**.
2. Ở dòng `game-hub`, bấm **Import**.
3. **Project Name**: `opes-gamehub-api`.
4. **Root Directory**: bấm **Edit**, chọn `apps/api`, bấm **Continue**.
5. **Framework Preset**: để **Other**. Không cần sửa Build/Output/Install: các lệnh đã nằm trong `apps/api/vercel.json`.
6. Bấm **Deploy**, chờ khoảng 1–2 phút.
7. Kiểm tra: mở `https://opes-gamehub-api.vercel.app/api/health`. Thấy dòng chữ có `"status":"ok"` là thành công.

> Nếu tên `opes-gamehub-api` đã có người dùng, Vercel sẽ thêm hậu tố ngẫu nhiên. Ghi lại tên miền thực tế để dùng ở bước sau.

## 3. Tạo dự án CMS

1. **Add New… → Project** → **Import** `game-hub` lần nữa.
2. **Project Name**: `opes-gamehub-cms`.
3. **Root Directory**: `apps/cms`. Framework Preset tự nhận **Next.js**.
4. Mở **Environment Variables**, thêm:
   - Key: `API_INTERNAL_URL`
   - Value: `https://opes-gamehub-api.vercel.app` (tên miền API ở bước 2, **không** có `/` ở cuối)
5. Bấm **Deploy**.
6. Kiểm tra: mở `https://opes-gamehub-cms.vercel.app`, bấm **Đăng nhập** (bản khung chưa kiểm tra tài khoản). Ở trang Tổng quan, ô **Kết nối API** hiện **Hoạt động** là thành công.

## 4. Tạo dự án trang chơi

Làm giống bước 3, với:

- **Project Name**: `opes-gamehub-play`
- **Root Directory**: `apps/play`
- Biến môi trường `API_INTERNAL_URL` như trên.

Kiểm tra: mở `https://opes-gamehub-play.vercel.app/try/demo`, thấy màn "Đang chuẩn bị game…" là thành công.

## 5. Phiên bản Node.js

Dự án dùng **Node.js 24**, ghi trong `package.json` (`"engines": { "node": "24.x" }`). Vercel tự đọc giá trị này, nên không cần chỉnh **Settings → Build and Deployment → Node.js Version**.

## Chỉ build khi cần

Gói Hobby giới hạn số lần build mỗi ngày. Mỗi ứng dụng có `ignoreCommand` trong `vercel.json` gọi `scripts/vercel-ignore.sh`: Vercel chỉ build khi thư mục của ứng dụng đó, `packages/`, hoặc file cấu hình chung ở thư mục gốc thay đổi. Sửa tài liệu không làm build lại; commit file khóa do GitHub Actions tự tạo trên pull request cũng được bỏ qua.

Bị chặn vì vượt giới hạn ("Deployment rate limited — retry in 24 hours"): chờ hết thời gian rồi **Redeploy** bản mới nhất của dự án bị chặn.

## Sau khi xong

- Mỗi lần code mới được gộp vào `main`, cả 3 dự án tự triển khai lại.
- Mỗi pull request có link xem trước riêng, hiện trong phần bình luận của pull request.
- Đổi biến môi trường xong phải **Redeploy** (Deployments → bản mới nhất → … → Redeploy) thì mới có hiệu lực.

> **Lưu ý điều khoản:** gói Hobby (miễn phí) chỉ dành cho mục đích phi thương mại. Khi chạy cho nhãn hàng thật, cần nâng lên gói Pro hoặc chuyển sang máy chủ riêng bằng `docker-compose.yml`.

## Giới hạn 100 lượt triển khai mỗi ngày

Gói miễn phí của Vercel chỉ cho tối đa 100 lượt triển khai mỗi ngày. Vượt quá thì Vercel báo
"Deployment rate limited — retry in 24 hours" và không cập nhật cho tới hôm sau.

Để tiết kiệm lượt, cả 3 dự án chỉ triển khai khi code được gộp vào nhánh `main`
(`git.deploymentEnabled` trong `vercel.json`). Các nhánh pull request không tạo bản xem trước;
GitHub Actions vẫn kiểm tra đầy đủ (lint, kiểu, test, build, Docker) trước khi gộp. Ngoài ra
`scripts/vercel-ignore.sh` bỏ qua dự án không có thay đổi.

Nếu một lần gộp bị chặn vì giới hạn, hôm sau vào **Deployments** → **⋯** → **Create Deployment**,
nhập `main` rồi **Deploy to Production** cho từng dự án.
