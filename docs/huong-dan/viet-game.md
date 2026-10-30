# Hướng dẫn viết game cho Game Hub OPES

Tài liệu gồm hai phần:

- **Phần A – Làm từng bước**: đi từ gói mẫu tới một game chạy được, có link gửi người khác chơi. Làm lần đầu thì đọc phần này.
- **Phần B – Tham khảo**: mô tả đầy đủ từng file, từng loại trường, giới hạn và các lỗi thường gặp.

Không cần cài gì thêm: mọi bước làm được bằng trình duyệt, chương trình giải nén có sẵn trên máy và một trình soạn chữ (Notepad, TextEdit; nếu có VS Code thì tiện hơn).

---

## Phần A – Làm từng bước

Ví dụ trong phần này: từ gói mẫu "Chạm quà", làm game **"Chạm hoa mai"**. Người chơi chạm vào bông hoa mai xuất hiện trên màn hình để ghi điểm trước khi hết giờ.

### Bước 1. Tải gói mẫu

1. Đăng nhập CMS, chọn mục **Game** ở menu bên trái.
2. Bấm **Tải gói mẫu (.zip)**. Máy tải về file `game.mau.zip`.

### Bước 2. Giải nén

1. Giải nén `game.mau.zip`:
   - Windows: chuột phải → **Extract All…**
   - Mac: bấm đúp vào file.
2. Đổi tên thư mục vừa giải nén thành `hoa-mai` cho dễ nhớ. Bên trong có:

```
hoa-mai/
├── schema.ts         mô tả game: tên, key, phiên bản
├── config.ts         form cấu hình và cấu hình mặc định
├── presets.ts        các mẫu có sẵn
├── Runtime.tsx       phần vẽ và chạy game
├── index.ts          ghép mô tả với phần chạy (không cần sửa)
├── opes-assets.d.ts  (không cần sửa)
├── README.md
└── assets/           ảnh đi kèm game
    ├── hop-qua.svg
    └── nen-dem.svg
```

### Bước 3. Đặt tên và key cho game

1. Mở `schema.ts` bằng trình soạn chữ. Trên Windows: chuột phải → **Open with** → Notepad.
2. Sửa 3 dòng sau:

```ts
  key: 'game.mau',
  name: 'Game mẫu: Chạm quà',
  description: 'Gói mẫu để học cách viết game: …',
```

thành:

```ts
  key: 'game.hoa-mai',
  name: 'Chạm hoa mai',
  description: 'Chạm vào bông hoa mai xuất hiện trên màn hình để ghi điểm trước khi hết giờ.',
```

3. Giữ nguyên `version: '1.0.0'` và lưu file.

> **key** là "chứng minh thư" của game: chỉ dùng chữ thường không dấu, số và dấu `-`, phải bắt đầu bằng `game.`, và không đổi được sau khi tạo.

### Bước 4. Thêm ảnh của bạn

1. Chuẩn bị một ảnh bông hoa mai, nền trong suốt (PNG hoặc WebP, khoảng 300 × 300 px).
2. Đặt tên file không dấu, không dấu cách, ví dụ `hoa-mai.png`, rồi chép vào thư mục `assets/`.
3. Mở `presets.ts` và sửa:

```ts
    id: 'mua-le-hoi',
    name: 'Mùa lễ hội',
```

thành:

```ts
    id: 'tet',
    name: 'Tết hoa mai',
```

4. Vẫn trong `presets.ts`, sửa dòng:

```ts
        { symbol: { emoji: '', image: asset('hop-qua.svg', 'Hộp quà') }, points: 3 },
```

thành:

```ts
        { symbol: { emoji: '', image: asset('hoa-mai.png', 'Hoa mai') }, points: 3 },
```

5. Lưu file.

> `asset('tên-file')` lấy file trong thư mục `assets/`. Tên phải khớp đúng từng chữ, kể cả chữ hoa và chữ thường.

### Bước 5. Nén lại thành .zip

