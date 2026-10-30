# 02. Chuẩn module

> Từ Bước 7, game được lưu trong cơ sở dữ liệu và sửa ngay trong CMS (mục **Game**). Cách viết và tải lên một game: xem [Hướng dẫn viết game](huong-dan/viet-game.md).

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

## Hai chế độ chạy: thật và chơi thử

Cùng một phần chạy hoạt động ở hai chế độ, chỉ khác nhau ở `host` được truyền vào:

| | Chế độ thật (chiến dịch) | Chế độ chơi thử |
|---|---|---|
| Dùng ở | Trang người chơi `/c/<slug>` | Link chơi thử `/try/<token>` và khung xem trước của CMS |
| `host` | Gọi API, máy chủ quyết định | `SandboxHost`, chạy hoàn toàn trong trình duyệt |
| `startPlay` / `finishPlay` | Máy chủ cấp `playId`, kiểm tra và ghi điểm | Sinh `playId` cục bộ, chỉ hiện điểm, không lưu |
| `spin` | Giao dịch phát quà thật | Chọn ngẫu nhiên một ô đã cấu hình (theo `previewWeight` của ô, mặc định chia đều), không trừ quà |
| `getLeaderboard` | Bảng thật | Danh sách người chơi mẫu sinh từ `sampleLeaderboard` của module, có "bạn" chèn vào theo điểm vừa chơi |
| `requireProfile` | Mở form thông tin | Bỏ qua |
| `myRewards` | Phiếu quà thật | Phiếu quà mẫu ghi rõ "Bản chơi thử" |

Mỗi module **bắt buộc** chạy được ở chế độ chơi thử. Module có thể khai báo thêm `sampleData` (ví dụ danh sách tên mẫu cho bảng xếp hạng) để bản chơi thử trông như thật. Nhờ chuẩn này, mọi template mới viết sau đều tự động có link chơi thử và khung xem trước, không cần làm thêm.

`SandboxHost` nằm trong `packages/module-sdk` và **không gọi mạng**. Ảnh và nhạc vẫn tải từ CDN media như bình thường.

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

## Đã làm ở Bước 5 (giai đoạn 1)

Phần phác thảo ở trên là hướng tổng thể. Giai đoạn 1 làm phần cần cho game chơi thử, tên chi tiết như sau:

| Phần | Nơi đặt | Ghi chú |
|---|---|---|
| Loại trường | `packages/module-sdk/src/fields.ts` | `text` (có `multiline` thay cho `longText`), `number`, `boolean`, `select`, `color`, `image`, `audio`, `emojiOrImage`, `font`, `list`, `group`. `prizeSlot` và `themeRef` để giai đoạn 2. Khai báo bằng `field.text({...})`… |
| Giá trị media | | Cấu hình lưu `{ id, url, name }` của file trong thư viện Media; `collectMediaIds()` liệt kê để chặn xóa file đang dùng |
| Kiểm tra cấu hình | `validation.ts` | `validateConfig(fields, config)` trả lỗi theo đường dẫn (`items.0.points`), câu tiếng Việt; trường đang ẩn không bị kiểm tra. Viết tay thay cho Zod để dùng chung ở CMS và API mà không cần chuyển đổi |
| Chuẩn hóa | `validation.ts` | `normalizeConfig(fields, raw, defaults)`: điền trường mới thêm từ mặc định, bỏ khóa thừa (thay cho `migrate` khi chỉ tăng phiên bản phụ) |
| Định nghĩa module | `runtime.ts` | `defineModule({ key, kind, version, name, description, fields, defaults, screens, Runtime, scoring })`. `screens` là các màn hình để khung xem trước nhảy tới |
| Phần chạy | | `RuntimeProps = { config, host, initialScreen, muted, storageKey }` (`storageKey` để lưu dữ liệu riêng theo link, ví dụ kỷ lục). `HostApi` giai đoạn 1 có `mode`, `startPlay`, `finishPlay`, `track` |
| Chế độ chơi thử | `sandbox.ts` | `createSandboxHost()`: không gọi mạng, mọi lượt chơi được chấp nhận |
| Font | `fonts.ts`, `react.ts` | 18 font Google có tiếng Việt; `useFont()` tải font và trả `font-family`. Font riêng tải lên làm ở Bước 6 |
| Âm thanh | `react.ts` | `useSound(ref, { muted, loop })` tôn trọng nút tắt tiếng |
| Danh sách module | `packages/modules` | `game.catch` (Hứng quà, Bước 6a) và module mẫu `game.sample` ("Chạm quà", dùng đủ mọi loại trường). Module có thể khai báo `presets` (mẫu có sẵn) |
| Form tự sinh, khung xem trước | `apps/cms/src/module-ui` | Đặt trong CMS (không tách package) vì chỉ CMS dùng. Khung xem trước có 3 cỡ máy 360×640, 390×844, 430×932 |

