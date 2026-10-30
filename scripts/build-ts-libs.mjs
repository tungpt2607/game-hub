/**
 * Gom các file khai báo kiểu cho gợi ý code TypeScript trong CMS (Bước 7, trình sửa code):
 *   - thư viện chuẩn của TypeScript (es2022, dom, dom.iterable và các file chúng tham chiếu)
 *   - kiểu của React (@types/react, csstype)
 *   - mã nguồn @opes/module-sdk (game import từ đây)
 * Cách dùng (trong thư mục apps/cms): node ../../scripts/build-ts-libs.mjs
 * Kết quả: public/ts-libs.json (không đưa vào git). Trình sửa code tải file này một lần, trình duyệt lưu đệm.
 */
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(process.cwd(), 'package.json'));

/** Đường dẫn ảo → nội dung. Khớp với cấu hình trong apps/cms/src/games/workspace/ts/service.ts. */
const out = {};

// 1. Thư viện chuẩn: lấy theo `/// <reference lib="..." />` bắt đầu từ các lib cần dùng.
const tsLibDir = path.dirname(require.resolve('typescript/lib/lib.d.ts'));
const pending = ['es2022', 'dom', 'dom.iterable'];
const seen = new Set();
while (pending.length) {
  const name = pending.pop();
  if (seen.has(name)) continue;
  seen.add(name);
  const file = `lib.${name}.d.ts`;
  const text = readFileSync(path.join(tsLibDir, file), 'utf8');
  out[`/lib/${file}`] = text;
  for (const m of text.matchAll(/\/\/\/\s*<reference\s+lib="([^"]+)"/g)) pending.push(m[1].toLowerCase());
}

// 2. React và csstype (csstype là phụ thuộc của @types/react).
const reactDir = path.dirname(require.resolve('@types/react/package.json'));
for (const name of readdirSync(reactDir)) {
  if (name.endsWith('.d.ts')) out[`/types/react/${name}`] = readFileSync(path.join(reactDir, name), 'utf8');
}
const reactRequire = createRequire(path.join(reactDir, 'package.json'));
const csstypeDir = path.dirname(reactRequire.resolve('csstype/package.json'));
out['/types/csstype/index.d.ts'] = readFileSync(path.join(csstypeDir, 'index.d.ts'), 'utf8');

// 3. Mã nguồn module-sdk (không gồm test).
const sdkDir = path.join(root, 'packages/module-sdk/src');
for (const name of readdirSync(sdkDir)) {
  if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out[`/sdk/${name}`] = readFileSync(path.join(sdkDir, name), 'utf8');
}

const target = path.join(process.cwd(), 'public/ts-libs.json');
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out));
const kb = Math.round(Buffer.byteLength(JSON.stringify(out)) / 1024);
console.log(`Đã gom ${Object.keys(out).length} file khai báo kiểu vào public/ts-libs.json (${kb}KB)`);
