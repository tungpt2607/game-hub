import releaseVariant from '@jitl/quickjs-singlefile-mjs-release-sync';
import { newQuickJSWASMModuleFromVariant, shouldInterruptAfterDeadline, type QuickJSWASMModule } from 'quickjs-emscripten-core';
import type { GameModuleMeta } from '@opes/db';
import { AppError } from './errors';

/**
 * Chạy gói mô tả của game (schemaJs) trong máy JavaScript QuickJS tách biệt hoàn toàn với máy chủ:
 * không có mạng, ổ đĩa, biến môi trường hay cơ sở dữ liệu; giới hạn bộ nhớ và thời gian.
 * Dùng để đọc mô tả game, kiểm tra và chuẩn hóa cấu hình template.
 */

const MEMORY_LIMIT = 64 * 1024 * 1024;
const TIME_LIMIT_MS = 2000;

let quickjs: Promise<QuickJSWASMModule> | null = null;
const engine = () => (quickjs ??= newQuickJSWASMModuleFromVariant(releaseVariant));

type Op = 'meta' | 'validate' | 'normalize' | 'mediaIds';

async function run<T>(schemaJs: string, op: Op, input?: unknown): Promise<T> {
  const qjs = await engine();
  const code = `${schemaJs}\n;JSON.stringify(globalThis.__opes[${JSON.stringify(op)}](${JSON.stringify(input ?? null)}));`;
  let out: unknown;
  try {
    out = qjs.evalCode(code, {
      memoryLimitBytes: MEMORY_LIMIT,
      shouldInterrupt: shouldInterruptAfterDeadline(Date.now() + TIME_LIMIT_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    throw new AppError(422, 'MODULE_SANDBOX_ERROR', `Code mô tả game bị lỗi khi chạy: ${message}`);
  }
  if (typeof out !== 'string') throw new AppError(422, 'MODULE_SANDBOX_ERROR', 'Code mô tả game không trả về kết quả.');
  return JSON.parse(out) as T;
}

export const sandbox = {
  meta: (schemaJs: string) => run<GameModuleMeta>(schemaJs, 'meta'),
  validate: (schemaJs: string, config: unknown) => run<Record<string, string>>(schemaJs, 'validate', config),
  normalize: (schemaJs: string, config: unknown) => run<Record<string, unknown>>(schemaJs, 'normalize', config),
  mediaIds: (schemaJs: string, config: unknown) => run<string[]>(schemaJs, 'mediaIds', config),
};
