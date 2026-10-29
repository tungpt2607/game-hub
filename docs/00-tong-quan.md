# 00. Tổng quan và quyết định

## Mục tiêu

Game Hub OPES cho phép nhân viên OPES tạo chiến dịch minigame marketing cho nhãn hàng bằng cách **ghép các template có thể cấu hình** (game, bảng xếp hạng, vòng quay) với **kho quà tập trung**, rồi **xuất bản thành một link web** để khách hàng chơi mà không cần đăng nhập.

Nguyên tắc thiết kế xuyên suốt:

1. **Tổng quát, mở rộng được.** Thêm template mới là thêm một module, không sửa nền tảng. Thêm loại luật mới là thêm một bộ xử lý luật.
2. **Cấu hình thay vì code.** Gần như mọi lựa chọn đều cấu hình theo chiến dịch.
3. **Máy chủ quyết định.** Điểm, lượt, quà đều do API kiểm tra và quyết định; trình duyệt chỉ hiển thị.
4. **Chuyển nhà dễ.** Chỉ dùng chuẩn mở: Docker, PostgreSQL, giao thức S3.

## Phạm vi giai đoạn 1

| Hạng mục | Có trong giai đoạn 1 |
|---|---|
| Template game | Hứng quà rơi |
| Template xếp hạng | Bảng xếp hạng có bục top 3 |
| Template phần thưởng | Vòng quay cổ điển |
| Loại quà | Quà hiện vật (nhận tại quầy hoặc giao tận nơi) |
| Luật nhận lượt quay | Lượt miễn phí (theo chiến dịch hoặc theo ngày) |
| CMS | Hồ sơ nhãn hàng, thư viện template, kho quà, chiến dịch, xuất bản, trao quà, báo cáo, người dùng |
| Trang người chơi | Đăng ký thông tin, chạy luồng chiến dịch, xem quà của tôi |
| Trang trao quà | Cho nhân viên đổi quà: nhập mã hoặc quét QR |
| Link chơi thử | Mỗi template có link chơi ngay, chạy độc lập trong trình duyệt, không đăng ký, không quà, không lưu điểm |

Để sau (khung đã chừa sẵn chỗ): template lật thẻ, trắc nghiệm, cào thẻ, mở hộp quà; quà mã voucher, thẻ cào; luật nhận lượt theo điểm game, mã dự thưởng, chia sẻ; OTP; tên miền riêng của nhãn hàng; tiếng Anh.