1. Mở thư mục `hoa-mai` và chọn tất cả file và thư mục bên trong (Ctrl+A, trên Mac là Cmd+A).
2. Nén lại:
   - Windows: chuột phải → **Send to** → **Compressed (zipped) folder**.
   - Mac: chuột phải → **Compress**.
3. Đổi tên file vừa tạo thành `hoa-mai.zip`.

> Nén cả thư mục `hoa-mai` cũng được: CMS tự bỏ thư mục ngoài cùng.

### Bước 6. Tải game lên CMS

1. Vào CMS → **Game** → bấm **Tải lên game mới (.zip)** → chọn `hoa-mai.zip`.
2. Chờ vài giây. CMS biên dịch code, tải ảnh lên kho rồi mở màn sửa game **Chạm hoa mai**.
3. Màn sửa game giống VS Code:
   - **cây thư mục** bên trái: mọi file của game, gồm cả thư mục `assets/`. Trên điện thoại, bấm nút ☰ để mở cây thư mục;
   - **hàng tab** phía trên: các file đang mở. Tab chữ nghiêng là tab xem tạm, bấm đúp để giữ lại. Dấu ● là file đã sửa mà chưa lưu;
   - **khung code** ở giữa, bên dưới là kết quả biên dịch;
   - **khung điện thoại** bên phải để chạy thử game (trên điện thoại là tab **Chạy thử**).

Nếu CMS báo lỗi thay vì mở màn sửa game:

| Báo lỗi | Cách sửa |
|---|---|
| `Đã có game "game.hoa-mai"` | Key đã có người dùng. Đổi key ở Bước 3 rồi nén lại. |
| `Không thấy schema.ts` | Gói nén sai. Làm lại Bước 5. |
| Lỗi có dạng `presets.ts:12:5 …` | Code ở file đó, dòng đó bị gõ sai (thường là thiếu dấu `'` hoặc `,`). Mở file, sửa, nén lại. |

### Bước 7. Chạy thử

1. Ở khung bên phải, mục **Cấu hình chạy thử**, chọn **Tết hoa mai**.
2. Bấm **Bắt đầu** trong khung điện thoại và chạm thử vào bông hoa mai.
3. Dùng các nút phía trên khung điện thoại để đổi kích thước máy, nhảy tới từng màn hình (Mở đầu, Đang chơi, Kết thúc) hoặc bật tiếng.

Nếu khung báo `Không có file assets/hoa-mai.png`, tên ảnh trong `presets.ts` không khớp tên file. Sửa ngay trong CMS ở Bước 8.

### Bước 8. Sửa code ngay trong CMS: thêm một ô vào form

Ví dụ: thêm dòng chữ nhỏ dưới nút "Bắt đầu" để người làm template tự nhập nội dung, như "Chương trình đến hết 15/02".

1. Ở cây thư mục, bấm `config.ts`. Tìm dòng:

```ts
  content: { title: string; intro: string; startLabel: string; logo: MediaRef | null };
```

và thêm `footer: string;`:

```ts
  content: { title: string; intro: string; startLabel: string; footer: string; logo: MediaRef | null };
```

2. Cũng trong `config.ts`, tìm dòng có `startLabel: field.text(` và thêm ngay bên dưới:

```ts
      footer: field.text({ label: 'Dòng chữ dưới nút', maxLength: 80 }),
```

3. Kéo xuống phần cấu hình mặc định, tìm `startLabel: 'Bắt đầu',` và thêm ngay bên dưới:

```ts
    footer: 'Chương trình đến hết 15/02',
```

4. Bấm `Runtime.tsx`. Tìm đoạn:

```tsx
          <button type="button" style={button} onClick={() => void start()}>
            {config.content.startLabel}
          </button>
```

và thêm ngay bên dưới:

```tsx
          {config.content.footer && <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>{config.content.footer}</p>}
```

5. Ngừng gõ khoảng một giây. Dưới khung code sẽ hiện **Biên dịch thành công**, và khung chạy thử hiện dòng chữ mới dưới nút.
   - Nếu hiện lỗi màu đỏ, bấm vào chỗ ghi `tên-file:dòng:cột` để nhảy tới chỗ sai.
