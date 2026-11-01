# Quy ước code

Mục tiêu: code chuyên nghiệp, dễ hiểu, dễ bảo trì, chạy nhanh, và **code viết thêm sau này cũng giữ được như vậy** mà không phải refactor lại.

Phần lớn quy ước dưới đây được **máy kiểm tra tự động**: vi phạm thì CI báo đỏ và không gộp được. Phần còn lại (mục 3) do người review kiểm tra.

Claude Code cũng làm theo tài liệu này: `CLAUDE.md` ở thư mục gốc nhúng nguyên file này, kèm các quy tắc làm việc riêng cho Claude. Sửa quy ước ở đây là Claude áp dụng theo.

## 1. Trước khi đẩy code

```bash
pnpm format   # tự định dạng code
pnpm check    # chạy đúng các bước CI kiểm tra: định dạng, lint, kiểu, kiểm thử
```

Nên bật "định dạng khi lưu" (format on save) bằng Prettier trong trình soạn thảo. Repo đã có sẵn `.prettierrc.json` và `.editorconfig`.

Claude Code: hook trong `.claude/settings.json` (script `.claude/hooks/after-edit.sh`) tự chạy Prettier và ESLint trên mỗi file Claude vừa sửa; còn lỗi ESLint thì lỗi được gửi lại để Claude sửa ngay.

Kiểm thử với PostgreSQL thật (CI luôn chạy): đặt `TEST_DATABASE_URL` rồi chạy
`pnpm --workspace-concurrency=1 --filter @opes/db --filter @opes/api exec vitest run`.

## 2. Luật được kiểm tra tự động

| Luật | Vì sao | Khi bị báo lỗi |
|---|---|---|
| Định dạng theo Prettier (`pnpm format:check`) | Cả repo một kiểu viết; diff chỉ còn thay đổi thật | Chạy `pnpm format` |
| Không có cảnh báo lint (`--max-warnings=0`) | Cảnh báo bị bỏ qua sẽ tích tụ | Sửa, không tắt luật |
| `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` | Thiếu phụ thuộc trong `useEffect`/`useMemo`/`useCallback` là nguồn lỗi phổ biến nhất của React | Thêm phụ thuộc. Nếu cố ý bỏ: `// eslint-disable-next-line react-hooks/exhaustive-deps -- <lý do>` (bắt buộc ghi lý do) |
| File tối đa **400 dòng** (không tính dòng trống, chú thích; trừ file test và từ điển chuỗi) | File dài khó đọc, khó review | Tách thành component con, custom hook hoặc file helper |
| `eqeqeq` | `==` có quy tắc ép kiểu dễ nhầm | Dùng `===` / `!==` |
| `consistent-type-imports` | Rõ cái nào chỉ là kiểu, không kéo code thừa vào gói chạy | `import type { X }` hoặc `import { type X }` (chạy `eslint --fix`) |
| `no-duplicate-imports` | Một module import một chỗ | Gộp các dòng import |
| Không `console.log` trong `apps/*/src`, `packages/*/src` | Không để log gỡ lỗi sót lại | Bỏ đi; log thật thì dùng `console.info` / `console.warn` / `console.error` |
| CMS: không gọi `toLocaleString` / `toLocaleDateString` | Ngày giờ hiển thị thống nhất | `formatDateTime`, `formatDay` trong `apps/cms/src/lib/format.ts` |
| CMS: không viết `e instanceof ApiRequestError ? … : …` | Xử lý lỗi API một chỗ | `errorMessage(e)` hoặc `toApiError(e)` trong `apps/cms/src/lib/api.ts` |
| CMS, trang chơi: không import cả `@mui/material` / `@mui/icons-material` | Import cả thư viện làm gói tải về lớn và build chậm | `import Button from '@mui/material/Button'`, `import AddIcon from '@mui/icons-material/Add'` |
| CMS, trang chơi: không import tĩnh `esbuild-wasm`, `prettier` (trừ `import type`) | Thư viện vài MB, chỉ cần ở vài màn hình | `const esbuild = await import('esbuild-wasm')` ngay chỗ cần |
| `examples/game-mau` và `src/sample` giữ `Runtime.tsx`, `config.ts` giống nhau (test) | Gói mẫu tải về phải tự đủ file nên không import chéo được | Sửa một bên thì chép sang bên kia |

