# 05. API

Mọi endpoint nằm dưới `/api`. Dữ liệu vào/ra là JSON, mô tả bằng Zod trong `packages/contracts` để CMS và trang người chơi dùng chung kiểu. Lỗi trả về dạng:

```json
{ "error": { "code": "OUT_OF_TURNS", "message": "Bạn đã hết lượt quay hôm nay." } }
```

`code` cố định để giao diện xử lý; `message` là câu tiếng Việt hiển thị được cho người dùng.

## Công khai: trang người chơi (`/api/public`)

Xác thực bằng cookie phiên người chơi (tạo ở lời gọi đầu tiên).

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/campaigns/:slug` | Bản đã xuất bản, trạng thái, URL media; tạo phiên nếu chưa có |
| GET | `/campaigns/:slug/me` | Hồ sơ (nếu có), lượt quay còn lại, lượt chơi game còn lại |
| POST | `/campaigns/:slug/profile` | Gửi biệt danh, SĐT, trường thêm, đồng ý điều khoản |
| POST | `/campaigns/:slug/plays` | Bắt đầu lượt chơi bước game → `playId`, `seed` |
| POST | `/campaigns/:slug/plays/:playId/finish` | Nộp điểm và thống kê |
| POST | `/campaigns/:slug/spins` | Quay một lượt |
| GET | `/campaigns/:slug/leaderboards/:stepId` | Bảng xếp hạng kỳ hiện tại (hoặc `?period=`), kèm thứ hạng của tôi |
| GET | `/campaigns/:slug/rewards` | Quà của tôi |
| POST | `/campaigns/:slug/rewards/:id/shipping` | Điền địa chỉ giao hàng |
| POST | `/campaigns/:slug/events` | Ghi sự kiện cho báo cáo (gom nhiều sự kiện một lần) |

## CMS (`/api/admin`)

Xác thực bằng cookie phiên CMS. Cột "Vai trò" là vai trò tối thiểu.

| Nhóm | Phương thức và đường dẫn | Vai trò |
|---|---|---|
| Đăng nhập | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password` | mọi vai trò |
| Người dùng | `GET/POST /users`, `PATCH /users/:id` | admin |
| Media | `POST /media/upload-url` (xin link tải lên trực tiếp vào kho S3), `POST /media/:id/complete` | operator |
| Nhãn hàng | `GET/POST /brands`, `GET/PATCH /brands/:id` | operator |
| Module | `GET /modules` (danh mục module, lược đồ, mặc định) | operator |
| Template | `GET/POST /templates`, `GET/PATCH /templates/:id`, `POST /templates/:id/duplicate` | operator |
| Kho quà | `GET/POST /prizes`, `PATCH /prizes/:id`, `POST /prizes/:id/adjust` | admin |
| Chiến dịch | `GET/POST /campaigns`, `GET/PATCH /campaigns/:id` (sửa bản nháp), `POST /campaigns/:id/duplicate` | operator |
| Xuất bản | `POST /campaigns/:id/validate`, `POST /campaigns/:id/publish`, `GET /campaigns/:id/versions`, `POST /campaigns/:id/versions/:v/restore`, `POST /campaigns/:id/pause`, `POST /campaigns/:id/resume` | operator |
| Đồng bộ template | `GET /campaigns/:id/steps/:stepId/template-diff`, `POST /campaigns/:id/steps/:stepId/sync` | operator |
| Phân bổ quà | `GET/POST /campaigns/:id/prizes`, `PATCH /campaigns/:id/prizes/:cpId`, `POST /campaigns/:id/prizes/return-unused` | operator (giảm/trả: admin) |
| Xếp hạng | `GET /campaigns/:id/leaderboard-periods`, `POST …/:periodId/close`, `GET …/:periodId/results`, `POST …/:periodId/results/:rid/disqualify`, `POST …/:periodId/approve` | operator |
| Phiếu quà | `GET /campaigns/:id/rewards`, `PATCH /rewards/:id` (trạng thái giao hàng, hủy) | operator |
| Đổi quà | `GET /redeem/campaigns` (chiến dịch được giao), `GET /redeem/lookup?code=`, `POST /redeem/:rewardId/confirm` | redeemer |
| Người chơi | `GET /campaigns/:id/players`, `GET /players/:id`, `POST /players/:id/block` | operator |
| Báo cáo | `GET /campaigns/:id/reports/overview`, `…/prizes`, `…/players.xlsx`, `…/rewards.xlsx`, `…/plays.xlsx` | viewer |
| Nhật ký | `GET /audit-logs` | admin |

## Quy ước

- **Phân trang**: `?cursor=&limit=` cho danh sách dài.
- **Ghi idempotent**: `POST /spins` và `POST /plays/:id/finish` nhận tiêu đề `Idempotency-Key` do trang người chơi sinh. Mạng chập chờn gửi lại cùng khóa sẽ nhận lại đúng kết quả cũ, không trừ lượt hai lần.
- **Phiên bản API**: tiền tố `/api` là v1; khi có thay đổi phá vỡ sẽ thêm `/api/v2`.
- **Kiểm tra sức khỏe**: `GET /api/health` trả về trạng thái kết nối cơ sở dữ liệu và kho media.