6. Bấm **Lưu nháp**. Bản nháp được lưu lại; đồng nghiệp mở game này cũng thấy.

Phím tắt:

| Phím | Tác dụng |
|---|---|
| Ctrl+S | Lưu nháp |
| Ctrl+P | Tìm và mở nhanh một file theo tên |
| Ctrl+F | Tìm và thay trong file đang mở |
| Ctrl+Z / Ctrl+Shift+Z | Hoàn tác / Huỷ hoàn tác |
| F2 / Delete | Đổi tên / Xóa mục đang chọn trong cây thư mục |

Trên điện thoại không có phím tắt: dùng 3 nút **↶ Hoàn tác**, **↷ Huỷ hoàn tác** và **🔍 Tìm** ở bên phải hàng tab.

**Quản lý file trong cây thư mục** (chuột phải vào một mục, hoặc bấm nút ⋯ bên cạnh mục đó):
- **Tạo file code**, **Tạo thư mục**, **Tải file lên**, **Đổi tên**, **Di chuyển tới…**, **Chép đường dẫn**, **Xóa**.
- Trên máy tính có thể kéo một file sang thư mục khác. Kéo ảnh từ máy tính thả vào thư mục trong `assets/` là tải ảnh lên đúng chỗ đó.
- Đổi tên hoặc di chuyển một file mà code khác đang trỏ tới (import hoặc `asset('…')`): CMS hỏi **Cập nhật các chỗ trỏ tới?** Bấm **Cập nhật** thì code được sửa theo.
- Bấm vào một ảnh để xem trước. Ở dưới ảnh có nút chép sẵn đoạn `asset('…')` để dán vào code.

### Bước 9. Sửa logic game (luật chơi)

Logic của game nằm trong `Runtime.tsx`. Trước khi sửa, xem file này gồm những phần nào:

| Phần trong `Runtime.tsx` | Làm gì |
|---|---|
| `LIFETIME`, `SPAWN_EVERY` (đầu file) | Vật phẩm tồn tại bao lâu và bao lâu hiện thêm một cái, theo độ khó (mili giây) |
| `const [score, setScore] = useState(0)` … | Trạng thái của ván chơi: điểm, thời gian còn lại, các vật phẩm đang hiện |
| `const start = useCallback(…)` | Bắt đầu ván: đặt điểm về 0, bật nhạc, chuyển sang màn "Đang chơi" |
| `useEffect` có `setInterval` | Vòng lặp: mỗi 0,1 giây đếm ngược và xóa vật phẩm hết hạn; hết giờ thì sang màn "Kết thúc". Cứ mỗi `SPAWN_EVERY` thì sinh thêm vật phẩm ở chỗ ngẫu nhiên |
| `const hit = (s: Spawned) => {…}` | Người chơi chạm trúng vật phẩm: xóa vật đó, cộng điểm, phát tiếng |
| `return ( … )` | Vẽ giao diện của 3 màn: `intro` (mở đầu), `play` (đang chơi), `end` (kết thúc) |

#### 9a. Sửa nhanh: cho vật phẩm hiện dày hơn

1. Ở cây thư mục, bấm `Runtime.tsx`. Tìm dòng:

```ts
const SPAWN_EVERY: Record<SampleConfig['rules']['difficulty'], number> = { easy: 700, normal: 550, hard: 420 };
```

2. Giảm các con số, ví dụ đổi `normal: 550` thành `normal: 350`. Số càng nhỏ, vật phẩm hiện càng dày.
3. Ở khung chạy thử, bấm nút chơi lại (mũi tên vòng) rồi bấm **Bắt đầu** để thấy khác biệt.

#### 9b. Thêm luật mới: thưởng combo

Luật mới: người chơi chạm liên tiếp đủ số lần mà không chạm vào vật điểm âm (như quả bom) thì lần chạm tiếp theo được **gấp đôi điểm**. Số lần chạm để có combo do người làm template tự chỉnh trong form; đặt 0 là tắt luật này.

