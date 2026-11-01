import { t } from '@opes/i18n';
import type { GameFiles } from '../types';
import type { TsTextEdit } from './ts/protocol';
import { dirName, isAssetPath } from './vfs';

/** Hàm hỗ trợ dùng chung trong khu sửa code. */

export const ancestors = (path: string) => {
  const out: string[] = [];
  for (let d = dirName(path); d; d = dirName(d)) out.push(d);
  return out;
};

export const isLib = (path: string) => path.startsWith('lib:');

/** Tên tiếng Việt của loại ký hiệu (hàm, hằng…); loại lạ thì giữ nguyên. */
export const kindLabel = (kind: string) => {
  const key = `cms.editor.kind.${kind.replace(/\s+/g, '_')}`;
  const label = t(key);
  return label === key ? kind : label;
};
export const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
export const FORMATTABLE = /\.(tsx?|jsx?|json|md)$/;

/** Dòng (từ 1) và cột (từ 0) của vị trí `pos` trong `text`. */
export function lineColumn(text: string, pos: number) {
  let line = 1;
  let start = 0;
  for (let i = text.indexOf('\n'); i >= 0 && i < pos; i = text.indexOf('\n', i + 1)) {
    line++;
    start = i + 1;
  }
  return { line, column: pos - start };
}

/** Áp các sửa đổi (đổi tên ký hiệu…) vào nội dung file, từ cuối lên đầu để vị trí không lệch. */
export function applyEdits(files: GameFiles, edits: TsTextEdit[]): GameFiles {
  const next = { ...files };
  const byFile = new Map<string, TsTextEdit[]>();
  for (const e of edits) byFile.set(e.path, [...(byFile.get(e.path) ?? []), e]);
  for (const [path, list] of byFile) {
    let text = next[path];
    if (text === undefined) continue;
    for (const e of [...list].sort((a, b) => b.from - a.from))
      text = text.slice(0, e.from) + e.insert + text.slice(e.to);
    next[path] = text;
  }
  return next;
}

/** Vị trí (số ký tự từ đầu) của dòng `line` (từ 1), cột `column` (từ 0) trong `text`; ngược với lineColumn. */
export function offsetAt(text: string, line: number, column: number): number {
  let pos = 0;
  for (let l = 1; l < line; l++) {
    const nl = text.indexOf('\n', pos);
    if (nl < 0) break;
    pos = nl + 1;
  }
  return pos + Math.max(0, column);
}

/**
 * Định dạng các file đã sửa (khác bản đã lưu) trước khi lưu. File còn lỗi cú pháp giữ nguyên.
 * Trả về bộ file mới và có file nào thay đổi không.
 */
export async function formatChangedFiles(
  files: GameFiles,
  savedFiles: GameFiles,
  format: (path: string, text: string) => Promise<string>,
): Promise<{ files: GameFiles; changed: boolean }> {
  const next = { ...files };
  let changed = false;
  for (const [path, text] of Object.entries(files)) {
    if (text === savedFiles[path] || !FORMATTABLE.test(path)) continue;
    try {
      const formatted = await format(path, text);
      if (formatted !== text) {
        next[path] = formatted;
        changed = true;
      }
    } catch {
      // File còn lỗi cú pháp: lưu nguyên như đang viết.
    }
  }
  return { files: next, changed };
}

/** File code đã sửa so với bản đã lưu (để hiện dấu ● trên tab). File kèm và file thư viện không tính. */
export const isEditedFile = (path: string, files: GameFiles, savedFiles: GameFiles): boolean =>
  !isAssetPath(path) &&
  !isLib(path) &&
  files[path] !== undefined &&
  files[path] !== savedFiles[path];
