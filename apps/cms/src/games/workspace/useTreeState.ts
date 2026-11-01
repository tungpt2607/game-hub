import { useCallback, useState } from 'react';
import { ancestors } from './workspace-utils';
import { ASSETS_DIR, dirName, fileExists, isAssetPath, type Workspace } from './vfs';

/** Trạng thái cây thư mục: thư mục đang mở, mục đang chọn; giữ đúng khi đổi tên / di chuyển / xóa. */
export function useTreeState(ws: Workspace) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);

  /** Mở các thư mục cha để thấy `path`. */
  const reveal = useCallback(
    (path: string) =>
      setExpanded((s) => {
        const next = new Set(s);
        for (const a of ancestors(path)) next.add(a);
        return next;
      }),
    [],
  );

  const toggle = (path: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const collapseAll = () => setExpanded(new Set());

  /** File / thư mục `from` vừa chuyển thành `to`: đổi theo các thư mục đang mở và mục đang chọn. */
  const moved = (from: string, to: string) => {
    const rename = (p: string) =>
      p === from || p.startsWith(`${from}/`) ? to + p.slice(from.length) : p;
    setExpanded((s) => {
      const out = new Set([...s].map(rename));
      for (const a of ancestors(to)) out.add(a);
      return out;
    });
    setSelected((cur) => (cur ? rename(cur) : cur));
  };

  /** `path` vừa bị xóa: bỏ chọn nếu đang chọn nó hoặc thứ bên trong. */
  const deleted = (path: string) =>
    setSelected((cur) => (cur === path || cur?.startsWith(`${path}/`) ? null : cur));

  /** Thư mục đang chọn (file thì lấy thư mục chứa nó). Tạo file code không đặt vào assets/. */
  const selectedFolder = (allowAssets = false): string => {
    if (!selected) return '';
    const folder = fileExists(ws, selected) ? dirName(selected) : selected;
    if (!allowAssets && (folder === ASSETS_DIR || isAssetPath(folder))) return '';
    return folder;
  };

  return {
    expanded,
    selected,
    setSelected,
    reveal,
    toggle,
    collapseAll,
    moved,
    deleted,
    selectedFolder,
  };
}