Một luật mới thường cần sửa 2 file: `config.ts` thêm ô vào form, `Runtime.tsx` dùng giá trị đó trong logic.

**Trong `config.ts`:**

1. Tìm dòng:

```ts
  rules: { duration: number; showTimer: boolean; difficulty: 'easy' | 'normal' | 'hard' };
```

và thêm `comboEvery: number`:

```ts
  rules: { duration: number; showTimer: boolean; difficulty: 'easy' | 'normal' | 'hard'; comboEvery: number };
```

2. Tìm dòng có `showTimer: field.boolean(` và thêm ngay bên dưới:

```ts
      comboEvery: field.number({
        label: 'Thưởng combo sau mỗi',
        min: 0,
        max: 20,
        integer: true,
        unit: 'lần chạm',
        help: 'Chạm liên tiếp đủ số lần này (không chạm vật điểm âm) thì lần chạm tiếp theo được gấp đôi điểm. 0 = tắt.',
      }),
```

3. Tìm dòng cấu hình mặc định:

```ts
  rules: { duration: 20, showTimer: true, difficulty: 'normal' },
```

và thêm `comboEvery: 3`:

```ts
  rules: { duration: 20, showTimer: true, difficulty: 'normal', comboEvery: 3 },
```

**Trong `Runtime.tsx`:**

4. Tìm dòng `const nextId = useRef(1);` và thêm ngay bên dưới hai dòng sau. Dòng đầu đếm số lần chạm liên tiếp, dòng sau giữ chữ "Combo" đang hiện:

```ts
  const combo = useRef(0);
  const [comboText, setComboText] = useState('');
```

5. Trong phần `const start = useCallback(async () => {`, tìm dòng `scoreRef.current = 0;` và thêm ngay bên dưới (bắt đầu ván mới thì đếm lại combo):

```ts
    combo.current = 0;
```

6. Thay **toàn bộ** phần `const hit = (s: Spawned) => { … };` bằng:

```ts
  const hit = (s: Spawned) => {
    setSpawned((list) => list.filter((x) => x.id !== s.id));
    let points = s.item.points;
    const every = config.rules.comboEvery;
    if (points < 0) {
      // Chạm vật điểm âm: mất chuỗi combo.
      combo.current = 0;
    } else if (every > 0) {
      combo.current += 1;
      if (combo.current > every) {
        // Đủ chuỗi: lần chạm này được gấp đôi, rồi đếm lại từ đầu.
        points *= 2;
        combo.current = 0;
        setComboText(`Combo x2  +${points}`);
        setTimeout(() => setComboText(''), 900);
      }
    }
    scoreRef.current += points;
    setScore(scoreRef.current);
    tap.play();
    host.track('item_tap', { points });
  };
```

7. Hiện chữ "Combo" trên màn đang chơi. Tìm dòng:

```tsx
            {config.rules.showTimer && <span>⏱ {timeLeft}s</span>}
          </div>
```

và thêm ngay bên dưới:

```tsx
          {comboText && (
            <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontSize: 28, fontWeight: 800 }}>
              {comboText}
            </div>
          )}
```

8. Kiểm tra:
   - Dưới khung code phải hiện **Biên dịch thành công**.
   - Ở khung chạy thử, bấm chơi lại rồi **Bắt đầu**. Chạm liên tiếp 4 món quà: lần thứ 4 hiện "Combo x2" và được gấp đôi điểm.
   - Chạm vào quả bom thì chuỗi tính lại từ đầu.
9. Bấm **Lưu nháp**.

Từ giờ, trong form của mỗi template (nhóm **Luật chơi**) có ô **Thưởng combo sau mỗi … lần chạm**. Người làm template tự chỉnh số này mà không cần đụng vào code.

> **Mẹo khi tự viết luật khác:**
> - Giá trị người làm template được chỉnh thì đặt trong `config.ts`; trong `Runtime.tsx` đọc nó qua `config.…`.
> - Giá trị thay đổi trong lúc chơi (điểm, combo…) giữ trong `useState` hoặc `useRef`. Nhớ đặt lại chúng trong `start`, để mỗi ván mới bắt đầu từ đầu.
> - Mỗi lần sửa, nhìn dòng **Biên dịch thành công** và chơi thử ngay ở khung bên phải.

