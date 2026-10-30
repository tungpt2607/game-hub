import { GAME_CODE_EXTENSIONS, GAME_PATH } from '@opes/contracts';
import type { GameAssets, GameFiles } from '../types';

/**
 * Hệ thống file của một gói game, dạng thuần (không phụ thuộc giao diện, có test).
 *
 * Mỗi mục có một đường dẫn đầy đủ như trong file .zip:
 *   - file code: "schema.ts", "components/Board.tsx"  → nằm trong `files`
 *   - file kèm:  "assets/tet/hoa-mai.png"              → nằm trong `assets` với khóa "tet/hoa-mai.png"
 * Thư mục không được lưu riêng; thư mục rỗng vừa tạo được giữ trong `folders` cho tới khi có file.
 */

export const ASSETS_DIR = 'assets';
const ASSETS_PREFIX = `${ASSETS_DIR}/`;

export interface Workspace {
  files: GameFiles;
  assets: GameAssets;
  /** Thư mục rỗng do người dùng tạo (đường dẫn đầy đủ). */
  folders: string[];
}

export type EntryKind = 'code' | 'asset';

export const isAssetPath = (path: string) => path.startsWith(ASSETS_PREFIX);
export const assetKey = (path: string) => path.slice(ASSETS_PREFIX.length);
export const assetPath = (key: string) => `${ASSETS_PREFIX}${key}`;
export const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
export const dirName = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
export const joinPath = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);
export const extOf = (path: string) => {
  const name = baseName(path);
  return name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
};

/** Mọi file (đường dẫn đầy đủ). */
export function allFiles(ws: Workspace): string[] {
  return [...Object.keys(ws.files), ...Object.keys(ws.assets).map(assetPath)];
}

export function fileExists(ws: Workspace, path: string): boolean {
  return isAssetPath(path) ? ws.assets[assetKey(path)] !== undefined : ws.files[path] !== undefined;
}

/** Có thư mục này không (có file bên trong, hoặc là thư mục rỗng đã tạo, hoặc là assets/). */
export function folderExists(ws: Workspace, path: string): boolean {
  if (path === '' || path === ASSETS_DIR) return true;
  const prefix = `${path}/`;
  return ws.folders.includes(path) || ws.folders.some((f) => f.startsWith(prefix)) || allFiles(ws).some((f) => f.startsWith(prefix));
}

// ---------- Cây thư mục ----------

export interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children: TreeNode[];
}

/** Thứ tự file ở thư mục gốc: các file chính trước, còn lại theo tên. */
const FIRST = ['schema.ts', 'index.ts', 'config.ts', 'presets.ts', 'Runtime.tsx', 'engine.ts'];

function sortNodes(nodes: TreeNode[], atRoot: boolean) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    if (atRoot && a.type === 'file') {
      const ia = FIRST.indexOf(a.name);
      const ib = FIRST.indexOf(b.name);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
  for (const n of nodes) if (n.children.length) sortNodes(n.children, false);
}

/** Cây thư mục: thư mục trước, file sau; luôn có thư mục assets/. */
export function buildTree(ws: Workspace): TreeNode[] {
  const root: TreeNode = { name: '', path: '', type: 'folder', children: [] };
  const folder = (path: string): TreeNode => {
    if (path === '') return root;
    const parent = folder(dirName(path));
    let node = parent.children.find((c) => c.type === 'folder' && c.name === baseName(path));
    if (!node) {
      node = { name: baseName(path), path, type: 'folder', children: [] };
      parent.children.push(node);
    }
    return node;
  };
  folder(ASSETS_DIR);
  for (const f of ws.folders) folder(f);
  for (const path of allFiles(ws)) folder(dirName(path)).children.push({ name: baseName(path), path, type: 'file', children: [] });
  sortNodes(root.children, true);
  return root.children;
}

// ---------- Kiểm tra tên ----------

const NAME_RULE = 'Tên chỉ dùng chữ không dấu, số, - _ . ; không có dấu cách.';