Module mới chỉ cần khai báo `fields`, `defaults`, `screens` và viết `Runtime`; form, kiểm tra lỗi và khung xem trước có sẵn.

## Phiên bản module

- Module tăng **phiên bản phụ** (1.0 → 1.1) khi thêm trường mới có mặc định: cấu hình cũ vẫn chạy.
- Module tăng **phiên bản chính** (1.x → 2.0) khi đổi cấu trúc: phải có `migrate()` để nâng cấu hình cũ.
- Mỗi bước trong chiến dịch lưu `moduleVersion`. Khi xuất bản, API chạy `migrate()` nếu cần, nên chiến dịch cũ không bị hỏng khi module được nâng cấp.

## Các module

Giai đoạn 1 chỉ có `game.catch`. Hai module còn lại là **[GĐ2]**, mô tả ở đây để chuẩn module được thiết kế đủ cho cả ba loại ngay từ đầu.

Ở giai đoạn 1 chưa có hồ sơ nhãn hàng, nên loại trường `themeRef` chưa dùng; logo, màu và font nằm thẳng trong cấu hình của game. Khi có hồ sơ nhãn hàng ở giai đoạn 2, các trường này chuyển sang `themeRef` và cấu hình cũ được nâng lên bằng `migrate()`. Tương tự, `prizeSlot` và các hàm quay, xếp hạng, phiếu quà của `host` chỉ được dùng từ giai đoạn 2.

### `game.catch`: Hứng quà rơi

Đã làm ở Bước 6a (`packages/modules/src/catch`). Lõi game (`engine.ts`) tách khỏi giao diện để test được.

Các nhóm cấu hình:

- **Màn mở đầu**: tiêu đề, lời giới thiệu, chữ nút bắt đầu, logo.
- **Màn hướng dẫn**: bật/tắt; tự liệt kê vật phẩm và điểm; lời dẫn, ảnh minh họa, chữ nút chơi.
- **Giao diện**: màu nền, ảnh nền, màu chữ, màu nút, màu chữ trên nút, font.
- **Giỏ hứng**: emoji hoặc ảnh, kích thước nhỏ/vừa/lớn.
- **Luật chơi**: kết thúc khi hết giờ / hết mạng / cái nào đến trước; thời gian; số mạng; đếm ngược 3-2-1.
- **Độ khó**: tăng dần theo thời gian hoặc theo màn; thời gian rơi và số vật phẩm mỗi giây lúc đầu và lúc khó nhất; sau bao lâu thì khó nhất, hoặc số điểm để lên màn và màn khó nhất.
- **Vật phẩm rơi** (danh sách, 1–10): emoji hoặc ảnh, điểm (âm = vật cần tránh), tần suất, hứng phải thì mất mạng, để rơi thì mất mạng.
- **Âm thanh**: nhạc nền, tiếng hứng được, tiếng mất mạng/vật xấu, tiếng kết thúc.
- **Màn kết thúc**: tiêu đề, lời nhắn theo mức điểm, điểm cao nhất trên máy, nút chơi lại, nút kêu gọi có link, nút chia sẻ.

Hiệu ứng: số điểm bay lên, rung khi mất mạng, "Màn N" khi lên màn, pháo giấy ở màn kết thúc (tắt khi máy đặt giảm chuyển động).

Mẫu có sẵn: Tết, Trung thu, Giáng sinh, Trái cây / F&B.

