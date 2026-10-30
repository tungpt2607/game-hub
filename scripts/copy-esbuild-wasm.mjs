/**
 * Chép esbuild.wasm (trình biên dịch game chạy trong trình duyệt, Bước 7c) vào public của CMS.
 * Cách dùng (trong thư mục apps/cms): node ../../scripts/copy-esbuild-wasm.mjs
 * Kết quả: public/esbuild.wasm (không đưa vào git); bản luôn khớp với gói esbuild-wasm đã cài.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const main = require.resolve('esbuild-wasm');
const source = path.join(path.dirname(main), '..', 'esbuild.wasm');
const target = path.join(process.cwd(), 'public/esbuild.wasm');
mkdirSync(path.dirname(target), { recursive: true });
copyFileSync(source, target);
console.log('Đã chép esbuild.wasm vào public/');
