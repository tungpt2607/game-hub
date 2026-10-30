'use client';

import { useRef, useState, type ReactNode } from 'react';
import { GAME_PATH } from '@opes/contracts';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { copyText } from '../../lib/clipboard';
import type { GameAssets, GameFiles, PendingAsset } from '../types';
import { assetMime, isCodePath } from '../zip';
import { EntryMenu, type EntryAction } from './EntryMenu';
import { MoveDialog } from './MoveDialog';
import { PathDialog } from './PathDialog';
import { ReferenceUpdateDialog } from './ReferenceUpdateDialog';
import {
  ASSETS_DIR,
  allFiles,
  assetKey,
  baseName,
  checkFilePath,
  checkFolderPath,
  deleteEntry,
  dirName,
  fileExists,
  isAssetPath,
  joinPath,
  kindOf,
  moveEntry,
  updateReferences,
  type Moves,
  type ReferenceChange,
  type TreeNode,
  type Workspace as Ws,
} from './vfs';

type PathDialogState =
  | { mode: 'newFile'; folder: string }
  | { mode: 'newFolder'; folder: string }
  | { mode: 'rename'; path: string; isFolder: boolean }
  | null;

interface PendingMove {
  from: string;
  to: string;
  next: Ws;
  moves: Moves;
  updatedFiles: GameFiles;
  changes: ReferenceChange[];
}

function folderPaths(nodes: TreeNode[], out: string[] = ['']): string[] {
  for (const n of nodes) {
    if (n.type === 'folder') {
      out.push(n.path);
      folderPaths(n.children, out);
    }
  }
  return out;
}

export interface FileOpsDeps {
  ws: Ws;
  tree: TreeNode[];
  onChange: (files: GameFiles, assets: GameAssets) => void;
  setFolders: (update: (f: string[]) => string[]) => void;
  uploadAssets: (pending: Record<string, PendingAsset>) => Promise<GameAssets>;
  onNotice: (message: string, severity?: 'info' | 'error') => void;
  /** Mở file trong tab. */
  openFile: (path: string, pin: boolean) => void;
  /** Mở các thư mục cha để thấy mục này. */
  reveal: (path: string) => void;
  /** Sau khi đổi tên/di chuyển: cập nhật tab, thư mục đang mở, mục đang chọn. */
  onMoved: (from: string, to: string, moves: Moves) => void;
  onDeleted: (path: string) => void;
}

/**
 * Các thao tác với file trong cây thư mục (tạo, đổi tên, di chuyển, xóa, tải lên) và các hộp thoại của chúng.
 * Trả về các hàm để gọi từ cây, menu, bảng lệnh, và `dialogs` để đặt vào giao diện.
 */
