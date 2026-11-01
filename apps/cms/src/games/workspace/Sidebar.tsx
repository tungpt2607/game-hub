import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined';
import FolderCopyOutlined from '@mui/icons-material/FolderCopyOutlined';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import NoteAddOutlined from '@mui/icons-material/NoteAddOutlined';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { t } from '@opes/i18n';
import type { GameFiles } from '../types';
import { FileTree } from './FileTree';
import { SearchView } from './search/SearchView';
import type { useFileOps } from './useFileOps';
import { baseName, dirName, joinPath, type TreeNode } from './vfs';

type SidebarView = 'files' | 'search';

/** Hai nút chuyển giữa cây thư mục và tìm trong cả game. */
function SidebarSwitch({
  view,
  onShowFiles,
  onShowSearch,
}: {
  view: SidebarView;
  onShowFiles: () => void;
  onShowSearch: () => void;
}) {
  return (
    <Stack direction="row" sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
      {(
        [
          [
            'files',
            <FolderCopyOutlined key="f" sx={{ fontSize: 18 }} />,
            t('cms.workspace.explorer'),
          ],
          ['search', <ManageSearchIcon key="s" sx={{ fontSize: 18 }} />, t('cms.editor.searchAll')],
        ] as const
      ).map(([id, icon, label]) => (
        <Tooltip key={id} title={label}>
          <IconButton
            size="small"
            onClick={id === 'search' ? onShowSearch : onShowFiles}
            aria-label={label}
            aria-pressed={view === id}
            sx={{
              borderRadius: 0,
              flex: 1,
              py: 0.75,
              borderBottom: 2,
              borderColor: view === id ? 'primary.main' : 'transparent',
            }}
          >
            {icon}
          </IconButton>
        </Tooltip>
      ))}
    </Stack>
  );
}

/**
 * Cột trái của khu sửa code: cây thư mục (tạo file / thư mục, tải lên, kéo thả) hoặc tìm và thay
 * trong cả game.
 */
export function Sidebar({
  view,
  onShowFiles,
  onShowSearch,
  files,
  searchFocus,
  onOpenMatch,
  onReplaceAll,
  tree,
  selected,
  expanded,
  errorCount,
  onToggle,
  openFile,
  setSelected,
  fileOps,
  selectedFolder,
  onCollapseAll,
}: {
  view: SidebarView;
  onShowFiles: () => void;
  onShowSearch: () => void;
  files: GameFiles;
  /** Tăng để đặt con trỏ vào ô tìm kiếm. */
  searchFocus: number;
  onOpenMatch: (path: string, from: number, to: number) => void;
  onReplaceAll: (next: GameFiles, count: number) => void;
  tree: TreeNode[];
  selected: string | null;
  expanded: Set<string>;
  errorCount: (path: string) => number;
  onToggle: (path: string) => void;
  openFile: (path: string, pin: boolean) => void;
  setSelected: (path: string) => void;
  fileOps: ReturnType<typeof useFileOps>;
  /** Thư mục để tạo / tải file vào (theo mục đang chọn). */
  selectedFolder: (allowAssets?: boolean) => string;
  onCollapseAll: () => void;
}) {
  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <SidebarSwitch view={view} onShowFiles={onShowFiles} onShowSearch={onShowSearch} />
      {view === 'search' ? (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <SearchView
            files={files}
            focusToken={searchFocus}
            onOpen={onOpenMatch}
            onReplace={onReplaceAll}
          />
        </Box>
      ) : (
        <>
          <Stack
            direction="row"
            alignItems="center"
            sx={{ pl: 1.5, pr: 0.5, height: 32, flexShrink: 0 }}
          >
            <Typography variant="overline" sx={{ flexGrow: 1, lineHeight: 1, fontWeight: 700 }}>
              {t('cms.workspace.explorer')}
            </Typography>
            <Tooltip title={t('cms.workspace.newFile')}>
              <IconButton
                size="small"
                onClick={() => fileOps.newFile(selectedFolder())}
                aria-label={t('cms.workspace.newFile')}
              >
                <NoteAddOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('cms.workspace.newFolder')}>
              <IconButton
                size="small"
                onClick={() => fileOps.newFolder(selectedFolder(true))}
                aria-label={t('cms.workspace.newFolder')}
              >
                <CreateNewFolderOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('cms.workspace.upload')}>
              <IconButton
                size="small"
                onClick={() => fileOps.startUpload(selectedFolder(true))}
                aria-label={t('cms.workspace.upload')}
              >
                <UploadFileOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('cms.workspace.collapseAll')}>
              <IconButton
                size="small"
                onClick={onCollapseAll}
                aria-label={t('cms.workspace.collapseAll')}
              >
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
              onToggle={onToggle}
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
}