Kiểm tra điểm: `maxScore` = số vật phẩm tối đa có thể xuất hiện trong khoảng thời gian (tính từ tần suất và độ khó) × điểm cao nhất.

### `game.catch-quiz`: Hứng quà + câu hỏi

Dựa trên game OME Catch của OPES (`packages/modules/src/catch-quiz`). Mọi kích thước tính theo khung 1080 × 1920 px, khi chơi thu phóng vừa màn hình.

- **Nhân vật hứng**: hình thường / khi đau / khi kết thúc (emoji hoặc ảnh, kể cả ảnh động), kích thước, vị trí, vùng hứng.
- **Nhóm vật phẩm** (danh sách): tên, nhiều hình, điểm, tỉ lệ %, màu viền sáng, nhịp phóng to; khi hứng: cộng điểm / dừng game hiện câu hỏi / mất mạng. Game chọn nhóm bằng "túi" 20 ô theo tỉ lệ nên tỉ lệ thực tế sát cấu hình.
- **Luật**: thời gian, số mạng, số làn, kích thước vật phẩm, đếm ngược và chữ sau đếm ngược; **giai đoạn độ khó** (tới giây thứ mấy, tốc độ, nhịp thả, số vật mỗi đợt).
- **Câu hỏi**: danh sách câu hỏi (2–6 đáp án, đúng một đáp án đúng), xáo đáp án, khung câu hỏi, thời gian nhân vật đau, thưởng khi đúng, phạt khi sai (mất mạng / trừ điểm / không), nút "Tiếp tục" có đếm 3-2-1.
- **Giao diện**: nền, font chữ, font số, màu nút, khung đồng hồ/điểm, biểu tượng đồng hồ, biểu tượng mạng, màu cảnh báo.
- **Màn bắt đầu, màn kết thúc** (nút kêu gọi có thể gắn `?score=`), **âm thanh**.

Mẫu "OME Catch" dùng ảnh trong `packages/modules/assets/catch-quiz/ome/`; khi build, `scripts/copy-module-assets.mjs` chép thư mục này vào `public/module-assets/` của CMS và trang chơi. Mã vào chơi của game gốc được thay bằng mật khẩu của link chơi thử.

### `leaderboard.podium`: Bảng xếp hạng [GĐ2]

- **Hiển thị**: bục top 3 (bật/tắt), số dòng danh sách, thứ hạng của tôi (bật/tắt), quà theo hạng (bật/tắt), đếm ngược kết thúc kỳ (bật/tắt).
- **Giao diện**: ảnh nền, ảnh bục, màu hạng 1/2/3, khung avatar, font; mặc định từ hồ sơ nhãn hàng.
- **Nguồn điểm**: chọn bước game nào trong luồng làm nguồn.
- Cách tính điểm, kỳ xếp hạng và quà theo hạng **không nằm trong module** mà nằm trong luật của chiến dịch (xem [04](04-nghiep-vu.md)), vì máy chủ cần chúng để chốt bảng.

### `reward.wheel`: Vòng quay cổ điển [GĐ2]

- **Ô quay** (danh sách): mỗi ô gắn với một phần quà đã phân bổ (`prizeSlot`) hoặc là ô "Chúc may mắn"; nhãn, màu nền ô, ảnh hiển thị, hiện ảnh quà hay không; `previewWeight` chỉ dùng khi chơi thử. Ở template (chưa gắn chiến dịch), ô chỉ có nhãn và ảnh; việc gắn với quà thật làm khi đưa template vào chiến dịch.
- **Khung**: kiểu vẽ sẵn (màu viền, chấm đèn, kim, tâm) **hoặc** ảnh khung, ảnh kim, ảnh tâm do nhãn hàng thiết kế.
- **Chuyển động**: thời gian quay, số vòng tối thiểu, kiểu giảm tốc.
- **Âm thanh và hiệu ứng**: tiếng quay, tiếng trúng, tiếng trượt, pháo giấy khi trúng.
- **Màn kết quả**: tiêu đề và lời nhắn khi trúng/trượt, nút "Xem quà của tôi".

Tỉ lệ trúng và tồn kho **không nằm trong module**; máy chủ quyết định theo luật phát quà của chiến dịch.
