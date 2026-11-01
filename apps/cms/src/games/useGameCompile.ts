import { useEffect, useState } from 'react';
import { compileGame, type CompileResult } from './compiler';
import type { GameAssets, GameFiles } from './types';

export type CompileState = { state: 'idle' | 'compiling' } | ({ state: 'done' } & CompileResult);

/** Chờ ngừng gõ bao lâu (ms) rồi mới biên dịch lại. */
const COMPILE_DELAY = 700;

/**
 * Tự biên dịch game trong trình duyệt sau khi ngừng sửa một lúc.
 * Trả về trạng thái biên dịch và gói chạy của lần biên dịch thành công gần nhất (để xem trước).
 */
export function useGameCompile(enabled: boolean, files: GameFiles, assets: GameAssets) {
  const [compile, setCompile] = useState<CompileState>({ state: 'idle' });
  const [runtimeJs, setRuntimeJs] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setCompile({ state: 'compiling' });
    const timer = setTimeout(() => {
      compileGame(files, assets).then(
        (result) => {
          if (!alive) return;
          setCompile({ state: 'done', ...result });
          if (result.ok) setRuntimeJs(result.runtimeJs);
        },
        (e: unknown) =>
          alive &&
          setCompile({
            state: 'done',
            ok: false,
            errors: [{ file: null, line: 0, column: 0, text: String(e) }],
          }),
      );
    }, COMPILE_DELAY);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [enabled, files, assets]);

  return { compile, runtimeJs };
}
