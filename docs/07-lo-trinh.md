# 07. Lộ trình

Mỗi bước là **một pull request**. Bước sau chỉ bắt đầu khi bước trước đã được duyệt và gộp vào `main`. Trước mỗi bước, Claude sẽ hỏi lại để chốt chi tiết.

## Giai đoạn 1: Game chơi được

| Bước | Pull request | Nội dung | Kết quả xem được |
|---|---|---|---|
| 1 | Tài liệu thiết kế | Thư mục `docs/` này | Đọc và góp ý |
| 2 | Khung dự án | Monorepo pnpm + Turborepo; `apps/cms`, `apps/api`, `apps/play` rỗng; `packages/*`; ESLint, Prettier, TypeScript; GitHub Actions; Dockerfile, `docker-compose.yml`, `.env.example`; `/api/health` | 3 link Vercel mở được (sau khi bạn tạo dự án Vercel theo hướng dẫn) |
| 3 | Cơ sở dữ liệu | Lược đồ Drizzle và migration cho các bảng giai đoạn 1 (tài khoản, media, template, link chơi thử); tài khoản quản trị đầu tiên; hướng dẫn tạo Neon | Bảng dữ liệu trên Neon |
| 4 | Đăng nhập và nền CMS | Đăng nhập, đổi mật khẩu, quản lý tài khoản, bố cục CMS, tải ảnh và nhạc lên R2 | Đăng nhập CMS, tạo tài khoản đồng nghiệp, tải file lên |
| 5 | Chuẩn module + form tự sinh | `packages/module-sdk` (loại trường, kiểm tra cấu hình, `SandboxHost`, font), `packages/modules` (module mẫu `game.sample`), form tự sinh và khung xem trước trong CMS (`apps/cms/src/module-ui`), trang **Phòng thử module** | Mở Phòng thử module: sửa form, game mẫu đổi ngay trong khung điện thoại |
| 6a | Game Hứng quà | Module `game.catch` (kéo giỏ, hết giờ/hết mạng, độ khó theo thời gian hoặc theo màn, hướng dẫn, hiệu ứng, màn kết thúc có lời nhắn theo điểm, kỷ lục, nút kêu gọi, chia sẻ) + 4 mẫu; Phòng thử nhớ tạm cấu hình | Chơi Hứng quà trong Phòng thử module |
| 6b | Thư viện template | Lưu nháp, Công bố, lịch sử và khôi phục, nhân bản, lưu trữ/xóa, tải font riêng | Tạo và lưu game |
| 6c | Link chơi thử | `/try/<mã>`: nhiều link, luôn mới nhất/bản chụp, mật khẩu, hạn, QR, đếm lượt mở | **Tạo game và gửi link cho người khác chơi** |
| 7a | Game lưu trong cơ sở dữ liệu | Bảng `game_modules`, `game_module_versions`; biên dịch mã nguồn game (`@opes/module-bundler`); API kiểm tra cấu hình trong hộp cách ly QuickJS; nạp sẵn 3 game | (bên trong) |
| 7b | Chạy game từ cơ sở dữ liệu | Trang chơi và CMS tải game theo phiên bản từ cơ sở dữ liệu; CMS xem trước và kiểm tra form qua khung `/embed` của trang chơi; template giữ phiên bản game, nút "Nâng lên bản mới" | Template ghi rõ phiên bản game |
| 7c | Mục Game trong CMS | Tải lên/tải về .zip, sửa code từng file, chạy thử bản nháp, phát hành phiên bản, lịch sử | Thêm và sửa game từ CMS |
| 7d | Hướng dẫn viết game | Tài liệu và gói mẫu | |

## Giai đoạn 2 trở đi (định hướng)

Thứ tự dự kiến của giai đoạn 2, sẽ hỏi lại và chốt trước khi bắt đầu:

1. Hồ sơ nhãn hàng, 4 vai trò
2. Vòng quay và bảng xếp hạng (chạy được ở chế độ chơi thử), kho quà
3. Chiến dịch và xuất bản: luồng bước, luật, phân bổ quà, phiên bản, đồng bộ template
4. Trang người chơi `/c/<slug>` và phát quà (cả hai cách)
5. Xếp hạng thật: kỳ, chốt bảng, duyệt và phát quà
6. Trao quà: quà của tôi, trang đổi quà, giao hàng
7. Báo cáo và xuất Excel
8. Hoàn thiện: kiểm thử tải, rà soát bảo mật, hướng dẫn vận hành

Giai đoạn 3 và 4: xem bảng các giai đoạn trong [00-tong-quan.md](00-tong-quan.md).

## Kiểm thử

- **Giai đoạn 1**: kiểm thử đơn vị cho chuyển đổi cấu hình module, kiểm tra lược đồ cấu hình, logic game Hứng quà (va chạm, điểm, mạng, tăng độ khó); kiểm thử tích hợp API với PostgreSQL thật trong GitHub Actions; kiểm tra luồng tạo template và mở link chơi thử trên khung điện thoại.
- **[GĐ2]**: thêm kiểm thử luật, thuật toán phát quà, và kịch bản **nhiều người quay cùng lúc** để chứng minh không phát quá số lượng.

## Việc bạn cần chuẩn bị (sẽ có hướng dẫn từng bước khi tới bước đó)

- Bước 2: tài khoản Vercel, kết nối với GitHub.
- Bước 3: tài khoản Neon.
- Bước 4: tài khoản Cloudflare, bật R2.

## Câu hỏi còn mở

Giai đoạn 1:

| # | Câu hỏi | Mặc định nếu chưa trả lời |
|---|---|---|
| 1 | ~~Font cho giao diện game~~ | Đã chốt (quyết định 79): Google Fonts có tiếng Việt + font riêng |

[GĐ2] (sẽ hỏi lại khi tới giai đoạn 2):

| # | Câu hỏi | Mặc định nếu chưa trả lời |
|---|---|---|
| 2 | Hạn để người chơi nhập thông tin khi trúng (chế độ "nhập khi trúng") | 30 phút, cấu hình được |
| 3 | Hạn nhận quà tại quầy sau khi trúng | Đến hết ngày kết thúc chiến dịch + 7 ngày, cấu hình được |
| 4 | Số người chơi tối đa trên một thiết bị | 3, cấu hình được |
| 5 | Có cần màn "Chương trình đã kết thúc" hiển thị danh sách người trúng công khai không | Không |
