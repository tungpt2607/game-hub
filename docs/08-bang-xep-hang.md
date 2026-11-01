# 08. Bảng xếp hạng

Trạng thái: **Bản nháp chờ duyệt**. Thay cho phần xếp hạng gắn với chiến dịch trong [04](04-nghiep-vu.md) mục 7: bảng xếp hạng là
**một phần riêng**, không cần chiến dịch, kho quà hay vòng quay.

## 1. Mục tiêu

- Bảng xếp hạng **đứng độc lập** (dữ liệu mẫu, để duyệt giao diện), hoặc **lấy điểm từ một template**, hoặc **từ một game**.
- Giao diện bảng **viết bằng code như game**: module `leaderboard.*`, sửa và phát hành trong mục Game, có mẫu, form cấu hình tự sinh,
  khung xem trước, link.
- **Mở rộng được mà không sửa phần đã có**: thêm nguồn điểm, cách tính, kiểu kỳ, trường thông tin người chơi, giao diện bảng mới
  đều là "thêm một mục vào danh sách", không đụng phần khác (mục 9).

Không làm trong phần này: chiến dịch, quà và phát quà, vòng quay, OTP. Các phần đó sau này **dùng lại** bảng xếp hạng (mục 9).

## 2. Ba tầng, giống game

| Tầng | Game (đang có) | Bảng xếp hạng |
|---|---|---|
| Module (code, phiên bản) | `game.lat-hinh` | `leaderboard.podium`: bục top 3 + danh sách. Viết thêm kiểu khác: `leaderboard.<tên>` |
| Template (cấu hình) | Template game | **Template bảng xếp hạng** = cấu hình giao diện (form của module) + **thiết lập dữ liệu** (mục 3) |
| Link | `/try/<mã>`: chơi | `/try/<mã>`: xem bảng (cùng trang, nạp module theo loại) |

Dùng lại nguyên những gì đã có: bảng `game_modules` (đã có `kind: 'leaderboard'`), `templates`, `template_versions`,
`preview_links`, form tự sinh, khung xem trước, Lưu nháp / Công bố / lịch sử, link có mật khẩu, hạn, QR.

**Vì sao tách "giao diện" và "thiết lập dữ liệu"**: giao diện là cấu hình của module (chạy ở trình duyệt, đổi tùy ý). Thiết lập dữ
liệu là luật máy chủ cần để tính hạng và nhận điểm (nguồn, cách tính, kỳ, thông tin người chơi); module không được quyết định
những thứ này, giống như game không tự quyết định kết quả vòng quay.

## 3. Thiết lập dữ liệu của bảng

Một tab riêng **Dữ liệu** trong màn chỉnh template bảng xếp hạng. Lưu và công bố cùng template (đổi nguồn, cách tính chỉ có hiệu lực
khi bấm Công bố; có trong lịch sử công bố).

```ts
interface LeaderboardSettings {
  source: ScoreSource;          // lấy điểm từ đâu
  aggregate: AggregateKind;     // gộp nhiều lượt của một người thành một điểm
  period: PeriodSpec;           // kỳ xếp hạng
  window?: { startsAt?: string; endsAt?: string }; // chỉ nhận điểm trong khoảng này
  profile: ProfileField[];      // thông tin hỏi người chơi khi lưu điểm
  maxEntries: number;           // số dòng tối đa trả về (top N), mặc định 100
  validation?: { maxScore?: number; minDurationMs?: number }; // ghi đè khi game chưa tự khai báo (mục 6)
}
```

Mỗi trường là **kiểu hợp có `type`**: thêm loại mới là thêm một nhánh và một bộ xử lý ở API (mục 9).

### 3.1. Nguồn điểm (`source`)