### Bước 10. Phát hành

1. Bấm **Phát hành**, ghi chú nếu muốn (ví dụ "Bản đầu tiên"), rồi bấm **Phát hành** lần nữa.
2. Game có phiên bản **v1.0.0** và từ giờ xuất hiện khi tạo template.

### Bước 11. Tạo template và gửi link chơi thử

1. Vào **Thư viện template** → **Tạo template**.
2. Nhập **Tên template**, ở ô **Loại game** chọn **Chạm hoa mai**, ở phần bắt đầu từ chọn mẫu **Tết hoa mai**, rồi bấm **Tạo**.
3. Chỉnh nội dung trong form (tiêu đề, dòng chữ dưới nút, thời gian chơi…). Khung bên phải cập nhật ngay.
4. Bấm **Công bố**.
5. Bấm **Link chơi thử** → **Tạo link** → **Tạo link**, rồi bấm **Sao chép link** (hoặc **Mã QR** → **Tải ảnh QR**) và gửi cho người khác chơi.

### Bước 12. Sửa game sau khi đã phát hành

1. Vào **Game** → **Chạm hoa mai**, sửa code như Bước 8 và Bước 9.
2. Mở `schema.ts`, tăng phiên bản, ví dụ `version: '1.0.0'` → `version: '1.0.1'`. Mỗi lần phát hành phải tăng, nếu không nút Phát hành sẽ báo.
3. Bấm **Lưu nháp**, rồi **Phát hành**.
4. Template đã tạo trước đó **vẫn chạy bản cũ**, để người chơi không bị ảnh hưởng. Muốn template dùng bản mới:
   1. mở template, bấm **Nâng lên bản mới** ở thông báo màu xanh;
   2. kiểm tra lại bằng khung chạy thử;
   3. bấm **Công bố**. Link chơi thử sẽ đổi theo.

Lỡ sửa hỏng thì có ba cách quay lại:
- bấm **Bỏ bản nháp** để về bản đã phát hành;
- vào **Phiên bản** → **Lấy làm bản nháp** để lấy lại code của một bản cũ;
- bấm **Tải về .zip** để giữ một bản trên máy.

---

## Phần B – Tham khảo

### B1. Gói game gồm những gì

```
game-cua-ban/
├── schema.ts         ← bắt buộc: mô tả game (key, phiên bản, form cấu hình, mặc định, mẫu)
├── index.ts          ← bắt buộc: export default defineModule({ ...schema, Runtime })
├── config.ts         ← kiểu cấu hình, các trường form, cấu hình mặc định
├── presets.ts        ← các mẫu có sẵn (không bắt buộc)
├── Runtime.tsx       ← phần chạy: component React vẽ game
├── engine.ts         ← (tùy) phần tính toán không dính giao diện, dễ kiểm thử
├── opes-assets.d.ts  ← khai báo kiểu cho `opes:assets` (chép từ gói mẫu)
└── assets/           ← ảnh, âm thanh, font đi kèm game
    ├── nen.webp
    └── nhac.mp3
```

- Ngoài `assets/` chỉ nhận file code: `.ts .tsx .js .jsx .json .md .txt`. Có thể chia thư mục con (`components/Board.tsx`).
- Tên file và thư mục chỉ dùng **chữ không dấu, số, `-` `_` `.`**, không có dấu cách.
- Nén cả thư mục hay chỉ nén các file bên trong đều được: nếu mọi file nằm chung một thư mục gốc, CMS tự bỏ thư mục đó.

### B2. `schema.ts`: mô tả game

