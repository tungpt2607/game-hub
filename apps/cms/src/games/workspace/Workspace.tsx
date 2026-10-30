'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import NoteAddOutlined from '@mui/icons-material/NoteAddOutlined';
import RedoIcon from '@mui/icons-material/Redo';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UndoIcon from '@mui/icons-material/Undo';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { GAME_PATH } from '@opes/contracts';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { copyText } from '../../lib/clipboard';
import type { BuildError } from '../compiler';
import type { GameAssets, GameFiles, PendingAsset } from '../types';
import { assetMime, isCodePath } from '../zip';
import { AssetPreview } from './AssetPreview';
import { CodeEditor, type EditorApi } from './CodeEditor';
import { EditorTabs } from './EditorTabs';
import { EntryMenu, type EntryAction } from './EntryMenu';
import { FileTree } from './FileTree';
import { MoveDialog } from './MoveDialog';
import { PathDialog } from './PathDialog';
import { QuickOpen } from './QuickOpen';
import { ReferenceUpdateDialog } from './ReferenceUpdateDialog';
import { useTabs } from './useTabs';
import {
  ASSETS_DIR,
  allFiles,
  assetKey,
  baseName,
  buildTree,
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

export interface WorkspaceHandle {
  /** Mở file và nhảy tới dòng (từ 1), cột (từ 0). Dùng khi bấm vào lỗi biên dịch. */
  jump(file: string | null, line: number, column: number): void;
}

export interface WorkspaceProps {
  files: GameFiles;
  assets: GameAssets;
  /** Code lúc lưu nháp gần nhất, để đánh dấu ● file đã sửa. */
  savedFiles: GameFiles;
  errors: BuildError[];
  height: number | string;
  onChange: (files: GameFiles, assets: GameAssets) => void;
  /** Tải file kèm lên kho (khóa = đường dẫn trong assets/). */
  uploadAssets: (pending: Record<string, PendingAsset>) => Promise<GameAssets>;
  /** Ctrl+S */
  onSave: () => void;
  onNotice: (message: string, severity?: 'info' | 'error') => void;
}

type PathDialogState =
  | { mode: 'newFile' | 'newFolder'; folder: string }
  | { mode: 'rename'; path: string; folder: boolean }
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

const ancestors = (path: string) => {
  const out: string[] = [];
  for (let d = dirName(path); d; d = dirName(d)) out.push(d);
  return out;
};

/**
 * Khu sửa code giống VS Code: cây thư mục (code + assets/), hàng tab, trình sửa code, xem trước file kèm,
 * menu chuột phải / ⋯, kéo thả, đổi tên có cập nhật chỗ trỏ tới, Ctrl+P, Ctrl+S.
 * Trên điện thoại cây thư mục nằm trong ngăn trượt ra từ nút ☰.
 */
export const Workspace = forwardRef<WorkspaceHandle, WorkspaceProps>(function Workspace(props, ref) {
  const { files, assets, savedFiles, errors, height, onChange, uploadAssets, onSave, onNotice } = props;
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('md'));

  const [folders, setFolders] = useState<string[]>([]);
  const ws = useMemo<Ws>(() => ({ files, assets, folders }), [files, assets, folders]);
  const tree = useMemo(() => buildTree(ws), [ws]);
  const tabs = useTabs(files['schema.ts'] !== undefined ? 'schema.ts' : null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ path: string; position: { top: number; left: number } } | null>(null);
  const [pathDialog, setPathDialog] = useState<PathDialogState>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const editor = useRef<EditorApi | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const uploadFolder = useRef('');
  const lastCode = useRef<string | null>(null);

  // ---------- Trạng thái suy ra ----------

  const errorCount = useCallback(
    (path: string) => (path ? errors.filter((e) => e.file === path || (e.file?.startsWith(`${path}/`) ?? false)).length : 0),
    [errors],
  );
  const isDirty = useCallback(
    (path: string) => !isAssetPath(path) && files[path] !== undefined && files[path] !== savedFiles[path],
    [files, savedFiles],
  );
  const active = tabs.active;
  if (active && !isAssetPath(active) && files[active] !== undefined) lastCode.current = active;
  const codePath = lastCode.current && files[lastCode.current] !== undefined ? lastCode.current : null;

  // File bị xóa/thay (tải .zip, lấy phiên bản cũ…): đóng tab không còn file.
  const { keepOnly } = tabs;
  useEffect(() => {
    keepOnly((p) => fileExists(ws, p));
  }, [ws, keepOnly]);

  // ---------- Mở file ----------

  const reveal = (path: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      for (const a of ancestors(path)) next.add(a);
      return next;
    });

  const openFile = (path: string, pin: boolean) => {
    tabs.open(path, pin);
    setSelected(path);
    reveal(path);
    if (narrow) setDrawer(false);
  };

  useImperativeHandle(ref, () => ({
    jump(file, line, column) {
      if (file && files[file] !== undefined) openFile(file, true);
      setTimeout(() => {
        if (line > 0) editor.current?.goTo(line, column);
      }, 60);
    },
  }));

  // ---------- Phím tắt ----------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'p' && !e.shiftKey) {
        e.preventDefault();
        setQuickOpen(true);
      } else if (key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSave]);

  // ---------- Thay đổi file ----------

  /** Áp dụng đổi tên/di chuyển `from` → `to` (file hoặc thư mục); giữ trạng thái mở của các thư mục con. */
  const commitMove = (from: string, to: string, next: Ws, moves: Moves, updatedFiles?: GameFiles) => {
    onChange(updatedFiles ?? next.files, next.assets);
    setFolders(next.folders);
    tabs.rename(moves);
    const rename = (p: string) => (p === from || p.startsWith(`${from}/`) ? to + p.slice(from.length) : p);
    setExpanded((s) => {
      const out = new Set([...s].map(rename));
      for (const a of ancestors(to)) out.add(a);
      return out;
    });
    setSelected((cur) => (cur ? rename(cur) : cur));
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
      setFolders(next.folders);
      if (selected === path || selected?.startsWith(`${path}/`)) setSelected(null);
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
    for (const file of list) {
      const mime = assetMime(file.name);
      if (mime) {
        const dest = folder === ASSETS_DIR || isAssetPath(folder) ? folder : ASSETS_DIR;
        if (dest !== folder) redirected = true;
        const path = joinPath(dest, file.name);
        if (!GAME_PATH.test(path)) rejected.push(file.name);
        else pending[assetKey(path)] = { blob: file, mime };
      } else if (isCodePath(file.name) && !(folder === ASSETS_DIR || isAssetPath(folder))) {
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
        setPathDialog({ mode: 'newFile', folder });
        break;
      case 'newFolder':
        setPathDialog({ mode: 'newFolder', folder });
        break;
      case 'upload':
        startUpload(folder);
        break;
      case 'rename':
        setPathDialog({ mode: 'rename', path: menuPath, folder: !isFile });
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
        setDeleting(menuPath);
        break;
    }
  };

  // ---------- Giao diện ----------

  const explorer = (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" alignItems="center" sx={{ pl: 1.5, pr: 0.5, height: 36, flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="overline" sx={{ flexGrow: 1, lineHeight: 1, fontWeight: 700 }}>
          {t('cms.workspace.explorer')}
        </Typography>
        <Tooltip title={t('cms.workspace.newFile')}>
          <IconButton size="small" onClick={() => setPathDialog({ mode: 'newFile', folder: selectedFolder() })} aria-label={t('cms.workspace.newFile')}>
            <NoteAddOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('cms.workspace.newFolder')}>
          <IconButton size="small" onClick={() => setPathDialog({ mode: 'newFolder', folder: selectedFolder(true) })} aria-label={t('cms.workspace.newFolder')}>
            <CreateNewFolderOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('cms.workspace.upload')}>
          <IconButton size="small" onClick={() => startUpload(selectedFolder(true))} aria-label={t('cms.workspace.upload')}>
            <UploadFileOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('cms.workspace.collapseAll')}>
          <IconButton size="small" onClick={() => setExpanded(new Set())} aria-label={t('cms.workspace.collapseAll')}>
            <UnfoldLessIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
        <FileTree
          nodes={tree}
          selected={selected}
          expanded={expanded}
          errorCount={errorCount}
          onToggle={(p) =>
            setExpanded((s) => {
              const next = new Set(s);
              if (next.has(p)) next.delete(p);
              else next.add(p);
              return next;
            })
          }
          onOpen={openFile}
          onSelect={setSelected}
          onMenu={(path, position) => setMenu({ path, position })}
          onRename={(p) => p !== ASSETS_DIR && setPathDialog({ mode: 'rename', path: p, folder: !fileExists(ws, p) })}
          onDelete={(p) => p !== ASSETS_DIR && setDeleting(p)}
          onMove={(from, folder) => {
            if (dirName(from) !== folder) move(from, joinPath(folder, baseName(from)));
          }}
          onDropFiles={(list, folder) => void upload(list, folder)}
        />
      </Box>
    </Stack>
  );

  /** Thư mục đang chọn trong cây (file thì lấy thư mục chứa nó). Tạo file code không đặt vào assets/. */
  function selectedFolder(allowAssets = false): string {
    if (!selected) return '';
    const folder = fileExists(ws, selected) ? dirName(selected) : selected;
    if (!allowAssets && (folder === ASSETS_DIR || isAssetPath(folder))) return '';
    return folder;
  }

  const activeAsset = active && isAssetPath(active) ? assets[assetKey(active)] : undefined;

  return (
    <>
      <Box sx={{ display: 'flex', height, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper' }}>
        {!narrow && <Box sx={{ width: 250, flexShrink: 0, borderRight: 1, borderColor: 'divider' }}>{explorer}</Box>}
        <Stack sx={{ flexGrow: 1, minWidth: 0, bgcolor: '#1E1E1E' }}>
          <Stack direction="row" alignItems="stretch" sx={{ bgcolor: '#252526', flexShrink: 0 }}>
            {narrow && (
              <IconButton onClick={() => setDrawer(true)} aria-label={t('cms.workspace.explorer')} sx={{ color: '#CCC', borderRadius: 0 }}>
                <MenuIcon fontSize="small" />
              </IconButton>
            )}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <EditorTabs
                tabs={tabs.tabs}
                active={active}
                isDirty={isDirty}
                errorCount={errorCount}
                onActivate={(p) => {
                  tabs.activate(p);
                  setSelected(p);
                }}
                onPin={tabs.pin}
                onClose={tabs.close}
              />
            </Box>
            {active && !isAssetPath(active) && (
              <Stack direction="row" alignItems="center" sx={{ px: 0.5, color: '#CCC' }}>
                <Tooltip title={t('cms.games.undo')}>
                  <IconButton size="small" onClick={() => editor.current?.undo()} aria-label={t('cms.games.undo')} sx={{ color: 'inherit' }}>
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('cms.games.redo')}>
                  <IconButton size="small" onClick={() => editor.current?.redo()} aria-label={t('cms.games.redo')} sx={{ color: 'inherit' }}>
                    <RedoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('cms.games.search')}>
                  <IconButton size="small" onClick={() => editor.current?.toggleSearch()} aria-label={t('cms.games.search')} sx={{ color: 'inherit' }}>
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Stack>
          <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
            {codePath && (
              <Box sx={{ position: 'absolute', inset: 0, display: active === codePath ? 'block' : 'none' }}>
                <CodeEditor
                  path={codePath}
                  value={files[codePath] ?? ''}
                  height="100%"
                  onChange={(v) => {
                    if (v === files[codePath]) return;
                    tabs.pin(codePath);
                    onChange({ ...files, [codePath]: v }, assets);
                  }}
                  onMount={(api) => {
                    editor.current = api;
                  }}
                />
              </Box>
            )}
            {active && activeAsset && (
              <Box sx={{ position: 'absolute', inset: 0 }}>
                <AssetPreview
                  path={active}
                  asset={activeAsset}
                  onCopyUsage={() => void copyText(`asset('${assetKey(active)}')`).then(() => onNotice(t('cms.workspace.copiedUsage')))}
                />
              </Box>
            )}
            {!active && (
              <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ position: 'absolute', inset: 0, color: 'rgba(255,255,255,0.5)', p: 3, textAlign: 'center' }}>
                <Typography variant="body2">{t('cms.workspace.empty')}</Typography>
                <Typography variant="caption">{t('cms.workspace.shortcuts')}</Typography>
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>

      {narrow && (
        <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)} slotProps={{ paper: { sx: { width: 'min(320px, 85vw)' } } }}>
          {explorer}
        </Drawer>
      )}

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
        label={pathDialog?.mode === 'newFolder' || (pathDialog?.mode === 'rename' && pathDialog.folder) ? t('cms.workspace.folderPath') : t('cms.workspace.filePath')}
        initial={
          pathDialog?.mode === 'rename' ? pathDialog.path : pathDialog?.folder ? `${pathDialog.folder}/` : ''
        }
        selection={(() => {
          if (pathDialog?.mode !== 'rename') return undefined;
          const start = pathDialog.path.lastIndexOf('/') + 1;
          const dot = pathDialog.folder ? -1 : pathDialog.path.lastIndexOf('.');
          return [start, dot > start ? dot : pathDialog.path.length];
        })()}
        hint={pathDialog?.mode === 'newFile' ? t('cms.workspace.newFileHint') : t('cms.workspace.pathHint')}
        confirmLabel={pathDialog?.mode === 'rename' ? t('cms.workspace.rename') : t('cms.workspace.create')}
        validate={(value) => {
          if (!pathDialog) return null;
          if (pathDialog.mode === 'newFile') return checkFilePath(ws, value, 'code');
          if (pathDialog.mode === 'newFolder') return checkFolderPath(ws, value);
          return pathDialog.folder ? checkFolderPath(ws, value, pathDialog.path) : checkFilePath(ws, value, kindOf(pathDialog.path), pathDialog.path);
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
            setSelected(value);
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

      <QuickOpen open={quickOpen} paths={allFiles(ws)} onOpen={(p) => openFile(p, true)} onClose={() => setQuickOpen(false)} />
    </>
  );
});
