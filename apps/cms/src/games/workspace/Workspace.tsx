'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { t } from '@opes/i18n';
import { copyText } from '../../lib/clipboard';
import type { BuildError } from '../compiler';
import type { GameAssets, GameFiles, PendingAsset } from '../types';
import { type EditorApi } from './CodeEditor';
import { buildCommands } from './commands';
import { createCursorStore } from './cursorStore';
import { EditorTabs } from './EditorTabs';
import { BottomPanel } from './panels/BottomPanel';
import { Breadcrumbs } from './panels/Breadcrumbs';
import { StatusBar } from './panels/StatusBar';
import { PathDialog } from './PathDialog';
import { useTypeScript } from './ts/useTypeScript';
import { useFileOps } from './useFileOps';
import { useLocalSetting } from './useLocalSetting';
import { useTabs } from './useTabs';
import { useBottomPanel } from './panels/useBottomPanel';
import { useEditorNavigation } from './useEditorNavigation';
import { EditorArea } from './EditorArea';
import { useTreeState } from './useTreeState';
import { WorkspacePickers, type PickerKind } from './WorkspacePickers';
import { EditorToolbar } from './EditorToolbar';
import { Sidebar } from './Sidebar';
import { useCodeActions } from './useCodeActions';
import { useCommandShortcuts } from './useCommandShortcuts';
import { useProblems } from './panels/useProblems';
import { IDENTIFIER, formatChangedFiles, isEditedFile, isLib, offsetAt } from './workspace-utils';
import {
  allFiles,
  assetKey,
  buildTree,
  fileExists,
  isAssetPath,
  type Workspace as Ws,
} from './vfs';

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

/**
 * Khu sửa code giống VS Code. Ghép các phần: cây thư mục và tìm trong cả game (cột trái), hàng tab, thanh
 * đường dẫn, trình sửa code có gợi ý TypeScript, xem trước file kèm, bảng Vấn đề/Tham chiếu, thanh trạng thái,
 * bảng lệnh. Trên điện thoại cột trái nằm trong ngăn trượt ra từ nút ☰.
 */