| `type` | Tham số | Ý nghĩa |
|---|---|---|
| `sample` | `count`, `seed` | **Dữ liệu mẫu**, không nhận điểm thật. Danh sách người chơi giả sinh cố định từ `seed`, để duyệt giao diện. Mặc định khi mới tạo |
| `template` | `templateId`, `linkIds?` | Điểm từ các link chơi của một template game (mọi link, hoặc chỉ các link chọn). Cùng cấu hình nên điểm công bằng. **Nên dùng nhất** |
| `module` | `moduleKey`, `templateIds?` | Điểm từ mọi template của một game. CMS **cảnh báo** khi các template có cấu hình tính điểm khác nhau (ví dụ thời gian chơi khác nhau) |

Một template game có thể là nguồn của nhiều bảng (ví dụ bảng "Hôm nay" và bảng "Cả tháng").

### 3.2. Cách tính (`aggregate`)

| Giá trị | Ý nghĩa |
|---|---|
| `best` | Điểm tốt nhất một lượt. Mặc định |
| `sum` | Tổng điểm các lượt |

"Tốt nhất" theo `scoring.higherIsBetter` của game (điểm cao hơn, hoặc ít giây hơn với game tính thời gian). Bằng điểm thì ai đạt điểm
đó **sớm hơn** xếp trên. Sau này thêm được `count` (số lượt chơi), `avg`… (mục 9).

### 3.3. Kỳ (`period`)

| `type` | Ý nghĩa |
|---|---|
| `all` | Một bảng cho toàn bộ thời gian. Mặc định |
| `daily` / `weekly` / `monthly` | Bảng mới mỗi ngày / tuần (thứ Hai đến Chủ nhật) / tháng, giờ Việt Nam |
| `custom` | Danh sách khoảng tự đặt `{ label, startsAt, endsAt }` |

Người xem chuyển được giữa kỳ hiện tại và các kỳ trước. Kỳ chỉ là **cách lọc lượt chơi theo thời gian**, không cần tạo dòng dữ liệu
riêng cho từng kỳ; chốt kết quả kỳ (để trao giải) là phần mở rộng sau (mục 9).

### 3.4. Thông tin người chơi (`profile`)

Danh sách trường cấu hình được, **biệt danh luôn có**:

```ts
interface ProfileField {
  key: string;                       // "phone", "email", "province"…
  type: 'text' | 'phone' | 'email' | 'select';
  label: string;
  required: boolean;
  options?: string[];                // với select
  public: boolean;                   // hiện trên bảng? (số điện thoại luôn che: 09xx xxx 123)
}
```

Kèm nội dung **đồng ý điều khoản** (bật/tắt, chữ tùy chỉnh) khi có hỏi thông tin cá nhân. Một template game là nguồn của nhiều bảng
thì người chơi được hỏi **hợp** các trường của các bảng đó.

## 4. Người chơi thấy gì

### Trên link chơi game có ghi điểm

Link của template game là nguồn của ít nhất một bảng **đã công bố** (và còn trong `window`) thì link đó **ghi điểm**. Link khác chạy
như hiện nay, không gửi gì lên máy chủ.

1. Mở link, chơi bình thường. Dải trên cùng đổi từ "Bản chơi thử" thành "Điểm được ghi lên bảng xếp hạng".
2. Hết ván: trang chơi hiện **tấm "Lưu điểm"** trượt lên trên màn kết thúc của game: lần đầu hỏi biệt danh và các trường đã cấu
   hình; các lần sau trên cùng máy tự lưu, chỉ hiện kết quả.
3. Kết quả: "Bạn đang hạng 7 · Còn 120 điểm nữa để vào top 5", nút **Xem bảng xếp hạng** (mở link bảng đã chọn trong thiết lập).

Tấm "Lưu điểm" do **trang chơi** hiện, không phải game: mọi game hiện có (đã gọi `host.startPlay` / `host.finishPlay`) có xếp hạng
mà **không sửa code**. Game muốn tự hiện hạng trong màn kết thúc thì dùng `host.getStanding()` (mục 5) và tắt tấm này.

### Trên link bảng xếp hạng

