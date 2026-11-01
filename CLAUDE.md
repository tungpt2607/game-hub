# Hướng dẫn cho Claude khi làm việc trong repo này

Game Hub OPES: monorepo pnpm + Turborepo. `apps/api` (Hono + Drizzle + PostgreSQL), `apps/cms` (Next.js + MUI),
`apps/play` (Next.js, trang chơi), `packages/*` (contracts Zod, db, module-sdk, modules game, i18n, module-bundler).
Tài liệu thiết kế trong `docs/`.

## Quy ước code (bắt buộc)

@docs/huong-dan/quy-uoc-code.md

## Cách làm việc

**Ngôn ngữ**

- Trả lời người dùng, viết chú thích code, thông báo lỗi, chuỗi giao diện và commit message bằng tiếng Việt.
- Chú thích giải thích vì sao, không lặp lại code làm gì.

**Trước khi viết code**

- Đọc code xung quanh và làm theo cách repo đang làm; không tự đưa vào thư viện hoặc kiểu viết mới khi chưa hỏi.
- Tìm helper sẵn có trước khi viết mới: `apps/cms/src/lib/` (`api.ts`, `format.ts`, `clipboard.ts`, `useDebouncedValue.ts`), `apps/api/src/lib/`
  (`errors.ts`, `lru.ts`, `rate-limit.ts`, `modules.ts`), `@opes/contracts`, `@opes/module-sdk`.
- Thấy cùng một đoạn code lần thứ hai thì gom thành hàm dùng chung, không chép thêm bản thứ ba.
- Giao diện: tìm component sẵn có trong `apps/cms/src/components/ui/` (tổng quát), `apps/cms/src/components/`,
  `apps/cms/src/module-ui/`, `@opes/module-sdk/react`
  trước khi viết mới; đoạn giao diện dùng ở chỗ thứ hai thì tách thành component dùng chung (mục 3.2 quy ước code).
- Component dùng chung viết dưới dạng tổng quát (mục 3.2): đặt tên theo chức năng, không chứa nghiệp vụ, chữ và nội dung
  nhận qua props / `children` / `renderItem`, kiểu tổng quát `<T>` cho danh sách; chỉ thêm tùy chọn khi có ít nhất hai nơi cần.
- Ưu tiên performance (mục 3.1): giữa hai cách cùng đúng và an toàn, chọn cách nhanh hơn; nghi chậm thì đo trước và sau,
  báo số đo cho người dùng.

**Không được làm để cho qua kiểm tra**

- Không thêm file vào `OVERSIZED_FILES` trong `eslint.config.mjs` (danh sách đang trống). File sắp vượt 400 dòng thì tách nhỏ
  ngay: logic ra custom hook, giao diện ra component, hàm thuần ra `*-utils.ts` kèm kiểm thử.
- Không tắt luật ESLint, không dùng `eslint-disable` khi chưa có lý do thật; nếu bắt buộc phải tắt thì ghi lý do
  ngay trên dòng đó (`-- <lý do>`).
- Không dùng `any`, `@ts-ignore`, `@ts-expect-error` để né lỗi kiểu.
- Không bỏ qua, xóa hoặc làm yếu kiểm thử để kiểm thử qua.
- Không thêm `*.md` hay thư mục nào vào `.prettierignore` để né định dạng.

**Hook tự động**

- Sau mỗi lần sửa file, hook `.claude/hooks/after-edit.sh` tự chạy Prettier và ESLint trên file đó. Hook báo lỗi ESLint
  thì sửa ngay đúng nguyên nhân trước khi làm tiếp; không sửa hook hay tắt hook để né lỗi.

**Trước khi commit**

1. `pnpm format`
2. `pnpm check` (định dạng, lint, kiểu, kiểm thử): phải qua hết.
3. Sửa API hoặc cơ sở dữ liệu: chạy thêm kiểm thử với PostgreSQL thật
   (`TEST_DATABASE_URL=… pnpm --workspace-concurrency=1 --filter @opes/db --filter @opes/api exec vitest run`).
   Không có PostgreSQL thì nói rõ là chưa chạy, không báo là đã qua.
4. Sửa giao diện CMS / trang chơi / game: chạy ứng dụng và thử trên trình duyệt luồng bị ảnh hưởng nếu môi trường cho phép;
   không làm được thì nói rõ.
5. Thêm tính năng hoặc sửa lỗi thì thêm kiểm thử tương ứng (engine game: `*.test.ts` cạnh file; API: `admin.integration.test.ts`).
6. Sửa code mà tài liệu có trích dẫn (đặc biệt gói mẫu `packages/modules/examples/game-mau` trong `docs/huong-dan/viet-game.md`):
   cập nhật tài liệu cùng lúc.
7. Đổi lược đồ trong `packages/db/src/schema.ts`: chạy `pnpm db:generate` để sinh migration, không sửa tay migration cũ.

**Commit**

- Mỗi commit một việc, message tiếng Việt: dòng đầu tóm tắt, phần thân liệt kê thay đổi và lý do.
- Commit chỉ đổi định dạng thì tách riêng và thêm mã commit vào `.git-blame-ignore-revs`.
- Không commit file sinh khi build (`apps/*/next-env.d.ts` bị Next.js sửa khi build: trả lại như cũ trước khi commit).

**Báo cáo kết quả**

- Nói đúng những gì đã kiểm tra và kết quả thật; bước nào chưa chạy được thì nói rõ, kèm lý do.
- Thay đổi có thể ảnh hưởng hành vi (dù nhỏ) thì nêu ra để người dùng biết.