```ts
import type { ModuleSchema } from '@opes/module-sdk/core';
import { fields, defaults, type Config } from './config';
import { presets } from './presets';

export const schema: ModuleSchema<Config> = {
  key: 'game.hung-qua',      // định danh duy nhất, không đổi sau khi tạo
  kind: 'game',
  version: '1.0.0',          // tăng mỗi lần phát hành
  name: 'Hứng quà',
  description: 'Kéo giỏ hứng quà rơi trước khi hết giờ.',
  fields,
  defaults,
  screens: [                 // các màn hình để nhảy tới khi xem trước
    { id: 'intro', label: 'Mở đầu' },
    { id: 'play', label: 'Đang chơi' },
    { id: 'end', label: 'Kết thúc' },
  ],
  presets,
  scoring: { unit: 'điểm', higherIsBetter: true },
};

export default schema;
```

- **key**: dạng `game.ten-game` (chữ thường, số, dấu `-`). Hai game không được trùng key. Muốn làm game khác từ code của một game có sẵn thì đổi key rồi tải lên dạng game mới.
- **version**: dạng `1.2.3`. Mỗi lần phát hành phải **lớn hơn** bản trước. Quy ước: sửa lỗi nhỏ tăng số cuối (`1.0.1`), thêm tính năng tăng số giữa (`1.1.0`), thay đổi lớn tăng số đầu (`2.0.0`).
- `schema.ts` được chạy trong **hộp cách ly** ở máy chủ để kiểm tra cấu hình. Vì vậy file này (và các file nó import) **không được import React** hay dùng `window`/`document`. Chỉ import từ `@opes/module-sdk/core`, `opes:assets` và các file `.ts` thuần.

### B3. Form cấu hình: `fields` và `defaults`

Mỗi trường trong `fields` thành một ô trong form của CMS. Giá trị nhập vào nằm ở cùng đường dẫn trong cấu hình mà `Runtime` nhận được.

```ts
import { field, type EmojiOrImage, type FontValue, type MediaRef } from '@opes/module-sdk/core';

export interface Config {
  content: { title: string; logo: MediaRef | null };
  rules: { duration: number; mode: 'time' | 'lives' };
  items: { symbol: EmojiOrImage; points: number }[];
}

export const fields = {
  content: field.group({
    label: 'Nội dung',
    fields: {
      title: field.text({ label: 'Tiêu đề', required: true, maxLength: 60 }),
      logo: field.image({ label: 'Logo', hint: 'PNG nền trong suốt' }),
    },
  }),
  rules: field.group({
    label: 'Luật chơi',
    fields: {
      mode: field.select({ label: 'Kết thúc khi', options: [{ value: 'time', label: 'Hết giờ' }, { value: 'lives', label: 'Hết mạng' }] }),
      duration: field.number({
        label: 'Thời gian', min: 10, max: 300, integer: true, unit: 'giây',
        visibleWhen: field.when<Config>((c) => c.rules.mode === 'time'),   // chỉ hiện khi chọn "Hết giờ"
      }),
    },
  }),
  items: field.list<{ symbol: EmojiOrImage; points: number }>({
    label: 'Vật phẩm', min: 1, max: 10,
    newItem: { symbol: { emoji: '🎁', image: null }, points: 1 },
    itemLabel: (it, i) => `${it.symbol.emoji || '🖼️'} Vật phẩm ${i + 1}`,
    item: {
      symbol: field.emojiOrImage({ label: 'Hình' }),
      points: field.number({ label: 'Điểm', min: -100, max: 100, integer: true }),
    },
  }),
};
```

| Loại trường | Giá trị | Tùy chọn chính |
|---|---|---|
| `field.text` | `string` | `required`, `maxLength`, `multiline`, `placeholder`, `format: 'url'` |
| `field.number` | `number` | `min`, `max`, `step`, `integer`, `unit` |
| `field.boolean` | `boolean` | |
| `field.select` | `string` | `options: [{ value, label }]` |
| `field.color` | `'#RRGGBB'` hoặc `'#RRGGBBAA'` | |
| `field.image` | `MediaRef \| null` | `required`, `hint` |
| `field.audio` | `MediaRef \| null` | `required` |
| `field.emojiOrImage` | `{ emoji, image }` | |
| `field.font` | `{ family, media }` | |
| `field.list` | mảng | `item`, `newItem`, `min`, `max`, `itemLabel` |
| `field.group` | object | `fields`, `collapsed` |

