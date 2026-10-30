# 00. Tổng quan và quyết định

## Mục tiêu

Game Hub OPES cho phép nhân viên OPES tạo chiến dịch minigame marketing cho nhãn hàng bằng cách **ghép các template có thể cấu hình** (game, bảng xếp hạng, vòng quay) với **kho quà tập trung**, rồi **xuất bản thành một link web** để khách hàng chơi mà không cần đăng nhập.

Nguyên tắc thiết kế xuyên suốt:

1. **Tổng quát, mở rộng được.** Thêm template mới là thêm một module, không sửa nền tảng. Thêm loại luật mới là thêm một bộ xử lý luật.
2. **Cấu hình thay vì code.** Gần như mọi lựa chọn đều cấu hình theo chiến dịch.
3. **Máy chủ quyết định.** Điểm, lượt, quà đều do API kiểm tra và quyết định; trình duyệt chỉ hiển thị.
4. **Chuyển nhà dễ.** Chỉ dùng chuẩn mở: Docker, PostgreSQL, giao thức S3.

## Các giai đoạn

| Giai đoạn | Mục tiêu | Nội dung |
|---|---|---|
| **1. Game chơi được** | Tạo game trong CMS, có link gửi người khác chơi ngay | Khung dự án, cơ sở dữ liệu, CMS (đăng nhập, tải ảnh và nhạc), chuẩn module, game Hứng quà, thư viện template, link chơi thử |
| **2. Chiến dịch và quà** | Chạy chiến dịch thật có quà | Vòng quay, xếp hạng thật, hồ sơ nhãn hàng, kho quà, chiến dịch, xuất bản, người chơi, phát quà, trao quà, báo cáo, 4 vai trò |
| **3. Vận hành** | Chạy nhiều chiến dịch, ít thao tác tay | Thêm loại quà (mã voucher, mã duy nhất, thẻ cào), luật nhận lượt (theo điểm game, mã dự thưởng, chia sẻ), OTP, tên miền riêng của nhãn hàng |
| **4. Mở rộng** | Nhiều template, nhiều khách hàng | Template mới (lật thẻ, trắc nghiệm, cào thẻ, mở hộp quà), nhãn hàng tự đăng nhập, tiếng Anh |

**Chỉ giai đoạn 1 được làm ngay.** Thiết kế cho giai đoạn 2 trở đi được giữ trong tài liệu làm **định hướng**, để những gì xây ở giai đoạn 1 (chuẩn module, dữ liệu, API) không phải đập đi làm lại. Các phần chỉ thuộc giai đoạn 2 trở đi được đánh dấu **[GĐ2]** trong các tài liệu tiếp theo.

## Phạm vi giai đoạn 1

| Hạng mục | Có trong giai đoạn 1 |
|---|---|
| CMS | Đăng nhập email; mọi tài khoản là Quản trị viên; quản lý tài khoản |
| Media | Tải ảnh và nhạc lên kho media |
| Template | Thư viện template; chỉ có game **Hứng quà** với đầy đủ tùy chỉnh (ảnh, vật phẩm, độ khó tăng dần, mạng sống, nhạc và âm thanh, màn hướng dẫn). Logo và màu nhập thẳng trong từng game. |
| Link chơi thử | Luôn mới nhất hoặc bản chụp; mật khẩu; hạn dùng; mã QR. Chạy hoàn toàn trong trình duyệt; chỉ đếm số lần mở link. |

