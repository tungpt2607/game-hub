# Gói game mẫu: Chạm quà

Gói mẫu để bắt đầu viết game cho Game Hub OPES. Hướng dẫn đầy đủ: `docs/huong-dan/viet-game.md` trong repo game-hub.

Muốn làm game mới từ gói này:

1. Đổi `key` trong `schema.ts`, ví dụ `game.cua-toi`, và đổi `name`.
2. Sửa `config.ts` (form cấu hình), `Runtime.tsx` (phần chạy), `presets.ts` (mẫu có sẵn).
3. Đặt ảnh, âm thanh, font vào `assets/` và dùng trong code bằng `asset('ten-file')` từ `opes:assets`.
4. Nén thành .zip rồi vào CMS, mục Game, bấm **Tải lên game mới (.zip)**.