Tùy chọn chung cho mọi trường:
- `label`, `help`: nhãn và dòng giải thích.
- `visibleWhen`: điều kiện hiện trường. Trường bị ẩn thì không bị kiểm tra lỗi.
- `check`: kiểm tra riêng của game. Trả về câu báo lỗi, hoặc `null` nếu hợp lệ. Ví dụ:

  ```ts
  check: field.check<{ correct: boolean }[]>((answers) =>
    answers.filter((a) => a.correct).length === 1 ? null : 'Đánh dấu đúng một đáp án đúng'),
  ```

`defaults` phải là một cấu hình **hợp lệ** đầy đủ theo `fields`; CMS không cho phát hành nếu mặc định hoặc mẫu còn lỗi. Template cũ mở bằng phiên bản mới sẽ được bổ sung trường mới từ `defaults`.

### B4. `Runtime.tsx`: phần chạy

```tsx
import { useEffect, useState } from 'react';
import type { RuntimeProps } from '@opes/module-sdk';
import { useFont, useSound } from '@opes/module-sdk/react';
import type { Config } from './config';

export function Runtime({ config, host, initialScreen, muted, storageKey }: RuntimeProps<Config>) {
  const fontFamily = useFont(config.look.font);                    // nạp font đã chọn
  const music = useSound(config.sound.music, { muted, loop: true }); // âm thanh theo nút tắt tiếng
  const [screen, setScreen] = useState(initialScreen ?? 'intro');
  // ...
  return <div style={{ position: 'absolute', inset: 0, fontFamily }}>…</div>;
}
```

- **Lấp đầy khung**: game được đặt trong một khung có kích thước sẵn (điện thoại dọc). Dùng `position: absolute; inset: 0`, và tính theo kích thước khung, không theo `window`.
- `config`: cấu hình template, đúng kiểu `Config`.
- `initialScreen`: màn hình người dùng chọn khi xem trước (khớp `id` trong `screens`).
- `muted`: tắt hay bật tiếng. Mọi âm thanh nên đi qua `useSound`.
- `storageKey`: khóa riêng của từng link, dùng khi lưu dữ liệu trên máy người chơi (ví dụ điểm cao nhất) vào `localStorage`.
- `host`: cổng giao tiếp với nơi chạy. Gọi `host.startPlay()` khi bắt đầu, `host.finishPlay(playId, { score, durationMs })` khi kết thúc, và `host.track(tên, dữ liệu)` để ghi sự kiện. Ở chế độ chơi thử, các hàm này trả kết quả giả ngay.
- **Không tự gọi mạng** (`fetch`, …). Mọi dữ liệu game cần đều nằm trong `config`.

### B5. Ảnh, âm thanh, font đi kèm: thư mục `assets/`

File trong `assets/` được CMS tải lên kho media khi tải gói lên. Trong code, dùng module `opes:assets`:

```ts
import { asset } from 'opes:assets';

// Trong defaults hoặc presets: MediaRef dùng được cho trường ảnh, âm thanh, font, emojiOrImage.
backgroundImage: asset('nen.webp', 'Ảnh nền'),
music: asset('am-thanh/nhac.mp3', 'Nhạc nền'),
symbol: { emoji: '', image: asset('qua/vang.webp') },
```

- Đường dẫn tính từ trong `assets/` (không ghi `assets/`). Ghi sai tên file thì game báo lỗi khi chạy thử.
- Loại file nhận: ảnh PNG, JPG, WebP, GIF, SVG (tối đa 5MB); âm thanh MP3, M4A, OGG, WAV (10MB); font WOFF2, WOFF, TTF, OTF (2MB). Cả gói tối đa 60MB.
- Ảnh động (GIF, WebP động) nên vẽ bằng thẻ `<img>` thay vì `<canvas>`, để chuyển động không bị dừng.
- Giữ file `opes-assets.d.ts` (chép từ gói mẫu) để trình sửa code hiểu `opes:assets`.
- Người dùng vẫn đổi được mọi ảnh bằng ảnh trong thư viện Media qua form; `assets/` chỉ là ảnh mặc định của game.

