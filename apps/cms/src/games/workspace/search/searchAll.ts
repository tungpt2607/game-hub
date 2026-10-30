import type { GameFiles } from '../../types';

/**
 * Tìm và thay chữ trong mọi file code của game (Ctrl+Shift+F), thuần, có test.
 * Hỗ trợ phân biệt hoa thường, nguyên từ, biểu thức chính quy giống khung tìm trong file.
 */

export interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regexp: boolean;
}

export interface SearchMatch {
  from: number;
  to: number;
  line: number;
  /** Đoạn dòng chứa kết quả (đã cắt bớt nếu dài), và vị trí chữ khớp trong đoạn đó. */
  preview: string;
  previewFrom: number;
  previewTo: number;
}

export interface FileMatches {
  path: string;
  matches: SearchMatch[];
}

export interface SearchResult {
  files: FileMatches[];
  total: number;
  /** Số kết quả vượt giới hạn hiển thị. */
  truncated: boolean;
  /** Biểu thức chính quy sai. */
  error?: string;
}

const MAX_MATCHES = 2000;
const PREVIEW_BEFORE = 30;
const PREVIEW_MAX = 160;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tạo biểu thức tìm (cờ g); null nếu ô tìm trống; báo lỗi nếu biểu thức chính quy sai. */
export function buildPattern(opts: SearchOptions): RegExp | null {
  if (!opts.query) return null;
  let source = opts.regexp ? opts.query : escapeRegExp(opts.query);
  if (opts.wholeWord) source = `\\b(?:${source})\\b`;
  return new RegExp(source, opts.caseSensitive ? 'gu' : 'giu');
}

export function searchFiles(files: GameFiles, opts: SearchOptions): SearchResult {
  let pattern: RegExp | null;
  try {
    pattern = buildPattern(opts);
  } catch (e) {
    return { files: [], total: 0, truncated: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (!pattern) return { files: [], total: 0, truncated: false };
  const out: FileMatches[] = [];
  let total = 0;
  let truncated = false;
  for (const path of Object.keys(files).sort()) {
    const text = files[path]!;
    const matches: SearchMatch[] = [];
    pattern.lastIndex = 0;
    let lineNo = 1;
    let lineStart = 0;
    let scanned = 0;
    for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
      if (m[0] === '') {
        pattern.lastIndex++;
        continue;
      }
      if (total >= MAX_MATCHES) {
        truncated = true;
        break;
      }
      // Đếm dòng tăng dần (không quét lại từ đầu file).
      for (; scanned < m.index; scanned++) {
        if (text.charCodeAt(scanned) === 10) {
          lineNo++;
          lineStart = scanned + 1;
        }
      }
      const lineEnd = text.indexOf('\n', m.index);
      const lineText = text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
      const col = m.index - lineStart;
      const cut = Math.max(0, col - PREVIEW_BEFORE);
      const preview = (cut ? '…' : '') + lineText.slice(cut, cut + PREVIEW_MAX).trimEnd();
      const shift = cut ? 1 - cut : 0;
      matches.push({
        from: m.index,
        to: m.index + m[0].length,
        line: lineNo,
        preview,
        previewFrom: col + shift,
        previewTo: Math.min(col + shift + m[0].length, preview.length),
      });
      total++;
    }
    if (matches.length) out.push({ path, matches });
    if (truncated) break;
  }
  return { files: out, total, truncated };
}

/** Thay mọi kết quả trong các file `paths` (mặc định mọi file). Trả về file đã sửa và số chỗ đã thay. */
export function replaceInFiles(
  files: GameFiles,
  opts: SearchOptions,
  replacement: string,
  paths?: string[],
): { files: GameFiles; count: number } {
  const pattern = buildPattern(opts);
  if (!pattern) return { files, count: 0 };
  const only = paths ? new Set(paths) : null;
  let count = 0;
  const next: GameFiles = { ...files };
  for (const [path, text] of Object.entries(files)) {
    if (only && !only.has(path)) continue;
    pattern.lastIndex = 0;
    const replaced = text.replace(pattern, (...args: unknown[]) => {
      const match = args[0] as string;
      if (match === '') return match;
      count++;
      // Biểu thức chính quy: hỗ trợ $1, $2… như VS Code; chữ thường thì thay nguyên văn.
      return opts.regexp ? match.replace(new RegExp(pattern.source, pattern.flags.replace('g', '')), replacement) : replacement;
    });
    if (replaced !== text) next[path] = replaced;
  }
  return { files: next, count };
}
