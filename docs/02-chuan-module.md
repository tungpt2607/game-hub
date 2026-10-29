# 02. Chuẩn module

Mọi template (game, xếp hạng, phần thưởng) đều là một **module** viết theo cùng một chuẩn. Nền tảng không biết chi tiết bên trong module; nó chỉ biết module khai báo gì và phát ra sự kiện gì.

## Thành phần của một module

```ts
// packages/module-sdk (phác thảo, có thể đổi tên chi tiết khi code)
export interface ModuleDefinition<Config> {
  key: string;              // định danh duy nhất, ví dụ "game.catch"
  kind: 'game' | 'leaderboard' | 'reward';
  version: string;          // semver, ví dụ "1.0.0"
  name: string;             // khóa i18n cho tên hiển thị
  description: string;      // khóa i18n
  schema: ConfigSchema;     // lược đồ cấu hình, CMS tự sinh form từ đây
  defaults: Config;         // cấu hình mặc định
  migrate?: (old: unknown, fromVersion: string) => Config; // nâng cấu hình cũ lên phiên bản mới
  scoring?: ScoringRules<Config>;  // chỉ module game: luật kiểm tra điểm phía máy chủ
  Runtime: React.ComponentType<RuntimeProps<Config>>; // phần chạy cho người chơi
  Thumbnail?: React.ComponentType<{ config: Config }>; // ảnh xem nhanh trong CMS
}
```

Một module nằm trong `packages/modules/<ten-module>/` và gồm:

| File | Nội dung |
|---|---|
| `definition.ts` | `key`, `kind`, `version`, `schema`, `defaults`, `migrate` |
| `scoring.ts` | Luật kiểm tra điểm (module game) |
| `Runtime.tsx` | Phần chạy, chỉ dùng API của nền tảng |
| `i18n/vi.json` | Chuỗi giao diện của module |
| `presets/*.json` | Các bộ cấu hình mẫu, được nạp làm template ban đầu |

Phần `schema`, `defaults`, `migrate`, `scoring` **không phụ thuộc React** để API (chạy trên máy chủ) dùng được mà không phải tải phần giao diện.

## Lược đồ cấu hình

Lược đồ mô tả mỗi trường cấu hình bằng một **loại trường**. CMS có sẵn một bộ điều khiển cho mỗi loại, nên form chỉnh sửa được tự sinh.

| Loại trường | Bộ điều khiển trong CMS | Ví dụ dùng |
|---|---|---|
| `text`, `longText` | Ô nhập chữ | Tiêu đề, lời nhắn |
| `number` | Ô số, có min/max/bước | Thời gian chơi, tốc độ |
| `boolean` | Công tắc | Bật mạng sống |
| `select` | Danh sách chọn | Cách tính điểm |
| `color` | Chọn màu | Màu viền vòng quay |
| `image` | Tải ảnh lên kho media, có gợi ý kích thước | Ảnh nền, ảnh giỏ |
| `audio` | Tải âm thanh lên, nghe thử | Nhạc nền, tiếng trúng |
| `emojiOrImage` | Chọn emoji hoặc tải ảnh | Vật phẩm rơi |
| `list` | Danh sách lặp các trường con, thêm/xóa/sắp xếp | Vật phẩm cộng điểm |
| `group` | Nhóm trường có tiêu đề, gập/mở | "Độ khó", "Âm thanh" |
| `prizeSlot` | Chọn quà từ phần quà đã phân bổ cho chiến dịch | Ô vòng quay, quà theo hạng |
| `themeRef` | Lấy giá trị từ hồ sơ nhãn hàng, cho phép ghi đè | Màu chính, font |

Mỗi trường có thêm: nhãn, gợi ý, giá trị mặc định, điều kiện hiện (`visibleWhen`, ví dụ chỉ hiện "số mạng" khi bật mạng sống).

Lược đồ được chuyển thành Zod schema để **kiểm tra cấu hình ở cả CMS và API**. API từ chối lưu cấu hình sai.

## Phần chạy và API nền tảng

Phần chạy của module nhận vào:

```ts
interface RuntimeProps<Config> {
  config: Config;            // cấu hình của bước này trong chiến dịch
  theme: Theme;              // giao diện chung từ hồ sơ nhãn hàng (đã áp ghi đè)
  host: HostApi;             // các hàm nền tảng cung cấp
  t: (key: string, vars?: object) => string; // dịch chuỗi
}

interface HostApi {
  // Game
  startPlay(): Promise<{ playId: string; seed: number; startedAt: string }>;
  finishPlay(playId: string, result: { score: number; stats: object }): Promise<PlayResult>;
  // Phần thưởng
  getTurns(): Promise<{ spins: number }>;
  spin(): Promise<SpinResult>;          // máy chủ quyết định kết quả
  // Xếp hạng
  getLeaderboard(periodId?: string): Promise<LeaderboardView>;
  // Chung
  myRewards(): Promise<RewardView[]>;
  requireProfile(reason: 'before_play' | 'before_claim'): Promise<void>; // mở form thông tin nếu cần
  next(): void;                          // sang bước tiếp theo của luồng
  sound: SoundApi;                       // phát nhạc/âm thanh, tôn trọng nút tắt tiếng
  track(event: string, data?: object): void; // ghi sự kiện cho báo cáo
}
```