### File đang dài hơn 400 dòng

Danh sách `OVERSIZED_FILES` trong `eslint.config.mjs` ghi các file cũ đang quá dài, mỗi file có trần bằng kích thước hiện tại.

- File trong danh sách **chỉ được ngắn đi**. Khi tách nhỏ thì hạ trần; xuống dưới 400 dòng thì xóa khỏi danh sách.
- **Không thêm file mới vào danh sách, không nâng trần.** Sửa một file đã chạm trần thì tách bớt phần liên quan ra file khác trong cùng thay đổi.

## 3. Quy ước người review kiểm tra

### 3.1. Ưu tiên performance

Thứ tự ưu tiên khi phải đánh đổi: **đúng → an toàn → performance → ngắn gọn**. Nghĩa là giữa hai cách cùng đúng và an toàn, chọn cách chạy nhanh hơn, tải ít hơn, dù code dài hơn một chút; ghi chú lý do ngay tại chỗ. Không tối ưu theo cảm tính: chỗ nào nghi chậm thì đo (thời gian phản hồi API, số lần render, kích thước gói) rồi mới sửa, và ghi số đo trước/sau vào mô tả thay đổi.

Đường dẫn nóng (chạy nhiều nhất) cần cẩn thận nhất: trang chơi `/public/*`, vòng lặp game (mỗi khung hình), danh sách dài trong CMS.

**Trình duyệt (CMS, trang chơi)**

- Thư viện hoặc màn hình nặng, ít dùng (trình sửa code, biên dịch game, xem trước, QR): tải khi cần bằng `await import(…)` hoặc `next/dynamic`.
- Không tạo object/mảng/hàm mới ở mỗi lần render rồi truyền xuống component con hoặc dùng làm phụ thuộc effect: bọc `useMemo` / `useCallback`, hoặc đưa hằng số ra ngoài component.
- Phần tử trong danh sách dài (thẻ template, hàng bảng, file trong cây thư mục) tách thành component riêng và bọc `memo` khi danh sách render lại thường xuyên; `key` là id ổn định, không dùng chỉ số mảng nếu danh sách thêm/xóa/đổi thứ tự.
- Danh sách có thể tới hàng trăm phần tử: phân trang hoặc hiển thị theo vùng nhìn thấy (virtualize).
- Trạng thái đổi liên tục (vị trí chuột, tiến độ tải lên) để trong component nhỏ nhất cần nó, không đặt ở trang cha khiến cả trang render lại.
- Gõ phím gọi API (tìm kiếm, kiểm tra cấu hình): debounce; huỷ hoặc bỏ qua kết quả cũ khi có yêu cầu mới.
- Ảnh: có kích thước cố định để không nhảy bố cục; ảnh sẽ dùng ngay khi chơi thì tải trước.

**Vòng lặp game (`packages/modules`)**

- Trạng thái thay đổi mỗi khung hình để trong `useRef` / engine, không `setState` mỗi khung hình; chỉ cập nhật giao diện (HUD) khi giá trị hiển thị thật sự đổi (xem `catch/Runtime.tsx`).
- Dùng `requestAnimationFrame`, giới hạn bước thời gian (`MAX_DT`) để máy giật không làm sai luật chơi; dừng vòng lặp khi màn hình chơi đóng.
- Không tạo object mới trong vòng lặp nếu tái sử dụng được; vẽ nhiều vật thể thì dùng canvas.
- Tôn trọng `prefers-reduced-motion` cho hiệu ứng trang trí.

### 3.2. Tách component để tái sử dụng

- Trước khi viết component mới, tìm trong nơi chứa component dùng chung:
  - `apps/cms/src/components/`: giao diện chung của CMS, không gắn nghiệp vụ (hộp xác nhận, khung trang, ô mật khẩu…).
  - `apps/cms/src/module-ui/`: giao diện liên quan game/template (form cấu hình, xem trước, chọn media…).
  - `@opes/module-sdk/react`: hook/thành phần dùng chung giữa các game (`useFont`, `useSound`…).
