/**
 * Chép tài nguyên của các mẫu module (ảnh, font) từ packages/modules/assets vào thư mục public của
 * một ứng dụng Next.js, để mẫu dùng được ngay mà không cần tải lên thư viện Media.
 * Cách dùng (trong thư mục ứng dụng): node ../../scripts/copy-module-assets.mjs
 * Kết quả nằm ở public/module-assets (không đưa vào git).
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'packages/modules/assets');
const target = path.join(process.cwd(), 'public/module-assets');

if (existsSync(target)) rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`Đã chép tài nguyên mẫu module vào ${path.relative(root, target)}`);