### B6. Thư viện được dùng

Game chỉ được import:

| Import | Dùng cho |
|---|---|
| `react`, `react/jsx-runtime` | Giao diện (React 19) |
| `@opes/module-sdk/core` | `field`, kiểu `MediaRef`, `ModuleSchema`, kiểm tra cấu hình… (dùng được trong `schema.ts`) |
| `@opes/module-sdk/react` | `useFont`, `useSound` |
| `@opes/module-sdk` | `defineModule`, kiểu `RuntimeProps`… |
| `opes:assets` | File trong `assets/` |

Import thư viện khác (ví dụ `lodash`, `phaser`) sẽ báo lỗi khi biên dịch. Cần thứ gì thì viết trong gói (thêm file `.ts`).

### B7. Làm việc trong CMS

1. **Tải lên game mới**: Game → **Tải lên game mới (.zip)**. CMS biên dịch, đọc key từ `schema.ts`, tải `assets/` lên kho rồi mở màn sửa game. Game mới chỉ có **bản nháp**.
2. **Sửa và chạy thử**: sửa code từng file ngay trong CMS (hoặc sửa trên máy rồi bấm **Tải lên .zip** để thay toàn bộ). CMS biên dịch lại sau khi bạn ngừng gõ. Lỗi hiện theo `file:dòng:cột`, bấm vào để nhảy tới. Khung bên phải chạy thử game với cấu hình mặc định hoặc từng mẫu.
3. **Lưu nháp**: lưu được cả khi còn lỗi. Đồng nghiệp mở cùng game sẽ thấy bản nháp. Nếu hai người cùng sửa, người lưu sau được báo để tải lại.
4. **Phát hành**: tăng `version` trong `schema.ts` rồi bấm **Phát hành**. CMS chặn khi:
   - còn lỗi biên dịch, hoặc game lỗi khi chạy thử;
   - phiên bản không lớn hơn bản trước;
   - cấu hình mặc định hoặc một mẫu không hợp lệ.
5. **Template**: template mới dùng phiên bản mới nhất. Template đã có **giữ phiên bản cũ**; ở màn chỉnh template sẽ có nút **Nâng lên bản mới**, bấm xong rồi Công bố thì link chơi thử mới đổi.
6. **Phiên bản**: nút **Phiên bản** liệt kê các lần phát hành; có thể **tải về .zip** hoặc **lấy làm bản nháp** để sửa tiếp từ một bản cũ.

### B8. Giới hạn

| | Tối đa |
|---|---|
| Số file code | 200 |
| Một file code | 300KB |
| Tổng code | 2MB |
| Số file kèm | 300 |
| Tổng file kèm | 60MB |
| Thời gian chạy `schema.ts` ở máy chủ mỗi lần | 2 giây, 64MB bộ nhớ |

### B9. Lỗi thường gặp

| Thông báo | Cách sửa |
|---|---|
| `Thiếu file schema.ts` | Đặt `schema.ts` và `index.ts` ở thư mục gốc của gói (không lồng thêm thư mục). |
| `Không dùng được thư viện "…"` | Chỉ import các thư viện ở mục B6. |
| `key trong schema.ts phải giữ là "…"` | Không đổi key của game đã có; muốn game khác thì tải lên dạng game mới. |
| `Phiên bản … không lớn hơn bản mới nhất` | Tăng `version` trong `schema.ts`. |
| `Còn … lỗi trong cấu hình mặc định hoặc mẫu` | Sửa `defaults`/`presets` cho khớp `fields` (thiếu trường, sai kiểu, vượt `min`/`max`…). |
| `Không có file assets/…` | Tên file trong `asset('…')` không khớp file trong `assets/` (phân biệt chữ hoa thường). |
| `Code mô tả game bị lỗi khi chạy` | `schema.ts` (hoặc file nó import) dùng React, `window`, `document` hoặc chạy quá lâu. |