**Không có trong giai đoạn 1:** vòng quay, xếp hạng, hồ sơ nhãn hàng, kho quà, chiến dịch, người chơi, phát quà, trao quà, báo cáo, phân quyền nhiều vai trò.

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
| 43 | Phạm vi giai đoạn 1 | Chỉ cần có game chơi được |
| 44 | Template giai đoạn 1 | Chỉ game Hứng quà |
| 45 | Đăng nhập CMS giai đoạn 1 | Email + mật khẩu; chỉ vai trò Quản trị viên; 4 vai trò làm ở giai đoạn 2 |
| 46 | Số liệu giai đoạn 1 | Không ghi gì ngoài số lần mở link chơi thử |
| 47 | Hồ sơ nhãn hàng | Chưa cần ở giai đoạn 1; logo và màu nhập trong từng game |
| 75 | Màn chỉnh template | Form cấu hình bên trái, khung xem trước điện thoại bên phải (trên điện thoại: hai thẻ) |
| 76 | Lưu và công bố template | Bấm **Lưu nháp** để lưu (không tự lưu); chỉ khi bấm **Công bố** thì link chơi thử "luôn mới nhất" mới đổi |
| 77 | Link "bản chụp" | Khi tạo link, chọn chụp từ bản đã công bố hoặc bản nháp hiện tại |
| 78 | Lịch sử công bố | Giữ lịch sử các lần công bố; xem lại và khôi phục được |
| 79 | Font | Danh sách Google Fonts có tiếng Việt, và tải font riêng (WOFF2/TTF) |
| 80 | Khung xem trước | Chọn kích thước máy, chơi thử ngay trong khung, nhảy tới từng màn hình, bật/tắt tiếng |
| 81 | Cấu hình có lỗi | Vẫn lưu nháp được; **Công bố** bị chặn cho tới khi sửa hết lỗi |
| 95 | Phòng thử module | Giữ lại sau Bước 6; nhớ tạm cấu hình trong trình duyệt (chỉ trên máy đó) |
| 97 | Điều khiển Hứng quà | Kéo ngón tay; máy tính dùng chuột hoặc phím mũi tên |
| 98 | Kết thúc ván | Cấu hình: hết giờ, hết mạng, hoặc cái nào đến trước |
| 99 | Mất mạng | Cấu hình theo từng vật phẩm: "hứng phải thì mất mạng", "để rơi thì mất mạng" |
| 100 | Độ khó tăng dần | Chọn theo game: tăng dần theo thời gian, hoặc theo màn (đủ điểm thì lên màn) |
| 101 | Màn hướng dẫn | Tự liệt kê vật phẩm và điểm từ cấu hình, cộng lời dẫn và ảnh minh họa tùy chọn; bật/tắt được |
| 102 | Hiệu ứng | Số điểm bay lên; rung màn hình (và rung máy) khi mất mạng; pháo giấy ở màn kết thúc; đếm ngược 3-2-1 |
| 103 | Màn kết thúc | Lời nhắn theo mức điểm, điểm cao nhất trên máy người chơi, nút kêu gọi có link, nút chia sẻ |
| 104 | Tạo template | Từ mẫu có sẵn, nhân bản template, từ cấu hình mặc định, từ Phòng thử module |
| 105 | Thông tin template | Tên, tên nhãn hàng (chữ), ghi chú nội bộ; ảnh nhỏ tự vẽ từ cấu hình. Chưa có nhãn (tag) |
| 106 | Bỏ template | Lưu trữ (ẩn, link ngừng chạy, khôi phục được); trong mục Đã lưu trữ mới xóa hẳn được |
| 107 | Số link chơi thử | Nhiều link mỗi template, mỗi link có tên, bật/tắt và đếm lượt mở riêng |
| 108 | Dạng link | Mặc định mã ngẫu nhiên; có thể đổi thành tên tự đặt khi tạo |
| 109 | Hạn link | Mặc định không hết hạn; sửa được |
| 110 | Mẫu Hứng quà có sẵn | Tết, Trung thu, Giáng sinh, Trái cây / F&B (dùng emoji, không dùng ảnh có bản quyền) |
| 111 | Chia Bước 6 | 6a game Hứng quà + mẫu; 6b Thư viện template; 6c Link chơi thử và trang /try |
| 112 | Khôi phục lịch sử (Claude chọn) | Chép lần công bố cũ vào bản nháp; muốn link đổi thì bấm Công bố |
| 113 | Hai người cùng sửa (Claude chọn) | Người lưu sau được báo "vừa được lưu ở nơi khác" và tải lại, không ghi đè lẫn nhau |
| 114 | Bấm Công bố khi chưa lưu (Claude chọn) | Tự lưu nháp rồi công bố |

Các quyết định 1–31 mô tả hệ thống đầy đủ; phần thuộc giai đoạn 2 trở đi là định hướng, sẽ hỏi lại trước khi làm.

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
