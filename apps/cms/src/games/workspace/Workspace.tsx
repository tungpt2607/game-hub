'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined';
import FolderCopyOutlined from '@mui/icons-material/FolderCopyOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NoteAddOutlined from '@mui/icons-material/NoteAddOutlined';
import RedoIcon from '@mui/icons-material/Redo';
import SearchIcon from '@mui/icons-material/Search';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import ShortcutIcon from '@mui/icons-material/Shortcut';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UndoIcon from '@mui/icons-material/Undo';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { t } from '@opes/i18n';
import { copyText } from '../../lib/clipboard';
import type { BuildError } from '../compiler';
import type { GameAssets, GameFiles, PendingAsset } from '../types';
import { AssetPreview } from './AssetPreview';
import { CodeEditor, type EditorApi } from './CodeEditor';
import { buildCommands } from './commands';
import { createCursorStore } from './cursorStore';
import { EditorTabs } from './EditorTabs';
import { FileTree } from './FileTree';
import { BottomPanel, type PanelTab, type Problem, type ReferenceItem } from './panels/BottomPanel';
import { Breadcrumbs } from './panels/Breadcrumbs';
import { StatusBar } from './panels/StatusBar';
import { PathDialog } from './PathDialog';
import { QuickOpen } from './QuickOpen';
import { QuickPick } from './QuickPick';
import { SearchView } from './search/SearchView';
import { tsExtensions, type TsBridge } from './ts/extensions';
import type { TsTextEdit } from './ts/protocol';
import { useTypeScript } from './ts/useTypeScript';
import { useFileOps } from './useFileOps';
import { useLocalSetting } from './useLocalSetting';
import { useNavHistory, type NavLocation } from './useNavHistory';
import { useTabs } from './useTabs';
import { ASSETS_DIR, allFiles, assetKey, baseName, buildTree, dirName, fileExists, isAssetPath, joinPath, type Workspace as Ws } from './vfs';

export interface WorkspaceHandle {
  /** Mở file và nhảy tới dòng (từ 1), cột (từ 0). */
  jump(file: string | null, line: number, column: number): void;
  /** Trước khi lưu nháp: định dạng các file đã sửa nếu bật "tự định dạng khi lưu". Trả về code sẽ lưu. */
  prepareSave(): Promise<GameFiles>;
}

export interface WorkspaceProps {
  files: GameFiles;
  assets: GameAssets;
  /** Code lúc lưu nháp gần nhất, để đánh dấu ● file đã sửa. */
  savedFiles: GameFiles;
  /** Lỗi biên dịch (esbuild). */
  errors: BuildError[];
  compiling: boolean;
  height: number | string;
  onChange: (files: GameFiles, assets: GameAssets) => void;
  /** Tải file kèm lên kho (khóa = đường dẫn trong assets/). */
  uploadAssets: (pending: Record<string, PendingAsset>) => Promise<GameAssets>;
  /** Ctrl+S */
  onSave: () => void;
  onNotice: (message: string, severity?: 'info' | 'error') => void;
}

const ancestors = (path: string) => {
  const out: string[] = [];
  for (let d = dirName(path); d; d = dirName(d)) out.push(d);
  return out;
};

const isLib = (path: string) => path.startsWith('lib:');

/** Tên tiếng Việt của loại ký hiệu (hàm, hằng…); loại lạ thì giữ nguyên. */
const kindLabel = (kind: string) => {
  const key = `cms.editor.kind.${kind.replace(/\s+/g, '_')}`;
  const label = t(key);
  return label === key ? kind : label;
};
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const FORMATTABLE = /\.(tsx?|jsx?|json|md)$/;

/** Dòng (từ 1) và cột (từ 0) của vị trí `pos` trong `text`. */
function lineColumn(text: string, pos: number) {
  let line = 1;
  let start = 0;
  for (let i = text.indexOf('\n'); i >= 0 && i < pos; i = text.indexOf('\n', i + 1)) {
    line++;
    start = i + 1;
  }
  return { line, column: pos - start };
}

/** Áp các sửa đổi (đổi tên ký hiệu…) vào nội dung file, từ cuối lên đầu để vị trí không lệch. */
function applyEdits(files: GameFiles, edits: TsTextEdit[]): GameFiles {
  const next = { ...files };
  const byFile = new Map<string, TsTextEdit[]>();
  for (const e of edits) byFile.set(e.path, [...(byFile.get(e.path) ?? []), e]);
  for (const [path, list] of byFile) {
    let text = next[path];
    if (text === undefined) continue;
    for (const e of [...list].sort((a, b) => b.from - a.from)) text = text.slice(0, e.from) + e.insert + text.slice(e.to);
    next[path] = text;
  }
  return next;
}

