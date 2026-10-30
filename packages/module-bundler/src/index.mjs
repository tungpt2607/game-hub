/**
 * Biên dịch mã nguồn một game (các file .ts/.tsx theo chuẩn module) thành 2 gói JavaScript:
 *
 * - schemaJs: gói tự chứa (gồm cả phần lõi của module-sdk), không cần React hay trình duyệt.
 *   Chạy được trong hộp cách ly (QuickJS) ở API để đọc mô tả game, kiểm tra và chuẩn hóa cấu hình.
 *   Khi chạy, gói đặt `globalThis.__opes = { meta, validate, normalize, mediaIds }`.
 * - runtimeJs: gói CommonJS cho trình duyệt; `react` và `@opes/module-sdk*` do nơi chạy cung cấp
 *   qua hàm `require`. `module.exports.default` là định nghĩa module (có `Runtime`).
 *
 * Viết bằng JavaScript thuần để dùng được cả trong Node (gói `esbuild`) lẫn trong trình duyệt
 * (gói `esbuild-wasm`): nơi gọi truyền đối tượng esbuild vào.
 */

/** Các thư viện nơi chạy cung cấp cho phần chạy của game. */
export const RUNTIME_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  '@opes/module-sdk',
  '@opes/module-sdk/react',
  '@opes/module-sdk/core',
];

const SDK_CORE = '@opes/module-sdk/core';
const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];

/** Đường dẫn chuẩn hóa: bỏ "./", gộp "..". */
function normalizePath(path) {
  const out = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function dirname(path) {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

function loaderFor(path) {
  if (path.endsWith('.tsx')) return 'tsx';
  if (path.endsWith('.ts')) return 'ts';
  if (path.endsWith('.jsx')) return 'jsx';
  if (path.endsWith('.json')) return 'json';
  return 'js';
}

/** Plugin đọc file từ bộ nhớ (map đường dẫn → nội dung) thay vì ổ đĩa. */
function virtualFiles(files, { externals, sdkPrefix }) {
  const find = (path) => {
    for (const ext of EXTS) {
      const candidate = normalizePath(path + ext);
      if (Object.prototype.hasOwnProperty.call(files, candidate)) return candidate;
    }
    return null;
  };
  return {
    name: 'opes-virtual-files',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (externals.includes(args.path)) return { path: args.path, external: true };
        if (args.path === SDK_CORE && sdkPrefix) {
          const found = find(`${sdkPrefix}/core`);
          if (found) return { path: found, namespace: 'opes' };
        }
        if (args.path.startsWith('.') || args.kind === 'entry-point') {
          const base = args.kind === 'entry-point' ? '' : dirname(args.importer);
          const found = find(args.kind === 'entry-point' ? args.path : `${base}/${args.path}`);
          if (found) return { path: found, namespace: 'opes' };
          return { errors: [{ text: `Không tìm thấy file "${args.path}" (từ "${args.importer || 'điểm vào'}")` }] };
        }
        return {
          errors: [
            {
              text: `Không dùng được thư viện "${args.path}". Game chỉ được dùng react và @opes/module-sdk (xem tài liệu chuẩn module).`,
            },
          ],
        };
      });
      build.onLoad({ filter: /.*/, namespace: 'opes' }, (args) => ({
        contents: files[args.path],
        loader: loaderFor(args.path),
        resolveDir: '/',
      }));
    },
  };
}

const SCHEMA_ENTRY = `
import schema from './schema';
import { validateConfig, normalizeConfig, collectMediaIds } from '${SDK_CORE}';
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
globalThis.__opes = {
  meta: () =>
    clone({
      key: schema.key,
      kind: schema.kind,
      version: schema.version,
      name: schema.name,
      description: schema.description,
      defaults: schema.defaults,
      screens: schema.screens,
      presets: schema.presets ?? [],
      scoring: schema.scoring ?? null,
    }),
  validate: (config) => validateConfig(schema.fields, config),
  normalize: (config) => normalizeConfig(schema.fields, config, schema.defaults),
  mediaIds: (config) => collectMediaIds(schema.fields, config),
};
`;

const RUNTIME_ENTRY = `export { default } from './index';`;

/** Hộp cách ly không có structuredClone; cấu hình luôn là JSON nên sao chép qua JSON là đủ. */
const SCHEMA_BANNER =
  'if (typeof globalThis.structuredClone !== "function") { globalThis.structuredClone = function (v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }; }';

/**
 * Lỗi biên dịch dễ đọc: "Runtime.tsx:12:4 Không tìm thấy …".
 * @param {{ errors?: Array<{ text: string, location?: { file: string, line: number, column: number } | null }> }} failure
 */
export function formatBuildErrors(failure) {
  const errors = failure?.errors ?? [];
  if (!errors.length) return [String(failure?.message ?? failure)];
  return errors.map((e) => {
    const loc = e.location ? `${e.location.file.replace(/^opes:/, '')}:${e.location.line}:${e.location.column} ` : '';
    return `${loc}${e.text}`;
  });
}

/**
 * Biên dịch một game.
 * @param {any} esbuild Đối tượng esbuild (gói `esbuild` trong Node, `esbuild-wasm` trong trình duyệt).
 * @param {{ files: Record<string, string>, sdkCore: Record<string, string> }} input
 *   files: mã nguồn của game, khóa là đường dẫn tương đối (ví dụ "config.ts", "Runtime.tsx").
 *   sdkCore: các file lõi của module-sdk (core.ts, fields.ts, validation.ts, meta.ts).
 * @returns {Promise<{ schemaJs: string, runtimeJs: string }>}
 */
export async function bundleGame(esbuild, { files, sdkCore }) {
  const source = {};
  for (const [path, content] of Object.entries(files)) source[normalizePath(path)] = content;
  for (const required of ['schema', 'index']) {
    if (!['.ts', '.tsx', '.js'].some((ext) => source[required + ext] !== undefined)) {
      throw Object.assign(new Error(`Thiếu file ${required}.ts`), { errors: [{ text: `Thiếu file ${required}.ts` }] });
    }
  }
  const sdk = {};
  for (const [path, content] of Object.entries(sdkCore)) sdk[`__sdk/${normalizePath(path)}`] = content;

  const common = { bundle: true, write: false, logLevel: 'silent', charset: 'utf8', jsx: 'automatic', legalComments: 'none' };

  const schema = await esbuild.build({
    ...common,
    entryPoints: ['__schema_entry.ts'],
    format: 'iife',
    target: 'es2020',
    banner: { js: SCHEMA_BANNER },
    plugins: [virtualFiles({ ...source, ...sdk, '__schema_entry.ts': SCHEMA_ENTRY }, { externals: [], sdkPrefix: '__sdk' })],
  });

  const runtime = await esbuild.build({
    ...common,
    entryPoints: ['__runtime_entry.ts'],
    format: 'cjs',
    target: 'es2020',
    plugins: [virtualFiles({ ...source, '__runtime_entry.ts': RUNTIME_ENTRY }, { externals: RUNTIME_EXTERNALS })],
  });

  return { schemaJs: schema.outputFiles[0].text, runtimeJs: runtime.outputFiles[0].text };
}
