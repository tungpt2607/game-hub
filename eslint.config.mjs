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
 * Nợ kỹ thuật: các file đang dài hơn MAX_LINES, mỗi file có trần riêng bằng kích thước hiện tại
 * (làm tròn lên hàng chục). File chỉ được ngắn đi: khi tách nhỏ thì hạ trần, xuống dưới MAX_LINES thì
 * xóa khỏi danh sách. Không thêm file mới vào đây, không nâng trần.
 * Dấu ( ) [ ] trong đường dẫn Next.js là ký tự đặc biệt của glob nên phải viết thoát bằng dấu \.
 */
const OVERSIZED_FILES = {
  'apps/cms/src/app/\\(admin\\)/games/\\[key\\]/page.tsx': 670,
  'apps/cms/src/app/\\(admin\\)/templates/\\[id\\]/page.tsx': 600,
  'apps/cms/src/games/workspace/Workspace.tsx': 860,
  'apps/cms/src/module-ui/PreviewLinksDialog.tsx': 690,
  'apps/cms/src/module-ui/inputs.tsx': 550,
  'packages/modules/src/catch/Runtime.tsx': 800,
  'packages/modules/src/catch/config.ts': 420,
  'packages/modules/src/catch-quiz/Runtime.tsx': 890,
  'packages/modules/src/catch-quiz/config.ts': 590,
};

/** Import bị cấm ở mã chạy trên trình duyệt (CMS, trang chơi) vì làm gói tải về lớn. */
const BROWSER_IMPORTS = {
  paths: [
    {
      name: '@mui/material',
      message: "Import từng component: import Button from '@mui/material/Button'.",
    },
    {
      name: '@mui/icons-material',
      message: "Import từng icon: import AddIcon from '@mui/icons-material/Add'.",
    },
  ],
  patterns: [
    {
      group: ['esbuild-wasm', 'prettier', 'prettier/*'],
      allowTypeImports: true,
      message: "Thư viện nặng: chỉ tải khi cần bằng `await import('…')`.",
    },
  ],
};

const UI_GENERIC_MESSAGE =
  'components/ui chỉ chứa component tổng quát: nhận dữ liệu qua props, báo hành động qua callback; ' +
  'không gọi API, không đọc router/kiểu nghiệp vụ/localStorage (mục 3.2 quy ước code).';

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
    // Performance phía trình duyệt: không kéo cả thư viện lớn vào gói tải lúc mở trang.
    files: ['apps/cms/src/**/*.{ts,tsx}', 'apps/play/src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', BROWSER_IMPORTS] },
  },
  {
    // Component giao diện tổng quát: không chứa nghiệp vụ (xem mục 3.2 quy ước code).
    files: ['apps/cms/src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...BROWSER_IMPORTS.paths,
            ...['next/navigation', 'next/router', '@opes/contracts'].map((name) => ({
              name,
              message: UI_GENERIC_MESSAGE,
            })),
          ],
          patterns: [
            ...BROWSER_IMPORTS.patterns,
            {
              group: ['**/lib/api', '**/module-ui/**', '**/games/**'],
              message: UI_GENERIC_MESSAGE,
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: UI_GENERIC_MESSAGE },
        { name: 'sessionStorage', message: UI_GENERIC_MESSAGE },
        { name: 'fetch', message: UI_GENERIC_MESSAGE },
      ],
    },
  },
  {
    // Kiểm thử và từ điển chuỗi giao diện được phép dài.
    files: ['**/*.test.ts', '**/*.test.tsx', 'packages/i18n/src/*.ts'],
    rules: { 'max-lines': 'off' },
  },
  ...Object.entries(OVERSIZED_FILES).map(([file, max]) => ({
    files: [file],
    rules: { 'max-lines': lineLimit(max) },
  })),
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
          selector:
            'ConditionalExpression[test.operator="instanceof"][test.right.name="ApiRequestError"]',
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
