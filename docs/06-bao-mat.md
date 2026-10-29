# 06. Bảo mật và chống gian lận

## Phân quyền CMS

| Quyền | Quản trị viên | Vận hành chiến dịch | Nhân viên đổi quà | Người xem báo cáo |
|---|:-:|:-:|:-:|:-:|
| Quản lý người dùng, xem nhật ký | ✓ | | | |
| Kho quà tổng: thêm, sửa, điều chỉnh tồn | ✓ | | | |
| Nhãn hàng, template | ✓ | ✓ | | |
| Chiến dịch: tạo, sửa, xuất bản, tạm dừng | ✓ | ✓ | | |
| Phân bổ quà cho chiến dịch | ✓ | ✓ (chỉ tăng trong phạm vi còn trong kho) | | |
| Giảm phân bổ, trả quà dư | ✓ | | | |
| Duyệt xếp hạng, chặn người chơi | ✓ | ✓ | | |
| Cập nhật trạng thái giao hàng, hủy phiếu quà | ✓ | ✓ | | |
| Trang đổi quà | ✓ | ✓ | ✓ (chỉ chiến dịch được giao) | |
| Xem báo cáo, xuất Excel | ✓ | ✓ | | ✓ (SĐT bị che) |

Quyền được kiểm tra **ở API** cho mọi lời gọi; CMS chỉ ẩn nút để giao diện gọn.

## Đăng nhập CMS

- Email + mật khẩu, băm Argon2id. Quản trị viên tạo tài khoản và gửi mật khẩu tạm; người dùng phải đổi ở lần đăng nhập đầu.
- Phiên lưu trong cookie `HttpOnly`, `Secure`, `SameSite=Lax`, có bản ghi `admin_sessions` để thu hồi khi khóa tài khoản.
- Khóa tạm 15 phút sau 5 lần sai mật khẩu liên tiếp.
- Sẵn chỗ cho đăng nhập Google Workspace của OPES ở giai đoạn sau.

## Phiên người chơi (không đăng nhập)

- Cookie phiên ký bằng `SESSION_SECRET`, chỉ chứa `sessionId` và `campaignId`.
- `device_hash` tạo từ một mã ngẫu nhiên lưu trong trình duyệt kết hợp vài đặc điểm thiết bị; dùng để phát hiện một máy tạo nhiều số điện thoại, không dùng để định danh cá nhân.
- IP chỉ lưu dạng băm có muối, dùng cho giới hạn truy cập và cảnh báo.

## Chống gian lận

| Mối đe dọa | Biện pháp |
|---|---|
| Sửa điểm gửi lên | Máy chủ cấp `playId` và ghi giờ bắt đầu; khi nộp điểm, kiểm tra thời gian chơi trong khoảng hợp lệ và điểm ≤ `maxScore` của module. Sai thì đánh dấu `suspect`, không tính xếp hạng. |
| Nộp một lượt chơi nhiều lần | `playId` chỉ nộp được một lần; lượt bắt đầu mà không nộp sẽ hết hạn. |
| Tự quyết định trúng quà | Trình duyệt không bao giờ quyết định kết quả; chỉ diễn hoạt cảnh theo kết quả từ API. |
| Quay song song để vượt lượt | Khóa dòng người chơi/phiên trong giao dịch quay. |
| Phát quá số lượng | Kiểm tra và trừ tồn trong cùng một giao dịch; ràng buộc `issued_qty <= allocated_qty` ở mức cơ sở dữ liệu. |
| Một người dùng nhiều số điện thoại | Giới hạn số người chơi trên mỗi `device_hash` và mỗi IP (cấu hình được); cảnh báo trong màn duyệt xếp hạng. |
| Gửi yêu cầu dồn dập | Giới hạn theo IP và theo phiên cho từng nhóm endpoint (lưu trong bảng `rate_limits`). |
| Đoán mã nhận quà | Mã 8 ký tự ngẫu nhiên từ 31 ký tự (khoảng 850 tỉ tổ hợp); trang đổi quà yêu cầu đăng nhập và giới hạn số lần tra cứu. |
| Biệt danh xấu trên bảng xếp hạng | Lọc danh sách từ cấm (tiếng Việt có dấu và không dấu); quản trị viên đổi biệt danh hoặc ẩn người chơi. |

Giai đoạn sau có thể thêm: OTP số điện thoại, CAPTCHA vô hình khi phát hiện bất thường.

## Dữ liệu cá nhân

- Thu thập tối thiểu theo cấu hình chiến dịch; luôn có ô đồng ý với nội dung điều khoản do OPES nhập.
- Lưu `consent_at` cho từng người chơi.
- SĐT được che trên bảng xếp hạng (chỉ hiện biệt danh) và với vai trò Người xem báo cáo.
- Có chức năng xóa/ẩn danh dữ liệu người chơi của chiến dịch đã kết thúc (giữ số liệu tổng hợp).
- Nội dung điều khoản, thời gian lưu trữ dữ liệu và việc đăng ký chương trình khuyến mại cần bộ phận pháp lý của OPES xác nhận theo quy định hiện hành.

## Bí mật và cấu hình

- Không đưa khóa bí mật vào repo. Dùng biến môi trường của Vercel; có file `.env.example` mô tả từng biến.
- Kho media chỉ cho phép tải lên qua link ký trước do API cấp, giới hạn loại file và dung lượng (ảnh ≤ 5MB, âm thanh ≤ 10MB).