Module bảng (ví dụ `leaderboard.podium`) hiện: bục top 3, danh sách, dòng "Bạn" ghim cuối màn hình (nếu máy này đã chơi), đếm
ngược hết kỳ, chuyển kỳ, chữ giải thưởng theo hạng (cấu hình giao diện, chỉ là chữ). Tự cập nhật mỗi 30 giây khi trang đang mở.
Nguồn `sample` thì hiện dữ liệu mẫu, có dải "Dữ liệu mẫu".

## 5. Chuẩn module bảng xếp hạng

Module `leaderboard.*` viết giống game (cùng gói, cùng `schema.ts` / `Runtime.tsx`, cùng trình sửa code), khác ở `kind` và các hàm
`host` dùng:

```ts
interface HostApi {
  readonly mode: 'preview' | 'live';
  // Game (đang có)
  startPlay(): Promise<{ playId: string }>;
  finishPlay(playId: string, result: PlayResult): Promise<{ accepted: boolean }>;
  /** Hạng của lượt vừa chơi trên các bảng nhận điểm từ link này. Chế độ chơi thử: hạng giả lập. */
  getStanding?(playId: string): Promise<Standing[]>;
  // Bảng xếp hạng (mới)
  getLeaderboard?(query?: LeaderboardQuery): Promise<LeaderboardView>;
  track(event: string, data?: Record<string, unknown>): void;
}

interface LeaderboardQuery { periodKey?: string; limit?: number }

interface LeaderboardView {
  title: string;                         // tên bảng
  unit: string;                          // "điểm", "giây"… lấy từ scoring của game nguồn
  higherIsBetter: boolean;
  sample: boolean;                       // true = dữ liệu mẫu
  period: { key: string; label: string; startsAt: string | null; endsAt: string | null };
  periods: { key: string; label: string }[];   // để chuyển kỳ
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;           // người đang xem (nếu máy này đã chơi), kể cả ngoài top
  updatedAt: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
  /** Các trường thông tin đã đánh dấu public (số điện thoại đã che). */
  fields: Record<string, string>;
}

interface Standing { boardId: string; title: string; rank: number; total: number; gapToNext: number | null; linkUrl: string | null }
```

- Hàm mới là **tùy chọn** (`?`): game cũ không biết tới vẫn chạy; module kiểm tra có hàm trước khi gọi.
- `LeaderboardView` là dạng dữ liệu **chung cho mọi kiểu bảng**: viết module giao diện mới không cần API mới.
- Chế độ chơi thử (`SandboxHost`, khung xem trước): `getLeaderboard` sinh dữ liệu mẫu từ `sampleData` của module (danh sách tên,
  khoảng điểm) hoặc bộ tên mặc định; có "Bạn" chèn vào theo điểm vừa chơi trong cùng phiên. Giống mọi module, module bảng
  **bắt buộc** chạy được ở chế độ chơi thử.

## 6. Ghi điểm và chống gian lận

1. `startPlay`: trang chơi gọi `POST /api/public/plays` (kèm mã link). Máy chủ kiểm tra link đang ghi điểm, tạo lượt chơi
   `started` với giờ bắt đầu, trả `playId`.
2. `finishPlay`: gửi điểm, thời gian chơi, `data` của game. Máy chủ kiểm tra rồi đánh dấu **hợp lệ** hoặc **nghi ngờ**:
   - thời gian thật (giờ máy chủ) giữa hai lần gọi phải ≥ thời gian tối thiểu và khớp `durationMs` game gửi;
   - điểm ≤ điểm tối đa. Điểm tối đa lấy theo thứ tự: hàm `scoring.maxScore(config, giây)` game khai báo (chạy trong hộp cách ly
     QuickJS như phần kiểm tra cấu hình hiện có), nếu không có thì `validation.maxScore` trong thiết lập bảng, nếu không có thì không
     giới hạn (CMS cảnh báo "Bảng chưa có điểm tối đa");
   - mỗi `playId` nộp một lần; lượt bắt đầu quá lâu không nộp thì bỏ.
