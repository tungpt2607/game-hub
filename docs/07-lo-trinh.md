# 07. Lộ trình

Mỗi bước là **một pull request**. Bước sau chỉ bắt đầu khi bước trước đã được duyệt và gộp vào `main`. Trước mỗi bước, Claude sẽ hỏi lại để chốt chi tiết.

| Bước | Pull request | Nội dung | Kết quả xem được |
|---|---|---|---|
| 1 | Tài liệu thiết kế | Thư mục `docs/` này | Đọc và góp ý |
| 2 | Khung dự án | Monorepo pnpm + Turborepo, 3 ứng dụng rỗng, `packages/*`, ESLint, Prettier, TypeScript, GitHub Actions, Dockerfile, `docker-compose.yml`, `.env.example`, trang `/api/health` | 3 link Vercel chạy được (sau khi bạn tạo dự án Vercel theo hướng dẫn) |
| 3 | Cơ sở dữ liệu | Lược đồ Drizzle, migration, dữ liệu mẫu, hướng dẫn tạo Neon | Bảng dữ liệu trên Neon |
| 4 | Đăng nhập và nền CMS | Đăng nhập, người dùng, vai trò, bố cục CMS, tải media lên R2 | Đăng nhập CMS, quản lý người dùng |
| 5 | Chuẩn module + form tự sinh | `module-sdk`, `schema-form`, khung xem trước với host giả lập | Form cấu hình mẫu trong CMS |
| 6 | Module Hứng quà | `game.catch` đầy đủ tùy chỉnh, kiểm tra điểm | Chơi thử trong khung xem trước |
| 7 | Nhãn hàng, template, kho quà | Các màn CMS tương ứng | Tạo template, nhập quà |
| 8 | Chiến dịch và xuất bản | Trình tạo chiến dịch, luồng bước, luật, phiên bản, đồng bộ template | Xuất bản chiến dịch |
| 9 | Trang người chơi + phát quà | `apps/play`, phiên, hồ sơ, lượt chơi, module Vòng quay, giao dịch phát quà (cả 2 cách) | **Link chơi công khai đầu tiên** |
| 10 | Xếp hạng | Module bảng xếp hạng, kỳ, chốt bảng, màn duyệt | Bảng xếp hạng chạy thật |
| 11 | Trao quà | Quà của tôi, trang đổi quà (QR/mã), giao hàng | Đổi quà tại quầy bằng điện thoại |
| 12 | Báo cáo | Tổng quan, danh sách, xuất Excel | Báo cáo chiến dịch |
| 13 | Hoàn thiện | Kiểm thử tải nhẹ, rà soát bảo mật, hướng dẫn vận hành và chuyển sang máy chủ riêng | Sẵn sàng chạy thử với khách |

## Kiểm thử

- **Đơn vị**: luật, thuật toán phát quà, kiểm tra điểm, chuyển đổi cấu hình module.
- **Tích hợp**: API chạy với PostgreSQL thật (trong GitHub Actions), đặc biệt kịch bản **nhiều người quay cùng lúc** để chứng minh không phát quá số lượng.
- **Giao diện**: kiểm tra luồng chính của CMS và trang người chơi trên khung điện thoại.

## Việc bạn cần chuẩn bị (sẽ có hướng dẫn từng bước khi tới bước đó)

- Bước 2: tài khoản Vercel, kết nối với GitHub.
- Bước 3: tài khoản Neon.
- Bước 4: tài khoản Cloudflare, bật R2.

## Câu hỏi còn mở

| # | Câu hỏi | Mặc định nếu chưa trả lời |
|---|---|---|
| 1 | Hạn để người chơi nhập thông tin khi trúng (chế độ "nhập khi trúng") | 30 phút, cấu hình được |
| 2 | Hạn nhận quà tại quầy sau khi trúng | Đến hết ngày kết thúc chiến dịch + 7 ngày, cấu hình được |
| 3 | Số người chơi tối đa trên một thiết bị | 3, cấu hình được |
| 4 | Font cho giao diện game | Chọn từ danh sách Google Fonts có hỗ trợ tiếng Việt, hoặc tải font riêng của nhãn hàng |
| 5 | Có cần màn "Chương trình đã kết thúc" hiển thị danh sách người trúng công khai không | Không |