/** Kiểm tra đường dẫn mới cho một file (code hoặc file kèm). Trả về câu báo lỗi, hoặc null nếu hợp lệ. */
export function checkFilePath(ws: Workspace, path: string, kind: EntryKind, ignore?: string): string | null {
  if (!path || path.endsWith('/')) return 'Nhập tên file.';
  if (!GAME_PATH.test(path)) return NAME_RULE;
  if (kind === 'code') {
    if (isAssetPath(path)) return 'File code không đặt trong thư mục assets/.';
    if (!GAME_CODE_EXTENSIONS.includes(extOf(path))) return `File code chỉ nhận ${GAME_CODE_EXTENSIONS.map((e) => '.' + e).join(', ')}.`;
  } else {
    if (!isAssetPath(path)) return 'Ảnh, âm thanh, font phải nằm trong thư mục assets/.';
    if (extOf(path) !== extOf(ignore ?? path)) return 'Không đổi được phần đuôi của file kèm (ví dụ .png).';
  }
  if (path !== ignore && (fileExists(ws, path) || folderExists(ws, path))) return 'Đã có file hoặc thư mục trùng tên ở đây.';
  return null;
}

export function checkFolderPath(ws: Workspace, path: string, ignore?: string): string | null {
  if (!path) return 'Nhập tên thư mục.';
  if (!GAME_PATH.test(path) || path.includes('.')) return 'Tên thư mục chỉ dùng chữ không dấu, số, - _ ; không có dấu cách, dấu chấm.';
  if (path === ASSETS_DIR && ignore !== ASSETS_DIR) return 'Đã có thư mục assets.';
  if (path !== ignore && (fileExists(ws, path) || folderExists(ws, path))) return 'Đã có file hoặc thư mục trùng tên ở đây.';
  return null;
}

export const kindOf = (path: string): EntryKind => (isAssetPath(path) ? 'asset' : 'code');

// ---------- Đổi tên, di chuyển, xóa ----------

export type Moves = [from: string, to: string][];

/**
 * Đổi tên hoặc di chuyển một file hay thư mục (`from` → `to`, đường dẫn đầy đủ).
 * Trả về workspace mới và danh sách file đã chuyển. Báo lỗi nếu vi phạm quy tắc (code vào assets/…).
 */
export function moveEntry(ws: Workspace, from: string, to: string): { ws: Workspace; moves: Moves } {
  if (from === to) return { ws, moves: [] };
  if (from === ASSETS_DIR) throw new Error('Không đổi tên hay di chuyển được thư mục assets.');
  if (to === from || to.startsWith(`${from}/`)) throw new Error('Không chuyển được thư mục vào chính nó.');
  const isFolder = !fileExists(ws, from);
  const moves: Moves = [];
  if (isFolder) {
    const problem = checkFolderPath(ws, to);
    if (problem) throw new Error(problem);
    for (const path of allFiles(ws)) {
      if (path.startsWith(`${from}/`)) moves.push([path, to + path.slice(from.length)]);
    }
    for (const [src, dest] of moves) {
      if (isAssetPath(src) !== isAssetPath(dest)) {
        throw new Error(isAssetPath(dest) ? 'File code không chuyển vào thư mục assets/ được.' : 'File kèm phải nằm trong thư mục assets/.');
      }
      if (!GAME_PATH.test(dest)) throw new Error(NAME_RULE);
    }
  } else {
    const problem = checkFilePath(ws, to, kindOf(from), from);
    if (problem) throw new Error(problem);
    moves.push([from, to]);
  }
  const files: GameFiles = {};
  const assets: GameAssets = {};
  const map = new Map(moves);
  for (const [path, content] of Object.entries(ws.files)) files[map.get(path) ?? path] = content;
  for (const [key, a] of Object.entries(ws.assets)) {
    const dest = map.get(assetPath(key));
    assets[dest ? assetKey(dest) : key] = a;
  }
  const folders = ws.folders.map((f) => (f === from || f.startsWith(`${from}/`) ? to + f.slice(from.length) : f));
  if (isFolder && moves.length === 0 && !folders.includes(to)) folders.push(to);
  return { ws: pruneFolders({ files, assets, folders: [...new Set(folders)] }), moves };
}

