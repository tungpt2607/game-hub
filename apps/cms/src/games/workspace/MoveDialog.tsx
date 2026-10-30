'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { t } from '@opes/i18n';
import { FileIcon } from './FileIcon';
import { baseName, dirName } from './vfs';

interface Props {
  /** Mục cần di chuyển; null = đóng. */
  path: string | null;
  /** Các thư mục có thể chọn ('' = thư mục gốc). */
  folders: string[];
  /** Kiểm tra thư mục đích: trả về câu báo lỗi, hoặc null nếu chuyển được. */
  validate: (folder: string) => string | null;
  onMove: (folder: string) => void;
  onClose: () => void;
}

/** Chọn thư mục đích để di chuyển (dùng trên điện thoại thay cho kéo thả, và từ menu). */
export function MoveDialog({ path, folders, validate, onMove, onClose }: Props) {
  return (
    <Dialog open={path !== null} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('cms.workspace.moveTitle', { name: path ? baseName(path) : '' })}</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <List dense>
          {folders.map((folder) => {
            const current = path !== null && dirName(path) === folder;
            const problem = current ? null : validate(folder);
            return (
              <ListItemButton
                key={folder || '/'}
                disabled={current || Boolean(problem)}
                onClick={() => onMove(folder)}
                sx={{ pl: 2 + (folder ? folder.split('/').length : 0) * 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <FileIcon path={folder} folder />
                </ListItemIcon>
                <ListItemText
                  primary={folder ? baseName(folder) : t('cms.workspace.rootFolder')}
                  secondary={current ? t('cms.workspace.currentFolder') : problem}
                />
              </ListItemButton>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
}