export const Workspace = forwardRef<WorkspaceHandle, WorkspaceProps>(
  function Workspace(props, ref) {
    const {
      files,
      assets,
      savedFiles,
      errors,
      compiling,
      height,
      onChange,
      uploadAssets,
      onSave,
      onNotice,
    } = props;
    const theme = useTheme();
    const narrow = useMediaQuery(theme.breakpoints.down('md'));

    const [folders, setFolders] = useState<string[]>([]);
    const ws = useMemo<Ws>(() => ({ files, assets, folders }), [files, assets, folders]);
    const tree = useMemo(() => buildTree(ws), [ws]);
    const tabs = useTabs(files['schema.ts'] !== undefined ? 'schema.ts' : null);
    const treeState = useTreeState(ws);
    const { selected, setSelected, reveal } = treeState;
    const [sidebar, setSidebar] = useState<'files' | 'search'>('files');
    const [searchFocus, setSearchFocus] = useState(0);
    const [drawer, setDrawer] = useState(false);
    const [quick, setQuick] = useState<PickerKind | null>(null);
    const [libTexts, setLibTexts] = useState<Record<string, string>>({});
    const [formatOnSave, setFormatOnSave] = useLocalSetting('opes:dinh-dang-khi-luu', false);
    const editor = useRef<EditorApi | null>(null);
    const lastCode = useRef<string | null>(null);
    const cursorStore = useMemo(() => createCursorStore(), []);

    // ---------- File đang mở ----------

    const active = tabs.active;
    const isCodeTab = (p: string | null): p is string =>
      !!p && (isLib(p) || (!isAssetPath(p) && files[p] !== undefined));
    if (isCodeTab(active)) lastCode.current = active;
    const codePath = isCodeTab(lastCode.current) ? lastCode.current : null;
    const textOf = useCallback(
      (p: string): string | null => (isLib(p) ? (libTexts[p] ?? null) : (files[p] ?? null)),
      [files, libTexts],
    );

    const ts = useTypeScript(files, assets, codePath, codePath ? textOf(codePath) : null);
    const bottom = useBottomPanel(errors.length);

    // File bị xóa/thay (tải .zip, lấy phiên bản cũ…): đóng tab không còn file.
    const { keepOnly } = tabs;
    useEffect(() => {
      keepOnly((p) => isLib(p) || fileExists(ws, p));
    }, [ws, keepOnly]);

    const openFile = (path: string, pin: boolean) => {
      tabs.open(path, pin);
      setSelected(path);
      if (!isLib(path)) reveal(path);
      if (narrow) setDrawer(false);
    };

    /** File thư viện (chỉ đọc) chưa có nội dung thì tải trước khi mở. */
    const ensureLibText = async (path: string) => {
      if (!isLib(path) || libTexts[path] !== undefined) return true;
      const text = await ts.client.request({ type: 'libText', path }).catch(() => null);
      if (text === null) return false;
      setLibTexts((m) => ({ ...m, [path]: text }));
      return true;
    };
    const { navigate, goBack, goForward, atCursor, remember, canBack } = useEditorNavigation({
      editor,
      codePath,
      openFile,
      prepare: ensureLibText,
    });

    // ---------- Thao tác TypeScript ----------

    const code = useCodeActions({
      client: ts.client,
      textOf,
      files,
      assets,
      codePath,
      editor,
      navigate,
      onChange,
      onNotice,
      showReferences: bottom.showReferences,
    });

    useImperativeHandle(ref, () => ({
      jump(file, line, column) {
        const text = file ? files[file] : undefined;
        if (!file || text === undefined) return;
        void navigate(file, offsetAt(text, line, column));
      },
      async prepareSave() {
        if (!formatOnSave) return files;
        const result = await formatChangedFiles(files, savedFiles, code.formatText);
        if (result.changed) onChange(result.files, assets);
        return result.files;
      },
    }));

    // ---------- Lỗi ----------

    const { problems, errorCount, errorTotal, warningTotal } = useProblems(
      errors,
      ts.diagnostics,
      files,
    );

    const isDirty = useCallback(
      (path: string) => isEditedFile(path, files, savedFiles),
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
        treeState.moved(from, to);
      },
      onDeleted: treeState.deleted,
    });

    // ---------- Lệnh và phím tắt ----------

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
      format: () => void code.formatDocument(),
      toggleFormatOnSave: () => setFormatOnSave(!formatOnSave),
      formatOnSave,
      definition: atCursor((p, pos) => void code.goToDefinition(p, pos)),
      references: atCursor((p, pos) => void code.findReferences(p, pos)),
      rename: atCursor((p, pos) => void code.renameSymbol(p, pos)),
      back: goBack,
      forward: goForward,
      findInFile: () => editor.current?.toggleSearch(),
      toggleProblems: () => bottom.toggleProblems,
      closeTab: () => active && tabs.close(active),
      closeAllTabs: () => keepOnly(() => false),
      newFile: () => fileOps.newFile(treeState.selectedFolder()),
      newFolder: () => fileOps.newFolder(treeState.selectedFolder(true)),
      collapseAll: treeState.collapseAll,
      palette: () => setQuick('commands'),
    });

    useCommandShortcuts(commands);

    // ---------- Giao diện ----------

    const explorer = (
      <Sidebar
        view={sidebar}
        onShowFiles={() => setSidebar('files')}
        onShowSearch={openSearchView}
        files={files}
        searchFocus={searchFocus}
        onOpenMatch={(path, from, to) => void navigate(path, from, to)}
        onReplaceAll={(next, count) => {
          onChange(next, assets);
          onNotice(t('cms.editor.replacedAll', { count }));
        }}
        tree={tree}
        selected={selected}
        expanded={treeState.expanded}
        errorCount={errorCount}
        onToggle={treeState.toggle}
        openFile={openFile}
        setSelected={setSelected}
        fileOps={fileOps}
        selectedFolder={treeState.selectedFolder}
        onCollapseAll={treeState.collapseAll}
      />
    );

    const activeAsset = active && isAssetPath(active) ? assets[assetKey(active)] : undefined;
    const canEdit = isCodeTab(active) && !isLib(active);
    return (
      <>
        <Stack
          sx={{
            height,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
            {!narrow && (
              <Box sx={{ width: 260, flexShrink: 0, borderRight: 1, borderColor: 'divider' }}>
                {explorer}
              </Box>
            )}
            <Stack sx={{ flexGrow: 1, minWidth: 0, bgcolor: '#1E1E1E' }}>
              <Stack
                direction="row"
                alignItems="stretch"
                sx={{ bgcolor: '#252526', flexShrink: 0 }}
              >
                {narrow && (
                  <IconButton
                    onClick={() => setDrawer(true)}
                    aria-label={t('cms.workspace.explorer')}
                    sx={{ color: '#CCC', borderRadius: 0 }}
                  >
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
                <EditorToolbar
                  onUndo={canEdit ? () => editor.current?.undo() : undefined}
                  onRedo={canEdit ? () => editor.current?.redo() : undefined}
                  onSearch={isCodeTab(active) ? () => editor.current?.toggleSearch() : undefined}
                  onDefinition={
                    narrow && isCodeTab(active)
                      ? atCursor((p, pos) => void code.goToDefinition(p, pos))
                      : undefined
                  }
                  onBack={narrow ? goBack : undefined}
                  canBack={canBack}
                  onPalette={() => setQuick('commands')}
                />
              </Stack>
              {isCodeTab(active) && (
                <Breadcrumbs
                  path={active}
                  outline={active === codePath ? ts.outline : []}
                  cursorStore={cursorStore}
                  onShowOutline={() => setQuick('outline')}
                />
              )}
              <EditorArea
                codePath={codePath}
                active={active}
                activeAsset={activeAsset}
                value={codePath ? (textOf(codePath) ?? '') : ''}
                shared={code.shared}
                onEdit={(v) => {
                  if (!codePath || isLib(codePath) || v === files[codePath]) return;
                  tabs.pin(codePath);
                  onChange({ ...files, [codePath]: v }, assets);
                }}
                onCursor={cursorStore.set}
                onMount={(api) => {
                  editor.current = api;
                }}
                onCopyUsage={() => {
                  if (active)
                    void copyText(`asset('${assetKey(active)}')`).then(() =>
                      onNotice(t('cms.workspace.copiedUsage')),
                    );
                }}
              />
            </Stack>
          </Box>
          {bottom.panel.open && (
            <BottomPanel
              tab={bottom.panel.tab}
              onTab={bottom.showTab}
              problems={problems}
              references={bottom.references}
              height={narrow ? 200 : 180}
              onOpenProblem={(p) => {
                const text = p.path ? files[p.path] : undefined;
                if (!p.path || text === undefined) return;
                void navigate(p.path, offsetAt(text, p.line, p.column));
              }}
              onOpenReference={(r) => void navigate(r.path, r.from, r.to)}
              onClose={bottom.close}
            />
          )}
          <StatusBar
            cursorStore={cursorStore}
            errors={errorTotal}
            warnings={warningTotal}
            compiling={compiling}
            tsStatus={ts.status}
            formatOnSave={formatOnSave}
            onToggleProblems={bottom.toggleProblems}
            onToggleFormatOnSave={() => setFormatOnSave(!formatOnSave)}
          />
        </Stack>

        {narrow && (
          <Drawer
            anchor="left"
            open={drawer}
            onClose={() => setDrawer(false)}
            slotProps={{ paper: { sx: { width: 'min(340px, 88vw)' } } }}
          >
            {explorer}
          </Drawer>
        )}

        {fileOps.dialogs}

        <PathDialog
          open={code.renaming !== null}
          title={t('cms.editor.renameSymbolTitle', { name: code.renaming?.name ?? '' })}
          label={t('cms.editor.newName')}
          initial={code.renaming?.name ?? ''}
          selection={code.renaming ? [0, code.renaming.name.length] : undefined}
          hint={t('cms.editor.renameSymbolHint')}
          confirmLabel={t('cms.workspace.rename')}
          validate={(v) => (IDENTIFIER.test(v) ? null : t('cms.editor.badIdentifier'))}
          onConfirm={(v) => void code.applyRename(v)}
          onClose={code.cancelRename}
        />

        <WorkspacePickers
          open={quick}
          onClose={() => setQuick(null)}
          paths={allFiles(ws)}
          onOpenFile={(p) => {
            remember();
            openFile(p, true);
          }}
          commands={commands}
          outline={ts.outline}
          onPickOutline={(o) => {
            if (codePath) void navigate(codePath, o.from);
          }}
        />
      </>
    );
  },
);