## Các quyết định đã chốt

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Người dùng CMS | Chỉ nhân viên OPES. Nhãn hàng không đăng nhập. |
| 2 | Quy mô | Vài trăm đến vài nghìn người chơi mỗi chiến dịch |
| 3 | Luồng chiến dịch | Ghép tự do các bước Game, Xếp hạng, Vòng quay theo từng chiến dịch |
| 4 | Nhận lượt quay | Khung luật cấu hình theo chiến dịch; giai đoạn 1 có luật **lượt miễn phí** |
| 5 | Giới hạn lượt game | Cấu hình theo chiến dịch: không giới hạn, X lần/ngày, hoặc X lần cả chiến dịch |
| 6 | Cách tính điểm xếp hạng | Cấu hình: điểm cao nhất một lần chơi, hoặc tổng điểm |
| 7 | Kỳ xếp hạng | Cấu hình: theo ngày, theo tuần, cả chiến dịch, hoặc tự đặt các khoảng |
| 8 | Phát quà xếp hạng | Hệ thống chốt bảng, quản trị viên duyệt rồi mới phát |
| 9 | Tên trên bảng xếp hạng | Biệt danh người chơi tự đặt |
| 10 | Loại quà giai đoạn 1 | Quà hiện vật |
| 11 | Cách nhận quà | Cấu hình theo từng món: tại quầy hoặc giao tận nơi |
| 12 | Kho quà | Kho tổng; phân bổ số lượng cho từng chiến dịch, phần dư trả về kho |
| 13 | Thông tin người chơi | Luôn có biệt danh + số điện thoại; các trường thêm cấu hình theo chiến dịch |
| 14 | Thời điểm nhập thông tin | Cấu hình: trước khi chơi, hoặc khi trúng quà |
| 15 | OTP | Chưa dùng ở giai đoạn 1 |
| 16 | Hạ tầng | Chưa có; cần hướng dẫn |
| 17 | Tên miền | Chưa quyết; tạm dùng tên miền miễn phí |
| 18 | Ngôn ngữ | Tiếng Việt, có sẵn khung đa ngôn ngữ |
| 19 | Game giai đoạn 1 | Hứng quà rơi |
| 20 | Tùy chỉnh thêm cho Hứng quà | Nhạc nền và âm thanh, độ khó tăng dần, mạng sống, màn hướng dẫn |
| 21 | Bảng xếp hạng | Bục top 3, thứ hạng của tôi, quà theo hạng, đếm ngược kết thúc kỳ, giao diện tùy chỉnh |
| 22 | Phần thưởng ngẫu nhiên | Vòng quay cổ điển |
| 23 | Tùy chỉnh thêm cho vòng quay | Ảnh quà trong ô, ảnh khung riêng, nhạc và hiệu ứng trúng, tốc độ/thời gian quay |
| 24 | Tỉ lệ trúng | Cấu hình: trọng số + tồn kho, hoặc rải đều theo thời gian |
| 25 | Số quà tối đa mỗi người | Cấu hình theo chiến dịch |
| 26 | Sửa chiến dịch đang chạy | Sửa bản nháp, bấm Xuất bản mới áp dụng; có lịch sử phiên bản |
| 27 | Xác nhận trao quà tại quầy | Cả trang đổi quà cho nhân viên lẫn danh sách trong CMS |
| 28 | Vai trò | Quản trị viên, Vận hành chiến dịch, Nhân viên đổi quà, Người xem báo cáo |
| 29 | Báo cáo | Số liệu tổng quan, quà đã phát/còn lại, danh sách người chơi/người trúng, xuất Excel |
| 30 | Template và chiến dịch | Mặc định sao chép vào chiến dịch; có nút "Đồng bộ từ template" |
| 31 | Thương hiệu | Hồ sơ nhãn hàng dùng lại cho nhiều chiến dịch |
| 32 | Lưu code | GitHub `tungpt2607/game-hub` |
| 33–36 | Hạ tầng | CMS, API, trang người chơi riêng biệt; cơ sở dữ liệu riêng; kho media riêng; đóng gói Docker; chạy tạm miễn phí |
| 37 | Nơi chạy tạm | Cả API, CMS, trang người chơi trên Vercel; tự động triển khai từ GitHub |
| 39 | Chơi ngay khi tạo | Mỗi template có **link chơi thử**, tách biệt hẳn với chiến dịch: chơi game bình thường, không kết nối luật, quà, người chơi |
| 40 | Ai mở được link chơi thử | Ai có link đều chơi được; mỗi link có thể bật thêm mật khẩu |
| 41 | Link khi template thay đổi | Chọn khi tạo link: "luôn mới nhất" hoặc "bản chụp" |
| 42 | Phạm vi link chơi thử | Mọi loại template; vòng quay và bảng xếp hạng dùng dữ liệu giả lập |

## Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Module | Một loại template viết bằng code, ví dụ `game.catch`. Có lược đồ cấu hình và phần chạy. |
| Template | Một module kèm bộ cấu hình đã chỉnh sẵn, lưu trong thư viện để dùng lại. |
| Bước (step) | Một module được đặt vào luồng của chiến dịch, kèm cấu hình riêng của chiến dịch. |
| Hồ sơ nhãn hàng | Logo, màu, font, ảnh nền của một nhãn hàng. |
| Phân bổ quà | Số lượng của một món quà trong kho tổng được giao cho một chiến dịch. |
| Phiếu quà (reward) | Một món quà đã phát cho một người chơi, có mã nhận quà riêng. |
| Link chơi thử | Link công khai để chơi một template ngay, không qua chiến dịch, không dữ liệu thật. |
| Chế độ chơi thử | Cách phần chạy của module hoạt động hoàn toàn trong trình duyệt với dữ liệu giả lập. Dùng cho link chơi thử và khung xem trước của CMS. |