/**
 * Khu sửa code giống VS Code. Ghép các phần: cây thư mục và tìm trong cả game (cột trái), hàng tab, thanh
 * đường dẫn, trình sửa code có gợi ý TypeScript, xem trước file kèm, bảng Vấn đề/Tham chiếu, thanh trạng thái,
 * bảng lệnh. Trên điện thoại cột trái nằm trong ngăn trượt ra từ nút ☰.
 */
export const Workspace = forwardRef<WorkspaceHandle, WorkspaceProps>(function Workspace(props, ref) {
  const { files, assets, savedFiles, errors, compiling, height, onChange, uploadAssets, onSave, onNotice } = props;
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('md'));

  const [folders, setFolders] = useState<string[]>([]);
  const ws = useMemo<Ws>(() => ({ files, assets, folders }), [files, assets, folders]);
  const tree = useMemo(() => buildTree(ws), [ws]);
  const tabs = useTabs(files['schema.ts'] !== undefined ? 'schema.ts' : null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState<'files' | 'search'>('files');
  const [searchFocus, setSearchFocus] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [quick, setQuick] = useState<'files' | 'commands' | 'outline' | null>(null);
  const [panel, setPanel] = useState<{ open: boolean; tab: PanelTab }>({ open: false, tab: 'problems' });
  const [references, setReferences] = useState<{ title: string; items: ReferenceItem[] } | null>(null);
  const [renaming, setRenaming] = useState<{ path: string; pos: number; name: string } | null>(null);
  const [libTexts, setLibTexts] = useState<Record<string, string>>({});
  const [formatOnSave, setFormatOnSave] = useLocalSetting('opes:dinh-dang-khi-luu', false);
  const [, setJumpTick] = useState(0);
  const editor = useRef<EditorApi | null>(null);
  const lastCode = useRef<string | null>(null);
  const pendingJump = useRef<{ path: string; from: number; to?: number } | null>(null);
  const cursorStore = useMemo(() => createCursorStore(), []);
  const nav = useNavHistory();

  // ---------- File đang mở ----------

  const active = tabs.active;
  const isCodeTab = (p: string | null): p is string => !!p && (isLib(p) || (!isAssetPath(p) && files[p] !== undefined));
  if (isCodeTab(active)) lastCode.current = active;
  const codePath = isCodeTab(lastCode.current) ? lastCode.current : null;
  const textOf = useCallback((p: string): string | null => (isLib(p) ? (libTexts[p] ?? null) : (files[p] ?? null)), [files, libTexts]);

  const ts = useTypeScript(files, assets, codePath, codePath ? textOf(codePath) : null);

  // File bị xóa/thay (tải .zip, lấy phiên bản cũ…): đóng tab không còn file.
  const { keepOnly } = tabs;
  useEffect(() => {
    keepOnly((p) => isLib(p) || fileExists(ws, p));
  }, [ws, keepOnly]);

  // Nhảy tới vị trí sau khi trình sửa đã mở đúng file (chạy sau mỗi lần vẽ, rất nhẹ).
  useEffect(() => {
    const jump = pendingJump.current;
    if (jump && jump.path === codePath && editor.current) {
      pendingJump.current = null;
      editor.current.goToOffset(jump.from, jump.to);
    }
  });

  const reveal = useCallback(
    (path: string) =>
      setExpanded((s) => {
        const next = new Set(s);
        for (const a of ancestors(path)) next.add(a);
        return next;
      }),
    [],
  );

  const openFile = (path: string, pin: boolean) => {
    tabs.open(path, pin);
    setSelected(path);
    if (!isLib(path)) reveal(path);
    if (narrow) setDrawer(false);
  };

  const here = (): NavLocation | null => (editor.current && codePath ? editor.current.cursor() : null);

  /** Mở file (kể cả file thư viện chỉ đọc) và nhảy tới vị trí; lưu vị trí cũ để Alt+← quay lại. */
  const navigate = async (path: string, from: number, to?: number, record = true) => {
    if (record) nav.push(here());
    if (isLib(path) && libTexts[path] === undefined) {
      const text = await ts.client.request({ type: 'libText', path }).catch(() => null);
      if (text === null) return;
      setLibTexts((m) => ({ ...m, [path]: text }));
    }
    pendingJump.current = { path, from, to };
    openFile(path, true);
    setJumpTick((n) => n + 1);
  };

  // ---------- Thao tác TypeScript ----------

  const goToDefinition = async (path: string, pos: number) => {
    const text = textOf(path);
    if (text === null) return;
    const defs = await ts.client.request({ type: 'definition', path, text, pos }).catch(() => []);
    const def = defs[0];
    if (!def) onNotice(t('cms.editor.noDefinition'));
    else void navigate(def.path, def.from, def.to);
  };

  const findReferences = async (path: string, pos: number) => {
    const text = textOf(path);
    if (text === null) return;
    const refs = await ts.client.request({ type: 'references', path, text, pos }).catch(() => []);
    if (!refs.length) {
      onNotice(t('cms.editor.noReferences'));
      return;
    }
    const word = text.slice(pos).match(/^[\w$]*/)![0] || text.slice(0, pos).match(/[\w$]*$/)![0];
    setReferences({ title: t('cms.editor.referencesTitle', { name: word, count: refs.length }), items: refs });
    setPanel({ open: true, tab: 'references' });
  };

  const renameSymbol = async (path: string, pos: number) => {
    const text = textOf(path);
    if (text === null || isLib(path)) return;
    const info = await ts.client.request({ type: 'renameInfo', path, text, pos }).catch(() => null);
    if (!info?.ok) onNotice(info?.message || t('cms.editor.cannotRename'), 'error');
    else setRenaming({ path, pos, name: info.name });
  };

  const applyRename = async (newName: string) => {
    const r = renaming;
    setRenaming(null);
    if (!r) return;
    const text = textOf(r.path);
    if (text === null) return;
    const result = await ts.client.request({ type: 'rename', path: r.path, text, pos: r.pos, newName }).catch(() => null);
    if (!result?.ok) {
      onNotice(result?.message || t('cms.editor.cannotRename'), 'error');
      return;
    }
    onChange(applyEdits(files, result.edits), assets);
    const fileCount = new Set(result.edits.map((e) => e.path)).size;
    onNotice(t('cms.editor.renamed', { count: result.edits.length, files: fileCount }));
  };

  const formatText = async (path: string, text: string) => ts.client.request({ type: 'format', path, text });

  const formatDocument = async () => {
    if (!codePath || isLib(codePath) || !FORMATTABLE.test(codePath)) return;
    try {
      editor.current?.replaceAll(await formatText(codePath, files[codePath] ?? ''));
    } catch (e) {
      onNotice(t('cms.editor.formatFailed', { message: e instanceof Error ? e.message.split('\n')[0] : String(e) }), 'error');
    }
  };

  // Phần TypeScript của trình sửa: tạo một lần; các hàm gọi qua ref nên luôn dùng trạng thái mới nhất.
  const actions = useRef({ goToDefinition, findReferences, renameSymbol, formatDocument });
  actions.current = { goToDefinition, findReferences, renameSymbol, formatDocument };
  const shared = useMemo(() => {
    const bridge: TsBridge = {
      client: ts.client,
      goToDefinition: (p, pos) => void actions.current.goToDefinition(p, pos),
      findReferences: (p, pos) => void actions.current.findReferences(p, pos),
      renameSymbol: (p, pos) => void actions.current.renameSymbol(p, pos),
      formatDocument: () => void actions.current.formatDocument(),
    };
    return tsExtensions(bridge);
  }, [ts.client]);

  useImperativeHandle(ref, () => ({
    jump(file, line, column) {
      if (!file || files[file] === undefined) return;
      const text = files[file];
      let pos = 0;
      for (let l = 1; l < line; l++) {
        const nl = text.indexOf('\n', pos);
        if (nl < 0) break;
        pos = nl + 1;
      }
      void navigate(file, pos + Math.max(0, column));
    },
    async prepareSave() {
      if (!formatOnSave) return files;
      const next = { ...files };
      let changed = false;
      for (const [path, text] of Object.entries(files)) {
        if (text === savedFiles[path] || !FORMATTABLE.test(path)) continue;
        try {
          const formatted = await formatText(path, text);
          if (formatted !== text) {
            next[path] = formatted;
            changed = true;
          }
        } catch {
          // File còn lỗi cú pháp: lưu nguyên như đang viết.
        }
      }
      if (changed) onChange(next, assets);
      return next;
    },
  }));

  // ---------- Lỗi ----------

  const problems = useMemo<Problem[]>(() => {
    const list: Problem[] = errors.map((e) => ({ path: e.file, line: e.line, column: e.column, message: e.text, severity: 'error', source: 'build' }));
    for (const [path, diags] of Object.entries(ts.diagnostics)) {
      const text = files[path] ?? '';
      for (const d of diags) {
        if (d.severity === 'info') continue;
        list.push({ path, ...lineColumn(text, d.from), message: d.message, severity: d.severity, source: 'ts' });
      }
    }
    return list;
  }, [errors, ts.diagnostics, files]);

  const errorCount = useCallback(
    (path: string) =>
      path ? problems.filter((p) => p.severity === 'error' && (p.path === path || (p.path?.startsWith(`${path}/`) ?? false))).length : 0,
    [problems],
  );
  const errorTotal = problems.filter((p) => p.severity === 'error').length;
  const warningTotal = problems.length - errorTotal;

  // Có lỗi biên dịch mới (chặn phát hành): mở bảng Vấn đề.
  const buildErrors = errors.length;
  const prevBuildErrors = useRef(0);
  useEffect(() => {
    if (buildErrors > 0 && prevBuildErrors.current === 0) setPanel({ open: true, tab: 'problems' });
    prevBuildErrors.current = buildErrors;
  }, [buildErrors]);

  const isDirty = useCallback(
    (path: string) => !isAssetPath(path) && !isLib(path) && files[path] !== undefined && files[path] !== savedFiles[path],
    [files, savedFiles],
  );

  // ---------- Thao tác file ----------

  const fileOps = useFileOps({
    ws,
    tree,
    onChange,
    setFolders: (update) => setFolders(update),
    uploadAssets,
    onNotice,
    openFile,
    reveal,
    onMoved: (from, to, moves) => {
      tabs.rename(moves);
      const rename = (p: string) => (p === from || p.startsWith(`${from}/`) ? to + p.slice(from.length) : p);
      setExpanded((s) => {
        const out = new Set([...s].map(rename));
        for (const a of ancestors(to)) out.add(a);
        return out;
      });
      setSelected((cur) => (cur ? rename(cur) : cur));
    },
    onDeleted: (path) => setSelected((cur) => (cur === path || cur?.startsWith(`${path}/`) ? null : cur)),
  });

  /** Thư mục đang chọn trong cây (file thì lấy thư mục chứa nó). Tạo file code không đặt vào assets/. */
  const selectedFolder = (allowAssets = false): string => {
    if (!selected) return '';
    const folder = fileExists(ws, selected) ? dirName(selected) : selected;
    if (!allowAssets && (folder === ASSETS_DIR || isAssetPath(folder))) return '';
    return folder;
  };

  // ---------- Lệnh và phím tắt ----------

  const atCursor = (fn: (path: string, pos: number) => void) => () => {
    const c = here();
    if (c) fn(c.path, c.pos);
  };
  const goBack = () => {
    const target = nav.goBack(here());
    if (target) void navigate(target.path, target.pos, undefined, false);
  };
  const goForward = () => {
    const target = nav.goForward(here());
    if (target) void navigate(target.path, target.pos, undefined, false);
  };
  const openSearchView = () => {
    setSidebar('search');
    setSearchFocus((n) => n + 1);
    if (narrow) setDrawer(true);
  };

  const commands = buildCommands({
    save: onSave,
    quickOpen: () => setQuick('files'),
    searchAll: openSearchView,
    outline: () => setQuick('outline'),
    format: () => void formatDocument(),
    toggleFormatOnSave: () => setFormatOnSave(!formatOnSave),
    formatOnSave,
    definition: atCursor((p, pos) => void goToDefinition(p, pos)),
    references: atCursor((p, pos) => void findReferences(p, pos)),
    rename: atCursor((p, pos) => void renameSymbol(p, pos)),
    back: goBack,
    forward: goForward,
    findInFile: () => editor.current?.toggleSearch(),
    toggleProblems: () => setPanel((s) => ({ open: !s.open || s.tab !== 'problems', tab: 'problems' })),
    closeTab: () => active && tabs.close(active),
    closeAllTabs: () => keepOnly(() => false),
    newFile: () => fileOps.newFile(selectedFolder()),
    newFolder: () => fileOps.newFolder(selectedFolder(true)),
    collapseAll: () => setExpanded(new Set()),
    palette: () => setQuick('commands'),
  });

  const keyState = useRef({ commands, quick });
  keyState.current = { commands, quick };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const run = (id: string) => {
        e.preventDefault();
        keyState.current.commands.find((c) => c.id === id)?.run();
      };
      if (mod && !e.altKey && key === 'p') run(e.shiftKey ? 'commands' : 'quickOpen');
      else if (mod && !e.altKey && !e.shiftKey && key === 's') run('save');
      else if (mod && e.shiftKey && !e.altKey && key === 'f') run('searchAll');
      else if (mod && e.shiftKey && !e.altKey && key === 'o') run('outline');
      else if (e.altKey && !mod && e.key === 'ArrowLeft') run('back');
      else if (e.altKey && !mod && e.key === 'ArrowRight') run('forward');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- Giao diện ----------

  const sidebarSwitch = (
    <Stack direction="row" sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
      {(
        [
          ['files', <FolderCopyOutlined key="f" sx={{ fontSize: 18 }} />, t('cms.workspace.explorer')],
          ['search', <ManageSearchIcon key="s" sx={{ fontSize: 18 }} />, t('cms.editor.searchAll')],
        ] as const
      ).map(([id, icon, label]) => (
        <Tooltip key={id} title={label}>
          <IconButton
            size="small"
            onClick={() => (id === 'search' ? openSearchView() : setSidebar('files'))}
            aria-label={label}
            aria-pressed={sidebar === id}
            sx={{ borderRadius: 0, flex: 1, py: 0.75, borderBottom: 2, borderColor: sidebar === id ? 'primary.main' : 'transparent' }}
          >
            {icon}
          </IconButton>
        </Tooltip>
      ))}
    </Stack>
  );

  const explorer = (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      {sidebarSwitch}
      {sidebar === 'search' ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <SearchView
            files={files}
            focusToken={searchFocus}
            onOpen={(path, from, to) => void navigate(path, from, to)}
            onReplace={(next, count) => {
              onChange(next, assets);
              onNotice(t('cms.editor.replacedAll', { count }));
            }}
          />
        </Box>
      ) : (
        <>
          <Stack direction="row" alignItems="center" sx={{ pl: 1.5, pr: 0.5, height: 32, flexShrink: 0 }}>
            <Typography variant="overline" sx={{ flexGrow: 1, lineHeight: 1, fontWeight: 700 }}>
              {t('cms.workspace.explorer')}
            </Typography>
            <Tooltip title={t('cms.workspace.newFile')}>
              <IconButton size="small" onClick={() => fileOps.newFile(selectedFolder())} aria-label={t('cms.workspace.newFile')}>
                <NoteAddOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('cms.workspace.newFolder')}>
              <IconButton size="small" onClick={() => fileOps.newFolder(selectedFolder(true))} aria-label={t('cms.workspace.newFolder')}>
                <CreateNewFolderOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('cms.workspace.upload')}>
              <IconButton size="small" onClick={() => fileOps.startUpload(selectedFolder(true))} aria-label={t('cms.workspace.upload')}>
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
              onMenu={fileOps.openMenu}
              onRename={fileOps.rename}
              onDelete={fileOps.askDelete}
              onMove={(from, folder) => {
                if (dirName(from) !== folder) fileOps.move(from, joinPath(folder, baseName(from)));
              }}
              onDropFiles={(list, folder) => void fileOps.upload(list, folder)}
            />
          </Box>
        </>
      )}
    </Stack>
  );

  const activeAsset = active && isAssetPath(active) ? assets[assetKey(active)] : undefined;
  const toolButton = (label: string, icon: ReactNode, onClick: () => void, disabled = false) => (
    <Tooltip title={label}>
      <span>
        <IconButton size="small" onClick={onClick} aria-label={label} disabled={disabled} sx={{ color: 'inherit', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  const outlineItems = useMemo(
    () =>
      ts.outline.map((o, i) => ({
        id: String(i),
        label: o.name,
        description: kindLabel(o.kind),
        depth: o.depth,
        searchText: o.name,
      })),
    [ts.outline],
  );

  return (
    <>
      <Stack sx={{ height, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
          {!narrow && <Box sx={{ width: 260, flexShrink: 0, borderRight: 1, borderColor: 'divider' }}>{explorer}</Box>}
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
              <Stack direction="row" alignItems="center" sx={{ px: 0.5, color: '#CCC', flexShrink: 0 }}>
                {isCodeTab(active) && !isLib(active) && toolButton(t('cms.games.undo'), <UndoIcon fontSize="small" />, () => editor.current?.undo())}
                {isCodeTab(active) && !isLib(active) && toolButton(t('cms.games.redo'), <RedoIcon fontSize="small" />, () => editor.current?.redo())}
                {isCodeTab(active) && toolButton(t('cms.games.search'), <SearchIcon fontSize="small" />, () => editor.current?.toggleSearch())}
                {narrow && isCodeTab(active) && toolButton(t('cms.editor.goToDefinition'), <ShortcutIcon fontSize="small" />, atCursor((p, pos) => void goToDefinition(p, pos)))}
                {narrow && toolButton(t('cms.editor.back'), <ArrowBackIcon fontSize="small" />, goBack, !nav.canBack)}
                {toolButton(t('cms.editor.cmdPalette'), <MoreVertIcon fontSize="small" />, () => setQuick('commands'))}
              </Stack>
            </Stack>
            {isCodeTab(active) && <Breadcrumbs path={active} outline={active === codePath ? ts.outline : []} cursorStore={cursorStore} onShowOutline={() => setQuick('outline')} />}
            <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
              {codePath && (
                <Box sx={{ position: 'absolute', inset: 0, display: active === codePath ? 'block' : 'none' }}>
                  <CodeEditor
                    path={codePath}
                    value={textOf(codePath) ?? ''}
                    shared={shared}
                    height="100%"
                    onChange={(v) => {
                      if (isLib(codePath) || v === files[codePath]) return;
                      tabs.pin(codePath);
                      onChange({ ...files, [codePath]: v }, assets);
                    }}
                    onCursor={cursorStore.set}
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
        {panel.open && (
          <BottomPanel
            tab={panel.tab}
            onTab={(tab) => setPanel({ open: true, tab })}
            problems={problems}
            references={references}
            height={narrow ? 200 : 180}
            onOpenProblem={(p) => {
              if (!p.path || files[p.path] === undefined) return;
              const text = files[p.path];
              let pos = 0;
              for (let l = 1; l < p.line; l++) pos = text.indexOf('\n', pos) + 1;
              void navigate(p.path, pos + p.column);
            }}
            onOpenReference={(r) => void navigate(r.path, r.from, r.to)}
            onClose={() => setPanel((s) => ({ ...s, open: false }))}
          />
        )}
        <StatusBar
          cursorStore={cursorStore}
          errors={errorTotal}
          warnings={warningTotal}
          compiling={compiling}
          tsStatus={ts.status}
          formatOnSave={formatOnSave}
          onToggleProblems={() => setPanel((s) => ({ open: !s.open || s.tab !== 'problems', tab: 'problems' }))}
          onToggleFormatOnSave={() => setFormatOnSave(!formatOnSave)}
        />
      </Stack>

      {narrow && (
        <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)} slotProps={{ paper: { sx: { width: 'min(340px, 88vw)' } } }}>
          {explorer}
        </Drawer>
      )}

      {fileOps.dialogs}

      <PathDialog
        open={renaming !== null}
        title={t('cms.editor.renameSymbolTitle', { name: renaming?.name ?? '' })}
        label={t('cms.editor.newName')}
        initial={renaming?.name ?? ''}
        selection={renaming ? [0, renaming.name.length] : undefined}
        hint={t('cms.editor.renameSymbolHint')}
        confirmLabel={t('cms.workspace.rename')}
        validate={(v) => (IDENTIFIER.test(v) ? null : t('cms.editor.badIdentifier'))}
        onConfirm={(v) => void applyRename(v)}
        onClose={() => setRenaming(null)}
      />

      <QuickOpen
        open={quick === 'files'}
        paths={allFiles(ws)}
        onOpen={(p) => {
          nav.push(here());
          openFile(p, true);
        }}
        onClose={() => setQuick(null)}
      />
      <QuickPick
        open={quick === 'commands'}
        placeholder={t('cms.editor.cmdPlaceholder')}
        items={commands.map((c) => ({ id: c.id, label: c.label, hint: c.hint }))}
        onPick={(item) => commands.find((c) => c.id === item.id)?.run()}
        onClose={() => setQuick(null)}
      />
      <QuickPick
        open={quick === 'outline'}
        placeholder={t('cms.editor.outlinePlaceholder')}
        items={outlineItems}
        keepOrder
        onPick={(item) => {
          const o = ts.outline[Number(item.id)];
          if (o && codePath) void navigate(codePath, o.from);
        }}
        onClose={() => setQuick(null)}
      />
    </>
  );
});

