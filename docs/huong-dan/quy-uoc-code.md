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
| `examples/game-mau` và `src/sample` giữ `Runtime.tsx`, `config.ts` giống nhau (test) | Gói mẫu tải về phải tự đủ file nên không import chéo được | Sửa một bên thì chép sang bên kia |

### File đang dài hơn 400 dòng

Danh sách `OVERSIZED_FILES` trong `eslint.config.mjs` ghi các file cũ đang quá dài, mỗi file có trần bằng kích thước hiện tại.

- File trong danh sách **chỉ được ngắn đi**. Khi tách nhỏ thì hạ trần; xuống dưới 400 dòng thì xóa khỏi danh sách.
- **Không thêm file mới vào danh sách, không nâng trần.** Sửa một file đã chạm trần thì tách bớt phần liên quan ra file khác trong cùng thay đổi.

## 3. Quy ước người review kiểm tra

**Chung**

- Trước khi viết helper mới, tìm xem đã có chưa (`lib/` của từng ứng dụng, `@opes/contracts`, `@opes/module-sdk`). Thấy cùng một đoạn code ở chỗ thứ hai thì gom thành hàm dùng chung.
- Chú thích bằng tiếng Việt, giải thích **vì sao** (ràng buộc, lý do chọn cách làm), không lặp lại code làm gì.
- Chuỗi hiển thị trong CMS lấy từ `@opes/i18n` (`t('…')`), không viết cứng trong component.
- Kiểu dữ liệu trao đổi giữa API và CMS/trang chơi khai báo bằng Zod trong `@opes/contracts`, dùng chung cho cả hai phía.

**API (`apps/api`)**

- Báo lỗi bằng `AppError(status, code, message)`; kiểm tra dữ liệu vào bằng `parseInput(Schema, await readJson(c.req))`.
- Chỉ `select` các cột cần dùng; không lấy cả dòng khi bảng có cột lớn (code game, cấu hình).
- Các truy vấn không phụ thuộc nhau thì chạy song song bằng `Promise.all`; trong `db.transaction` thì chạy tuần tự.
- Không lọc lồng nhau trong vòng lặp (`a.map(x => b.filter(...))`): gom bằng `Map` trước.
- Bộ nhớ đệm trong tiến trình phải có giới hạn: dùng `LruCache` (`lib/lru.ts`), không dùng `Map` không giới hạn.
- Việc tốn kém (chạy sandbox, băm mật khẩu) không chạy lặp lại ở đường dẫn công khai cho mỗi lượt xem nếu kết quả lưu đệm được.
- Bảng chỉ thêm mà không bao giờ xóa (như `rate_limits`) phải có cách dọn dữ liệu cũ.
- Mọi thay đổi có ảnh hưởng tới dữ liệu cần kiểm thử tích hợp trong `admin.integration.test.ts`.

**CMS và game (`apps/cms`, `packages/modules`)**

- Component nhiều trạng thái (khoảng trên 10 `useState`): tách logic ra custom hook (`useXxx`).
- Giá trị tính từ props/state dùng làm phụ thuộc của effect thì bọc `useMemo`, tránh tạo mảng/object mới mỗi lần render.
- Logic game (engine) tách khỏi giao diện và có kiểm thử với số ngẫu nhiên cố định (`seededRandom`).

## 4. Commit chỉ đổi định dạng

Commit chỉ đổi định dạng (chạy Prettier cho nhiều file) phải tách riêng, rồi thêm mã commit vào `.git-blame-ignore-revs` để `git blame` vẫn chỉ đúng người viết. GitHub tự đọc file này; trên máy chạy một lần:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

Tài liệu Markdown không định dạng tự động (`*.md` nằm trong `.prettierignore`), vì đoạn code mẫu trong hướng dẫn phải khớp nguyên văn với file thật để người đọc tìm theo. Khi sửa code mà tài liệu có trích dẫn (ví dụ gói mẫu `game-mau` trong `viet-game.md`), cập nhật tài liệu cùng lúc.