export function useFileOps(deps: FileOpsDeps) {
  const { ws, tree, onChange, setFolders, uploadAssets, onNotice, openFile, reveal, onMoved, onDeleted } = deps;
  const { files, assets } = ws;
  const [menu, setMenu] = useState<{ path: string; position: { top: number; left: number } } | null>(null);
  const [pathDialog, setPathDialog] = useState<PathDialogState>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const uploadFolder = useRef('');

  const commitMove = (from: string, to: string, next: Ws, moves: Moves, updatedFiles?: GameFiles) => {
    onChange(updatedFiles ?? next.files, next.assets);
    setFolders(() => next.folders);
    onMoved(from, to, moves);
  };

  /** Đổi tên/di chuyển; có chỗ trỏ tới thì hỏi có cập nhật không (giống VS Code). */
  const move = (from: string, to: string) => {
    if (from === to) return;
    let result: { ws: Ws; moves: Moves };
    try {
      result = moveEntry(ws, from, to);
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e), 'error');
      return;
    }
    const refs = updateReferences(ws, result.ws, result.moves);
    if (refs.changes.length) {
      setPendingMove({ from, to, next: result.ws, moves: result.moves, updatedFiles: refs.files, changes: refs.changes });
    } else {
      commitMove(from, to, result.ws, result.moves);
    }
  };

  const remove = (path: string) => {
    try {
      const next = deleteEntry(ws, path);
      onChange(next.files, next.assets);
      setFolders(() => next.folders);
      onDeleted(path);
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  /** Tải file từ máy vào thư mục: code đọc thành chữ, ảnh/âm thanh/font tải lên kho (luôn trong assets/). */
  const upload = async (list: File[], folder: string) => {
    const newFiles: GameFiles = {};
    const pending: Record<string, PendingAsset> = {};
    const rejected: string[] = [];
    let redirected = false;
    const inAssets = folder === ASSETS_DIR || isAssetPath(folder);
    for (const file of list) {
      const mime = assetMime(file.name);
      if (mime) {
        const dest = inAssets ? folder : ASSETS_DIR;
        if (dest !== folder) redirected = true;
        const path = joinPath(dest, file.name);
        if (!GAME_PATH.test(path)) rejected.push(file.name);
        else pending[assetKey(path)] = { blob: file, mime };
      } else if (isCodePath(file.name) && !inAssets) {
        const path = joinPath(folder, file.name);
        if (!GAME_PATH.test(path)) rejected.push(file.name);
        else newFiles[path] = await file.text();
      } else {
        rejected.push(file.name);
      }
    }
    try {
      const uploaded = Object.keys(pending).length ? await uploadAssets(pending) : {};
      const count = Object.keys(newFiles).length + Object.keys(uploaded).length;
      if (count) {
        onChange({ ...files, ...newFiles }, { ...assets, ...uploaded });
        const first = Object.keys(newFiles)[0];
        if (first) openFile(first, true);
        else {
          const firstAsset = Object.keys(uploaded)[0];
          if (firstAsset) reveal(joinPath(ASSETS_DIR, firstAsset));
        }
      }
      if (rejected.length) onNotice(t('cms.workspace.uploadRejected', { list: rejected.join(', ') }), 'error');
      else if (redirected) onNotice(t('cms.workspace.uploadRedirected'));
      else if (count) onNotice(t('cms.workspace.uploaded', { count }));
    } catch (e) {
      onNotice(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  const startUpload = (folder: string) => {
    uploadFolder.current = folder;
    uploadInput.current?.click();
  };

  const newFile = (folder: string) => setPathDialog({ mode: 'newFile', folder });
  const newFolder = (folder: string) => setPathDialog({ mode: 'newFolder', folder });
  const rename = (path: string) => path !== ASSETS_DIR && setPathDialog({ mode: 'rename', path, isFolder: !fileExists(ws, path) });
  const askDelete = (path: string) => path !== ASSETS_DIR && setDeleting(path);

  // ---------- Menu ----------

  const menuPath = menu?.path ?? null;
  const menuTarget =
    menuPath === null
      ? null
      : {
          type: menuPath === '' ? ('root' as const) : fileExists(ws, menuPath) ? ('file' as const) : ('folder' as const),
          inAssets: menuPath === ASSETS_DIR || isAssetPath(menuPath),
          locked: menuPath === ASSETS_DIR,
        };

  const onAction = (action: EntryAction) => {
    if (menuPath === null) return;
    const isFile = fileExists(ws, menuPath);
    const folder = isFile ? dirName(menuPath) : menuPath;
    switch (action) {
      case 'open':
        openFile(menuPath, true);
        break;
      case 'newFile':
        newFile(folder);
        break;
      case 'newFolder':
        newFolder(folder);
        break;
      case 'upload':
        startUpload(folder);
        break;
      case 'rename':
        rename(menuPath);
        break;
      case 'move':
        setMoving(menuPath);
        break;
      case 'copyPath':
        void copyText(menuPath).then(() => onNotice(t('cms.workspace.copied')));
        break;
      case 'copyUsage':
        void copyText(`asset('${assetKey(menuPath)}')`).then(() => onNotice(t('cms.workspace.copiedUsage')));
        break;
      case 'delete':
        askDelete(menuPath);
        break;
    }
  };

  const dialogs: ReactNode = (
    <>
      <input
        ref={uploadInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (list.length) void upload(list, uploadFolder.current);
        }}
      />

      <EntryMenu position={menu?.position ?? null} target={menuTarget} onAction={onAction} onClose={() => setMenu(null)} />

      <PathDialog
        open={pathDialog !== null}
        title={
          pathDialog?.mode === 'newFile'
            ? t('cms.workspace.newFile')
            : pathDialog?.mode === 'newFolder'
              ? t('cms.workspace.newFolder')
              : t('cms.workspace.rename')
        }
        label={
          pathDialog?.mode === 'newFolder' || (pathDialog?.mode === 'rename' && pathDialog.isFolder)
            ? t('cms.workspace.folderPath')
            : t('cms.workspace.filePath')
        }
        initial={!pathDialog ? '' : pathDialog.mode === 'rename' ? pathDialog.path : pathDialog.folder ? `${pathDialog.folder}/` : ''}
        selection={(() => {
          if (pathDialog?.mode !== 'rename') return undefined;
          const start = pathDialog.path.lastIndexOf('/') + 1;
          const dot = pathDialog.isFolder ? -1 : pathDialog.path.lastIndexOf('.');
          return [start, dot > start ? dot : pathDialog.path.length] as [number, number];
        })()}
        hint={pathDialog?.mode === 'newFile' ? t('cms.workspace.newFileHint') : t('cms.workspace.pathHint')}
        confirmLabel={pathDialog?.mode === 'rename' ? t('cms.workspace.rename') : t('cms.workspace.create')}
        validate={(value) => {
          if (!pathDialog) return null;
          if (pathDialog.mode === 'newFile') return checkFilePath(ws, value, 'code');
          if (pathDialog.mode === 'newFolder') return checkFolderPath(ws, value);
          return pathDialog.isFolder ? checkFolderPath(ws, value, pathDialog.path) : checkFilePath(ws, value, kindOf(pathDialog.path), pathDialog.path);
        }}
        onConfirm={(value) => {
          const d = pathDialog;
          setPathDialog(null);
          if (!d) return;
          if (d.mode === 'newFile') {
            onChange({ ...files, [value]: '' }, assets);
            openFile(value, true);
          } else if (d.mode === 'newFolder') {
            setFolders((f) => [...f, value]);
            reveal(joinPath(value, 'x'));
          } else {
            move(d.path, value);
          }
        }}
        onClose={() => setPathDialog(null)}
      />

      <MoveDialog
        path={moving}
        folders={folderPaths(tree)}
        validate={(folder) => {
          if (!moving) return null;
          try {
            moveEntry(ws, moving, joinPath(folder, baseName(moving)));
            return null;
          } catch (e) {
            return e instanceof Error ? e.message : String(e);
          }
        }}
        onMove={(folder) => {
          const from = moving;
          setMoving(null);
          if (from) move(from, joinPath(folder, baseName(from)));
        }}
        onClose={() => setMoving(null)}
      />

      <ReferenceUpdateDialog
        changes={pendingMove?.changes ?? null}
        onUpdate={() => {
          if (pendingMove) commitMove(pendingMove.from, pendingMove.to, pendingMove.next, pendingMove.moves, pendingMove.updatedFiles);
          setPendingMove(null);
        }}
        onSkip={() => {
          if (pendingMove) commitMove(pendingMove.from, pendingMove.to, pendingMove.next, pendingMove.moves);
          setPendingMove(null);
        }}
        onCancel={() => setPendingMove(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={t('cms.workspace.deleteTitle', { name: deleting ? baseName(deleting) : '' })}
        text={
          deleting && !fileExists(ws, deleting)
            ? t('cms.workspace.deleteFolderText', { count: allFiles(ws).filter((p) => p.startsWith(`${deleting}/`)).length })
            : deleting && isAssetPath(deleting)
              ? t('cms.workspace.deleteAssetText')
              : t('cms.workspace.deleteFileText')
        }
        confirmLabel={t('cms.workspace.delete')}
        danger
        onConfirm={() => {
          if (deleting) remove(deleting);
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );

  return {
    move,
    upload,
    startUpload,
    newFile,
    newFolder,
    rename,
    askDelete,
    openMenu: (path: string, position: { top: number; left: number }) => setMenu({ path, position }),
    dialogs,
  };
}
