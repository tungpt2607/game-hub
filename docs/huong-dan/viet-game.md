# Hướng dẫn viết game cho Game Hub OPES

Tài liệu này dành cho người viết code game. Game viết xong được tải lên CMS (mục **Game**) bằng một file `.zip`, chạy thử ngay trong CMS rồi phát hành. Sau đó đồng nghiệp tạo template từ game đó và chỉnh mọi thứ bằng form, không cần sửa code.

Cách nhanh nhất để bắt đầu: vào CMS → **Game** → **Tải gói mẫu (.zip)**, giải nén, sửa, rồi tải lên lại. Gói mẫu nằm trong repo ở `packages/modules/examples/game-mau`.

## 1. Gói game gồm những gì

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

## 2. `schema.ts`: mô tả game

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

## 3. Form cấu hình: `fields` và `defaults`

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

## 4. `Runtime.tsx`: phần chạy

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

## 5. Ảnh, âm thanh, font đi kèm: thư mục `assets/`

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

## 6. Thư viện được dùng

Game chỉ được import:

| Import | Dùng cho |
|---|---|
| `react`, `react/jsx-runtime` | Giao diện (React 19) |
| `@opes/module-sdk/core` | `field`, kiểu `MediaRef`, `ModuleSchema`, kiểm tra cấu hình… (dùng được trong `schema.ts`) |
| `@opes/module-sdk/react` | `useFont`, `useSound` |
| `@opes/module-sdk` | `defineModule`, kiểu `RuntimeProps`… |
| `opes:assets` | File trong `assets/` |

Import thư viện khác (ví dụ `lodash`, `phaser`) sẽ báo lỗi khi biên dịch. Cần thứ gì thì viết trong gói (thêm file `.ts`).

## 7. Làm việc trong CMS

1. **Tải lên game mới**: Game → **Tải lên game mới (.zip)**. CMS biên dịch, đọc key từ `schema.ts`, tải `assets/` lên kho rồi mở màn sửa game. Game mới chỉ có **bản nháp**.
2. **Sửa và chạy thử**: sửa code từng file ngay trong CMS (hoặc sửa trên máy rồi bấm **Tải lên .zip** để thay toàn bộ). CMS biên dịch lại sau khi bạn ngừng gõ. Lỗi hiện theo `file:dòng:cột`, bấm vào để nhảy tới. Khung bên phải chạy thử game với cấu hình mặc định hoặc từng mẫu.
3. **Lưu nháp**: lưu được cả khi còn lỗi. Đồng nghiệp mở cùng game sẽ thấy bản nháp. Nếu hai người cùng sửa, người lưu sau được báo để tải lại.
4. **Phát hành**: tăng `version` trong `schema.ts` rồi bấm **Phát hành**. CMS chặn khi:
   - còn lỗi biên dịch, hoặc game lỗi khi chạy thử;
   - phiên bản không lớn hơn bản trước;
   - cấu hình mặc định hoặc một mẫu không hợp lệ.
5. **Template**: template mới dùng phiên bản mới nhất. Template đã có **giữ phiên bản cũ**; ở màn chỉnh template sẽ có nút **Nâng lên bản mới**, bấm xong rồi Công bố thì link chơi thử mới đổi.
6. **Phiên bản**: nút **Phiên bản** liệt kê các lần phát hành; có thể **tải về .zip** hoặc **lấy làm bản nháp** để sửa tiếp từ một bản cũ.

## 8. Giới hạn

| | Tối đa |
|---|---|
| Số file code | 200 |
| Một file code | 300KB |
| Tổng code | 2MB |
| Số file kèm | 300 |
| Tổng file kèm | 60MB |
| Thời gian chạy `schema.ts` ở máy chủ mỗi lần | 2 giây, 64MB bộ nhớ |

## 9. Lỗi thường gặp

| Thông báo | Cách sửa |
|---|---|
| `Thiếu file schema.ts` | Đặt `schema.ts` và `index.ts` ở thư mục gốc của gói (không lồng thêm thư mục). |
| `Không dùng được thư viện "…"` | Chỉ import các thư viện ở mục 6. |
| `key trong schema.ts phải giữ là "…"` | Không đổi key của game đã có; muốn game khác thì tải lên dạng game mới. |
| `Phiên bản … không lớn hơn bản mới nhất` | Tăng `version` trong `schema.ts`. |
| `Còn … lỗi trong cấu hình mặc định hoặc mẫu` | Sửa `defaults`/`presets` cho khớp `fields` (thiếu trường, sai kiểu, vượt `min`/`max`…). |
| `Không có file assets/…` | Tên file trong `asset('…')` không khớp file trong `assets/` (phân biệt chữ hoa thường). |
| `Code mô tả game bị lỗi khi chạy` | `schema.ts` (hoặc file nó import) dùng React, `window`, `document` hoặc chạy quá lâu. |