3. Lưu điểm (tấm "Lưu điểm"): gắn lượt chơi với người chơi. Người chơi nhận diện bằng **mã máy** (cookie đã ký trên tên miền trang
   chơi); có trường `phone` thì số điện thoại trùng được coi là cùng một người.
4. Lượt **nghi ngờ** không lên bảng nhưng vẫn xem được trong CMS.
5. Giới hạn tần suất (`rate_limits` sẵn có) theo mã máy và IP; CMS cảnh báo một máy dùng nhiều số điện thoại.

Mở rộng `ModuleSchema.scoring` (tùy chọn, game cũ không cần sửa):

```ts
scoring?: {
  unit: string;
  higherIsBetter: boolean;
  /** Điểm tối đa có thể đạt trong số giây đã chơi; không có thì dùng thiết lập của bảng. */
  maxScore?(config: Config, seconds: number): number;
  /** Thời gian chơi tối thiểu (giây) để điểm hợp lệ. */
  minSeconds?(config: Config): number;
};
```

## 7. Dữ liệu

Hai bảng mới, đặt tên chung (không gắn "bảng xếp hạng") để chiến dịch, báo cáo sau này dùng lại:

**`players`**: người chơi.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid | |
| device_id | text | Mã máy ngẫu nhiên (cookie đã ký) |
| nickname | text | |
| profile | jsonb | Các trường thông tin khác (`{ phone, province… }`) |
| phone | text, null | Tách riêng để tìm và gộp người trùng; có chỉ mục |
| hidden_at | timestamp, null | Ẩn khỏi mọi bảng (gian lận, tên xấu) |
| created_at, updated_at | | |

**`plays`**: lượt chơi.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid | `playId` |
| player_id | uuid, null | Gắn khi lưu điểm |
| device_id | text | |
| template_id, link_id | uuid | Nguồn; sau này thêm `campaign_id`, `step_id` (null) cho chiến dịch |
| module_key, module_version | text | Game và phiên bản lúc chơi |
| score | double, null | |
| duration_ms | integer, null | |
| data | jsonb, null | Dữ liệu game gửi kèm |
| status | enum | `started`, `valid`, `suspect`, `hidden` |
| reason | text, null | Vì sao nghi ngờ / ẩn |
| started_at, finished_at | timestamp | |

Chỉ mục: `(template_id, status, finished_at)` và `(module_key, status, finished_at)` cho truy vấn bảng; `(player_id)`.

Thiết lập dữ liệu của bảng (mục 3) lưu cùng cấu hình template: thêm cột `settings jsonb` (null với template game) vào `templates`,
`template_versions` và bản chụp của `preview_links`, nên công bố, lịch sử, khôi phục, link bản chụp dùng lại nguyên cách đang làm.
Để tìm nhanh "link này có đang ghi điểm không", thêm bảng phụ **`score_bindings`** (`board_template_id`, `source_type`, `source_id`)
ghi lại khi công bố bảng.

**Tính bảng**: truy vấn trực tiếp `plays` hợp lệ theo nguồn và kỳ, gộp theo người chơi (`max` hoặc `sum`), xếp hạng bằng
`rank() over (...)`. Quy mô vài nghìn người chơi mỗi bảng thì đủ nhanh; API lưu đệm kết quả 15 giây bằng `LruCache`. Khi nào chậm
(đo trước) thì thêm bảng điểm gộp sẵn, không đổi giao diện API.

## 8. CMS

- **Mục Game**: lọc theo loại (Game / Bảng xếp hạng); tạo module bảng xếp hạng từ gói mẫu `leaderboard-mau` như tạo game.
- **Thư viện template**: tạo template bảng xếp hạng từ module + mẫu; màn chỉnh có thêm tab **Dữ liệu** (mục 3); khung xem trước hiện
  dữ liệu mẫu hoặc dữ liệu thật (nút chuyển).
