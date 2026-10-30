/**
 * Biên dịch các game có sẵn trong src/ thành gói để nạp vào cơ sở dữ liệu (bundles/builtin.json).
 * Chạy: pnpm --filter @opes/modules bundle  (turbo tự chạy trước typecheck/test/build của gói phụ thuộc).
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as esbuild from 'esbuild';
import { bundleGame, formatBuildErrors } from '@opes/module-bundler';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.join(here, '..');
const srcDir = path.join(pkg, 'src');
const sdkDir = path.join(pkg, '../module-sdk/src');
/** Thứ tự hiển thị trong CMS. */
const GAMES = ['catch', 'catch-quiz', 'sample'];
/** Lõi module-sdk: core.ts và các file nó xuất lại (export * from './x'). */
const coreSource = readFileSync(path.join(sdkDir, 'core.ts'), 'utf8');
const SDK_CORE_FILES = ['core.ts', ...[...coreSource.matchAll(/from '\.\/([\w-]+)'/g)].map((m) => `${m[1]}.ts`)];

function readGame(dir) {
  const files = {};
  const walk = (rel) => {
    for (const name of readdirSync(path.join(dir, rel))) {
      const relPath = rel ? `${rel}/${name}` : name;
      const full = path.join(dir, relPath);
      if (statSync(full).isDirectory()) walk(relPath);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) files[relPath] = readFileSync(full, 'utf8');
    }
  };
  walk('');
  return files;
}

const sdkCore = Object.fromEntries(SDK_CORE_FILES.map((f) => [f, readFileSync(path.join(sdkDir, f), 'utf8')]));
const out = [];
for (const game of GAMES) {
  const files = readGame(path.join(srcDir, game));
  let bundles;
  try {
    bundles = await bundleGame(esbuild, { files, sdkCore });
  } catch (e) {
    console.error(`Lỗi biên dịch game "${game}":\n${formatBuildErrors(e).join('\n')}`);
    process.exit(1);
  }
  const sandbox = {};
  vm.runInNewContext(bundles.schemaJs, sandbox);
  const meta = sandbox.__opes.meta();
  out.push({ folder: game, meta, files, ...bundles });
  console.log(`  ${meta.key}@${meta.version}: ${Object.keys(files).length} file, ${bundles.runtimeJs.length} ký tự phần chạy`);
}
mkdirSync(path.join(pkg, 'bundles'), { recursive: true });
writeFileSync(path.join(pkg, 'bundles/builtin.json'), JSON.stringify(out));
console.log(`Đã biên dịch ${out.length} game vào bundles/builtin.json`);
