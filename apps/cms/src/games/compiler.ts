import { bundleGame, buildErrors, type BuildError } from '@opes/module-bundler';
import sdkCore from '@opes/modules/sdk-core';
import type { GameAssets } from './types';

/**
 * Biên dịch game ngay trong trình duyệt bằng esbuild-wasm (chạy trong Web Worker riêng của esbuild).
 * Biên dịch chỉ đọc và biến đổi mã nguồn, không chạy code game; code game chỉ chạy trong khung /embed
 * của trang chơi.
 */

type Esbuild = typeof import('esbuild-wasm');

let ready: Promise<Esbuild> | null = null;

function loadEsbuild(): Promise<Esbuild> {
  ready ??= (async () => {
    const esbuild = await import('esbuild-wasm');
    await esbuild.initialize({ wasmURL: '/esbuild.wasm', worker: true });
    return esbuild;
  })().catch((e: unknown) => {
    ready = null;
    throw e;
  });
  return ready;
}

export type CompileResult =
  | { ok: true; schemaJs: string; runtimeJs: string }
  | { ok: false; errors: BuildError[] };

/** Chỉ biên dịch file code (.ts, .tsx, .js, .jsx, .json); file .md/.txt bị bỏ qua. */
const COMPILABLE = /\.(tsx?|jsx?|json)$/;

export async function compileGame(files: Record<string, string>, assets: GameAssets): Promise<CompileResult> {
  const esbuild = await loadEsbuild();
  const source = Object.fromEntries(Object.entries(files).filter(([path]) => COMPILABLE.test(path)));
  try {
    const out = await bundleGame(esbuild, {
      files: source,
      sdkCore: sdkCore as Record<string, string>,
      assets: Object.fromEntries(Object.entries(assets).map(([p, a]) => [p, { url: a.url, sha256: a.sha256 }])),
    });
    return { ok: true, ...out };
  } catch (e) {
    return { ok: false, errors: buildErrors(e) };
  }
}

export type { BuildError };