/** Xóa file hoặc thư mục (cùng mọi thứ bên trong). */
export function deleteEntry(ws: Workspace, path: string): Workspace {
  if (path === ASSETS_DIR) throw new Error('Không xóa được thư mục assets.');
  const inside = (p: string) => p === path || p.startsWith(`${path}/`);
  return {
    files: Object.fromEntries(Object.entries(ws.files).filter(([p]) => !inside(p))),
    assets: Object.fromEntries(Object.entries(ws.assets).filter(([k]) => !inside(assetPath(k)))),
    folders: ws.folders.filter((f) => !inside(f)),
  };
}

/** Bỏ thư mục rỗng đã có file bên trong (để danh sách thư mục rỗng luôn gọn). */
export function pruneFolders(ws: Workspace): Workspace {
  const paths = allFiles(ws);
  const folders = ws.folders.filter((f) => !paths.some((p) => p.startsWith(`${f}/`)) && !ws.folders.some((g) => g.startsWith(`${f}/`)));
  return folders.length === ws.folders.length ? ws : { ...ws, folders };
}

// ---------- Cập nhật chỗ trỏ tới ----------

const RESOLVE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js'];

function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

/** Đường dẫn tương đối từ thư mục `fromDir` tới file `to`, luôn bắt đầu bằng ./ hoặc ../ */
export function relativePath(fromDir: string, to: string): string {
  const a = fromDir ? fromDir.split('/') : [];
  const b = to.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  const up = a.length - i;
  const rest = b.slice(i).join('/');
  return up === 0 ? `./${rest}` : `${'../'.repeat(up)}${rest}`;
}

/** Tìm file mà một import tương đối trỏ tới (giống cách biên dịch tìm). */
function resolveImport(paths: Set<string>, importerDir: string, spec: string): { target: string; suffix: string } | null {
  const base = normalize(joinPath(importerDir, spec));
  for (const suffix of RESOLVE_EXTS) {
    if (paths.has(base + suffix)) return { target: base + suffix, suffix };
  }
  return null;
}

/** import ... from './x', import './x', import('./x'), export ... from './x' */
const IMPORT_RE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"\n]*)\2/g;
const ASSET_CALL_RE = /(\basset\s*\(\s*)(['"`])([^'"`\n]+)\2/g;

export interface ReferenceChange {
  file: string;
  count: number;
}

/**
 * Sau khi đổi tên/di chuyển (`moves`, đường dẫn đầy đủ cũ → mới), tìm các chỗ code trỏ tới file cũ:
 * import tương đối (cả import bên trong file vừa chuyển) và asset('...'). Trả về nội dung code đã sửa
 * và danh sách file bị sửa. `before` là workspace trước khi chuyển, `after` là sau khi chuyển.
 */
export function updateReferences(before: Workspace, after: Workspace, moves: Moves): { files: GameFiles; changes: ReferenceChange[] } {
  const map = new Map(moves);
  const back = new Map(moves.map(([a, b]) => [b, a]));
  const oldPaths = new Set(allFiles(before));
  const files: GameFiles = {};
  const changes: ReferenceChange[] = [];
  for (const [path, content] of Object.entries(after.files)) {
    const oldPath = back.get(path) ?? path;
    let count = 0;
    let next = content.replace(IMPORT_RE, (match, lead: string, quote: string, spec: string) => {
      const found = resolveImport(oldPaths, dirName(oldPath), spec);
      if (!found) return match;
      const newTarget = map.get(found.target) ?? found.target;
      if (newTarget === found.target && path === oldPath) return match;
      // Giữ kiểu viết: bỏ đuôi / bỏ /index như cách viết cũ.
      let written = newTarget;
      if (found.suffix && written.endsWith(found.suffix)) written = written.slice(0, -found.suffix.length);
      const spec2 = relativePath(dirName(path), written);
      if (spec2 === spec) return match;
      count++;
      return `${lead}${quote}${spec2}${quote}`;
    });
    next = next.replace(ASSET_CALL_RE, (match, lead: string, quote: string, key: string) => {
      const dest = map.get(assetPath(key));
      if (!dest || !isAssetPath(dest)) return match;
      count++;
      return `${lead}${quote}${assetKey(dest)}${quote}`;
    });
    files[path] = next;
    if (count) changes.push({ file: path, count });
  }
  return { files, changes };
}
