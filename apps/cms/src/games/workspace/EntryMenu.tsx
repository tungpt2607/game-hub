'use client';

import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import DriveFileMoveOutlined from '@mui/icons-material/DriveFileMoveOutlined';
import DriveFileRenameOutline from '@mui/icons-material/DriveFileRenameOutline';
import NoteAddOutlined from '@mui/icons-material/NoteAddOutlined';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import type { ReactNode } from 'react';
import { t } from '@opes/i18n';

export type EntryAction = 'open' | 'newFile' | 'newFolder' | 'upload' | 'rename' | 'move' | 'copyPath' | 'copyUsage' | 'delete';

interface Props {
  /** Vị trí mở menu; null = đóng. */
  position: { top: number; left: number } | null;
  /** Mục đang chọn: 'file' / 'folder' / 'root' (vùng trống của cây), và có nằm trong assets/ không. */
  target: { type: 'file' | 'folder' | 'root'; inAssets: boolean; locked: boolean } | null;
  onAction: (action: EntryAction) => void;
  onClose: () => void;
}

/** Menu chuột phải / nút ⋯ của cây thư mục. Mục hiện ra tùy loại (file, thư mục, file kèm). */
export function EntryMenu({ position, target, onAction, onClose }: Props) {
  if (!target) return null;
  const items: (EntryAction | '-')[] = [];
  if (target.type === 'file') items.push('open', '-');
  if (target.type !== 'file') {
    if (!target.inAssets) items.push('newFile');
    items.push('newFolder', 'upload', '-');
  }
  if (target.type !== 'root' && !target.locked) items.push('rename', 'move');
  if (target.type !== 'root') items.push('copyPath');
  if (target.type === 'file' && target.inAssets) items.push('copyUsage');
  if (target.type !== 'root' && !target.locked) items.push('-', 'delete');

  const meta: Record<EntryAction, { icon: ReactNode; label: string; hint?: string }> = {
    open: { icon: <OpenInNewOutlined fontSize="small" />, label: t('cms.workspace.open') },
    newFile: { icon: <NoteAddOutlined fontSize="small" />, label: t('cms.workspace.newFile') },
    newFolder: { icon: <CreateNewFolderOutlined fontSize="small" />, label: t('cms.workspace.newFolder') },
    upload: { icon: <UploadFileOutlined fontSize="small" />, label: t('cms.workspace.upload') },
    rename: { icon: <DriveFileRenameOutline fontSize="small" />, label: t('cms.workspace.rename'), hint: 'F2' },
    move: { icon: <DriveFileMoveOutlined fontSize="small" />, label: t('cms.workspace.move') },
    copyPath: { icon: <ContentCopyOutlined fontSize="small" />, label: t('cms.workspace.copyPath') },
    copyUsage: { icon: <ContentCopyOutlined fontSize="small" />, label: t('cms.workspace.copyUsage') },
    delete: { icon: <DeleteOutline fontSize="small" />, label: t('cms.workspace.delete'), hint: 'Delete' },
  };

  return (
    <Menu
      open={position !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={position ?? undefined}
      slotProps={{ list: { dense: true } }}
    >
      {items
        .filter((item, i) => !(item === '-' && (i === items.length - 1 || items[i + 1] === '-')))
        .map((item, i) =>
          item === '-' ? (
            <Divider key={`d${i}`} />
          ) : (
            <MenuItem
              key={item}
              onClick={() => {
                onClose();
                onAction(item);
              }}
              sx={item === 'delete' ? { color: 'error.main' } : undefined}
            >
              <ListItemIcon sx={item === 'delete' ? { color: 'error.main' } : undefined}>{meta[item].icon}</ListItemIcon>
              <ListItemText>{meta[item].label}</ListItemText>
              {meta[item].hint && (
                <ListItemText sx={{ textAlign: 'right', ml: 3, color: 'text.secondary', flex: 'none' }}>{meta[item].hint}</ListItemText>
              )}
            </MenuItem>
          ),
        )}
    </Menu>
  );
}
