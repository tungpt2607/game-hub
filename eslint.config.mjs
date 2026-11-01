import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Quy ước code được kiểm tra tự động (xem docs/huong-dan/quy-uoc-code.md).
 * `pnpm lint` chạy với --max-warnings=0: mọi vi phạm đều làm CI thất bại.
 */

/** Số dòng tối đa của một file (không tính dòng trống và chú thích). */
const MAX_LINES = 400;

/**
 * Nợ kỹ thuật: các file đang dài hơn MAX_LINES, sẽ được tách nhỏ dần.
 * Chỉ được XÓA khỏi danh sách (khi đã tách xong), không thêm file mới vào.
 * Dấu ( ) [ ] trong đường dẫn Next.js là ký tự đặc biệt của glob nên phải viết thoát bằng dấu \.
 */
const OVERSIZED_FILES = [
  'apps/api/src/routes/modules.ts',
  'apps/cms/src/app/\\(admin\\)/games/\\[key\\]/page.tsx',
  'apps/cms/src/app/\\(admin\\)/templates/\\[id\\]/page.tsx',
  'apps/cms/src/games/workspace/Workspace.tsx',
  'apps/cms/src/module-ui/PreviewLinksDialog.tsx',
  'apps/cms/src/module-ui/inputs.tsx',
  'packages/modules/src/catch/Runtime.tsx',
  'packages/modules/src/catch-quiz/Runtime.tsx',
  'packages/modules/src/catch-quiz/config.ts',
];

const lineLimit = (max) => ['error', { max, skipBlankLines: true, skipComments: true }];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/next-env.d.ts',
      'packages/modules/bundles/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Bắt lỗi gọi hook sai chỗ và thiếu phụ thuộc trong useEffect/useMemo/useCallback.
    files: ['**/*.{ts,tsx}'],
    ...reactHooks.configs['recommended-latest'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      eqeqeq: ['error', 'always'],
      'no-duplicate-imports': 'error',
      // Kiểu chỉ dùng làm kiểu thì import bằng `import type` (không kéo code thừa vào gói chạy).
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'max-lines': lineLimit(MAX_LINES),
    },
  },
  {
    // Kiểm thử và từ điển chuỗi giao diện được phép dài.
    files: ['**/*.test.ts', '**/*.test.tsx', 'packages/i18n/src/*.ts'],
    rules: { 'max-lines': 'off' },
  },
  {
    files: OVERSIZED_FILES,
    rules: { 'max-lines': lineLimit(800) },
  },
  {
    // Code ứng dụng: không để console.log sót lại; ghi lỗi bằng console.error / console.warn.
    files: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
    rules: { 'no-console': ['error', { allow: ['error', 'warn', 'info'] }] },
  },
  {
    // CMS: dùng hàm dùng chung thay vì tự viết lại ở từng trang.
    files: ['apps/cms/src/**/*.{ts,tsx}'],
    ignores: ['apps/cms/src/lib/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/]',
          message: 'Định dạng ngày giờ bằng formatDateTime/formatDay trong lib/format.ts.',
        },
        {
          selector: 'ConditionalExpression[test.operator="instanceof"][test.right.name="ApiRequestError"]',
          message: 'Dùng errorMessage(e) hoặc toApiError(e) trong lib/api.ts.',
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
  },
);