- Một đoạn giao diện xuất hiện ở **chỗ thứ hai** thì tách thành component dùng chung, đặt vào thư mục ở trên; không chép thêm bản thứ ba.
- Một component làm một việc. Tách khi component vừa lấy dữ liệu vừa hiển thị phức tạp, hoặc có phần tự nhiên đứng riêng được (hộp thoại, một hàng trong danh sách, một bước trong luồng).
- Tách phần lấy dữ liệu / trạng thái ra custom hook (`useXxx`), component chỉ nhận props và hiển thị. Component hiển thị không gọi `api()` trực tiếp.
- Props có kiểu rõ ràng (interface `XxxProps`); truyền đúng dữ liệu cần, không truyền cả object lớn khi chỉ dùng một trường (giúp `memo` hiệu quả và component dễ dùng lại).
- Chuỗi hiển thị, màu, kích thước nhận qua props hoặc lấy từ `t('…')` / theme, không viết cứng, để dùng lại được ở chỗ khác.
- Không tách quá nhỏ: component chỉ bọc một thẻ và chuyển tiếp props, dùng đúng một chỗ, thì giữ nguyên trong file cha.

### 3.3. Chung

- Trước khi viết helper mới, tìm xem đã có chưa (`lib/` của từng ứng dụng, `@opes/contracts`, `@opes/module-sdk`). Thấy cùng một đoạn code ở chỗ thứ hai thì gom thành hàm dùng chung.
- Chú thích bằng tiếng Việt, giải thích **vì sao** (ràng buộc, lý do chọn cách làm), không lặp lại code làm gì.
- Chuỗi hiển thị trong CMS lấy từ `@opes/i18n` (`t('…')`), không viết cứng trong component.
- Kiểu dữ liệu trao đổi giữa API và CMS/trang chơi khai báo bằng Zod trong `@opes/contracts`, dùng chung cho cả hai phía.

### 3.4. API (`apps/api`)

- Báo lỗi bằng `AppError(status, code, message)`; kiểm tra dữ liệu vào bằng `parseInput(Schema, await readJson(c.req))`.
- Chỉ `select` các cột cần dùng; không lấy cả dòng khi bảng có cột lớn (code game, cấu hình).
- Các truy vấn không phụ thuộc nhau thì chạy song song bằng `Promise.all`; trong `db.transaction` thì chạy tuần tự.
- Không lọc lồng nhau trong vòng lặp (`a.map(x => b.filter(...))`): gom bằng `Map` trước.
- Bộ nhớ đệm trong tiến trình phải có giới hạn: dùng `LruCache` (`lib/lru.ts`), không dùng `Map` không giới hạn.
- Việc tốn kém (chạy sandbox, băm mật khẩu) không chạy lặp lại ở đường dẫn công khai cho mỗi lượt xem nếu kết quả lưu đệm được.
- Bảng chỉ thêm mà không bao giờ xóa (như `rate_limits`) phải có cách dọn dữ liệu cũ.
- Mọi thay đổi có ảnh hưởng tới dữ liệu cần kiểm thử tích hợp trong `admin.integration.test.ts`.

### 3.5. CMS và game (`apps/cms`, `packages/modules`)

- Component nhiều trạng thái (khoảng trên 10 `useState`): tách logic ra custom hook (`useXxx`).
- Logic game (engine) tách khỏi giao diện và có kiểm thử với số ngẫu nhiên cố định (`seededRandom`).

## 4. Commit chỉ đổi định dạng

Commit chỉ đổi định dạng (chạy Prettier cho nhiều file) phải tách riêng, rồi thêm mã commit vào `.git-blame-ignore-revs` để `git blame` vẫn chỉ đúng người viết. GitHub tự đọc file này; trên máy chạy một lần:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

Tài liệu Markdown không định dạng tự động (`*.md` nằm trong `.prettierignore`), vì đoạn code mẫu trong hướng dẫn phải khớp nguyên văn với file thật để người đọc tìm theo. Khi sửa code mà tài liệu có trích dẫn (ví dụ gói mẫu `game-mau` trong `viet-game.md`), cập nhật tài liệu cùng lúc.