Quy tắc bắt buộc với phần chạy:

- **Không gọi mạng trực tiếp.** Mọi thứ qua `host`. Nhờ đó module chạy được trong khung xem trước của CMS bằng một `host` giả lập.
- **Không tự quyết định kết quả quay.** Vòng quay chỉ diễn hoạt cảnh dừng ở ô mà `spin()` trả về.
- **Hỗ trợ màn hình dọc điện thoại** (từ 360px), cảm ứng và bàn phím.
- **Tôn trọng `prefers-reduced-motion`** và nút tắt tiếng.

## Kiểm tra điểm phía máy chủ (module game)

```ts
interface ScoringRules<Config> {
  // Thời gian chơi hợp lệ tối thiểu/tối đa (giây) với cấu hình này
  durationBounds(config: Config): { min: number; max: number };
  // Điểm tối đa có thể đạt trong số giây đã chơi
  maxScore(config: Config, seconds: number): number;
  // Kiểm tra thêm từ thống kê module gửi lên (số vật phẩm hứng được...)
  validateStats?(config: Config, stats: object, score: number): boolean;
}
```

API so thời gian thực tế giữa `startPlay` và `finishPlay` với `durationBounds`, so điểm với `maxScore`, rồi đánh dấu lượt chơi **hợp lệ** hoặc **nghi ngờ**. Lượt nghi ngờ không được tính vào xếp hạng và không cộng lượt.

## Phiên bản module

- Module tăng **phiên bản phụ** (1.0 → 1.1) khi thêm trường mới có mặc định: cấu hình cũ vẫn chạy.
- Module tăng **phiên bản chính** (1.x → 2.0) khi đổi cấu trúc: phải có `migrate()` để nâng cấu hình cũ.
- Mỗi bước trong chiến dịch lưu `moduleVersion`. Khi xuất bản, API chạy `migrate()` nếu cần, nên chiến dịch cũ không bị hỏng khi module được nâng cấp.

## Ba module giai đoạn 1

### `game.catch`: Hứng quà rơi

Các nhóm cấu hình:

- **Nội dung**: tiêu đề, lời giới thiệu, ảnh/emoji giỏ hứng.
- **Vật phẩm cộng điểm** (danh sách): ảnh hoặc emoji, điểm, tần suất xuất hiện.
- **Vật cản** (danh sách): ảnh hoặc emoji, điểm trừ, có mất mạng không.
- **Luật**: thời gian chơi; bật/tắt mạng sống và số mạng; game kết thúc khi hết giờ hoặc hết mạng.
- **Độ khó**: tốc độ rơi ban đầu, mức tăng tốc theo thời gian, tần suất xuất hiện, tỉ lệ vật cản tăng dần.
- **Âm thanh**: nhạc nền, tiếng hứng trúng, tiếng trúng vật cản, tiếng kết thúc.
- **Màn hướng dẫn**: bật/tắt, các trang hướng dẫn (ảnh + chữ).
- **Giao diện**: ảnh nền, màu HUD; mặc định lấy từ hồ sơ nhãn hàng.

Kiểm tra điểm: `maxScore` = số vật phẩm tối đa có thể xuất hiện trong khoảng thời gian (tính từ tần suất và độ khó) × điểm cao nhất.

### `leaderboard.podium`: Bảng xếp hạng

- **Hiển thị**: bục top 3 (bật/tắt), số dòng danh sách, thứ hạng của tôi (bật/tắt), quà theo hạng (bật/tắt), đếm ngược kết thúc kỳ (bật/tắt).
- **Giao diện**: ảnh nền, ảnh bục, màu hạng 1/2/3, khung avatar, font; mặc định từ hồ sơ nhãn hàng.
- **Nguồn điểm**: chọn bước game nào trong luồng làm nguồn.
- Cách tính điểm, kỳ xếp hạng và quà theo hạng **không nằm trong module** mà nằm trong luật của chiến dịch (xem [04](04-nghiep-vu.md)), vì máy chủ cần chúng để chốt bảng.

### `reward.wheel`: Vòng quay cổ điển

- **Ô quay** (danh sách): mỗi ô gắn với một phần quà đã phân bổ (`prizeSlot`) hoặc là ô "Chúc may mắn"; nhãn, màu nền ô, hiện ảnh quà hay không.
- **Khung**: kiểu vẽ sẵn (màu viền, chấm đèn, kim, tâm) **hoặc** ảnh khung, ảnh kim, ảnh tâm do nhãn hàng thiết kế.
- **Chuyển động**: thời gian quay, số vòng tối thiểu, kiểu giảm tốc.
- **Âm thanh và hiệu ứng**: tiếng quay, tiếng trúng, tiếng trượt, pháo giấy khi trúng.
- **Màn kết quả**: tiêu đề và lời nhắn khi trúng/trượt, nút "Xem quà của tôi".

Tỉ lệ trúng và tồn kho **không nằm trong module**; máy chủ quyết định theo luật phát quà của chiến dịch.
