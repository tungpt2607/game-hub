import type { GameAssets, GameFiles } from './types';

/**
 * So sánh hai trạng thái của gói game (code + file kèm): dùng cho "Chưa lưu", bản tạm trên trình duyệt
 * và danh sách file đổi khi phát hành. Thuần, có test.
 */

export function sameFiles(a: GameFiles, b: GameFiles): boolean {
  if (a === b) return true;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => b[k] === a[k]);
}

export function sameAssets(a: GameAssets, b: GameAssets): boolean {
  if (a === b) return true;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => b[k] !== undefined && b[k]!.sha256 === a[k]!.sha256);
}

export type ChangeKind = 'added' | 'removed' | 'modified';

export interface FileChange {
  /** Đường dẫn đầy đủ như trong .zip (file kèm có tiền tố assets/). */
  path: string;
  kind: ChangeKind;
  /** File code (có thể xem khác biệt từng dòng) hay file kèm. */
  type: 'code' | 'asset';
  before?: string;
  after?: string;
}

/** Danh sách file thay đổi từ `before` sang `after`, sắp theo đường dẫn. */
export function diffPackages(
  before: { files: GameFiles; assets: GameAssets },
  after: { files: GameFiles; assets: GameAssets },
): FileChange[] {
  const out: FileChange[] = [];
  for (const path of new Set([...Object.keys(before.files), ...Object.keys(after.files)])) {
    const a = before.files[path];
    const b = after.files[path];
    if (a === b) continue;
    out.push({
      path,
      type: 'code',
      kind: a === undefined ? 'added' : b === undefined ? 'removed' : 'modified',
      before: a,
      after: b,
    });
  }
  for (const key of new Set([...Object.keys(before.assets), ...Object.keys(after.assets)])) {
    const a = before.assets[key];
    const b = after.assets[key];
    if (a?.sha256 === b?.sha256) continue;
    out.push({ path: `assets/${key}`, type: 'asset', kind: !a ? 'added' : !b ? 'removed' : 'modified' });
  }
  return out.sort((x, y) => x.path.localeCompare(y.path));
}
