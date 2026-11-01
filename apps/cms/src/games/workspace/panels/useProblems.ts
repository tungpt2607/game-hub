import { useCallback, useMemo } from 'react';
import type { BuildError } from '../../compiler';
import type { GameFiles } from '../../types';
import type { TsDiagnostic } from '../ts/protocol';
import { lineColumn } from '../workspace-utils';
import type { Problem } from './BottomPanel';

/**
 * Gom lỗi biên dịch (esbuild) và lỗi/cảnh báo TypeScript thành danh sách cho bảng Vấn đề;
 * kèm hàm đếm lỗi theo file / thư mục để hiện số đỏ trên cây thư mục và tab.
 */
export function useProblems(
  errors: BuildError[],
  diagnostics: Record<string, TsDiagnostic[]>,
  files: GameFiles,
) {
  const problems = useMemo<Problem[]>(() => {
    const list: Problem[] = errors.map((e) => ({
      path: e.file,
      line: e.line,
      column: e.column,
      message: e.text,
      severity: 'error',
      source: 'build',
    }));
    for (const [path, diags] of Object.entries(diagnostics)) {
      const text = files[path] ?? '';
      for (const d of diags) {
        if (d.severity === 'info') continue;
        list.push({
          path,
          ...lineColumn(text, d.from),
          message: d.message,
          severity: d.severity,
          source: 'ts',
        });
      }
    }
    return list;
  }, [errors, diagnostics, files]);

  /** Số lỗi trong file hoặc thư mục `path`. */
  const errorCount = useCallback(
    (path: string) =>
      path
        ? problems.filter(
            (p) =>
              p.severity === 'error' &&
              (p.path === path || (p.path?.startsWith(`${path}/`) ?? false)),
          ).length
        : 0,
    [problems],
  );
  const errorTotal = problems.filter((p) => p.severity === 'error').length;
  return { problems, errorCount, errorTotal, warningTotal: problems.length - errorTotal };
}