- **Template game**: hiện "Đang là nguồn của 2 bảng xếp hạng", bấm để mở.
- **Điểm**: tab trong template bảng xếp hạng: danh sách lượt chơi (lọc hợp lệ / nghi ngờ / kỳ), người chơi; **ẩn** lượt hoặc người
  chơi (hạng phía sau tự đôn lên); **xuất Excel** danh sách xếp hạng kèm thông tin người chơi (số điện thoại đầy đủ, chỉ trong CMS).

## 9. Điểm mở rộng

Thiết kế xoay quanh vài **danh sách đăng ký** ở API; thêm loại mới = thêm một mục, không sửa phần khác:

| Mở rộng | Thêm gì |
|---|---|
| Nguồn điểm mới (bước game trong chiến dịch, nhập từ Excel, API ngoài) | Nhánh mới của `ScoreSource` + bộ xử lý `{ validate, filterPlays, isRecording }` |
| Cách tính mới (`count`, `avg`, lượt gần nhất) | Nhánh mới của `AggregateKind` + biểu thức SQL gộp |
| Kiểu kỳ mới | Nhánh mới của `PeriodSpec` + hàm `periodOf(spec, now)` |
| Trường thông tin mới (ngày sinh, mã nhân viên) | Thêm `type` vào `ProfileField` + ô nhập ở tấm "Lưu điểm" |
| Giao diện bảng mới (đua theo đội, bảng theo tỉnh, màn hình LED sự kiện) | Module `leaderboard.<tên>` mới, dùng chung `LeaderboardView` |
| Bảng theo nhóm (tỉnh, cửa hàng) | `groupBy: <key trường thông tin>` trong thiết lập; `LeaderboardEntry` đã có `fields` |
| Chốt kỳ và trao giải | Bảng `leaderboard_results` chụp kết quả khi hết kỳ + duyệt (như [04](04-nghiep-vu.md) mục 7); không đổi phần trên |
| Chiến dịch | Bước "Xếp hạng" trong chiến dịch là một template bảng xếp hạng với nguồn `campaign_step` |

## 10. Chia bước (mỗi bước một pull request)

| Bước | Nội dung | Kết quả xem được |
|---|---|---|
| X1 | Tài liệu này | Đọc và góp ý |
| X2 | Module bảng xếp hạng chạy ở chế độ chơi thử: `getLeaderboard` / `getStanding` trong `SandboxHost`, nạp module theo loại ở `/try` và khung xem trước, module `leaderboard.podium` + mẫu, gói mẫu `leaderboard-mau` | Tạo template bảng xếp hạng, xem dữ liệu mẫu, gửi link |
| X3 | Tab **Dữ liệu**: thiết lập nguồn, cách tính, kỳ, thông tin người chơi; lưu và công bố cùng template; `score_bindings` | Gắn bảng với template / game |
| X4 | Ghi điểm: `players`, `plays`, `POST /api/public/plays`, kiểm tra điểm, tấm "Lưu điểm" | Chơi trên link → điểm được lưu |
| X5 | Bảng thật: API bảng, kỳ, hạng của tôi, `getStanding`, lưu đệm | Link bảng hiện người chơi thật |
| X6 | Quản lý: tab Điểm, ẩn, xuất Excel; kiểm thử tải | Vận hành được |

## 11. Câu hỏi còn mở

| # | Câu hỏi | Mặc định nếu chưa trả lời |
|---|---|---|
| 1 | Người chơi đổi biệt danh được không | Được, trên tấm "Lưu điểm"; bảng hiện tên mới nhất |
| 2 | Lọc biệt danh có từ ngữ xấu | Có danh sách từ cấm cơ bản; quản trị viên ẩn tay phần còn lại |
| 3 | Giữ dữ liệu người chơi bao lâu | Đến khi xóa bảng hoặc template nguồn; có nút xóa dữ liệu người chơi của một bảng |
| 4 | Link bảng xếp hạng có cần đường dẫn riêng (`/b/<mã>`) thay vì `/try/<mã>` | Dùng `/try/<mã>` ở X2; đổi sau nếu cần |
