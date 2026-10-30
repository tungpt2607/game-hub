'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';
import type { ReferenceChange } from './vfs';

interface Props {
  /** Các file sẽ được sửa; null = đóng. */
  changes: ReferenceChange[] | null;
  /** Cập nhật cả các chỗ trỏ tới. */
  onUpdate: () => void;
  /** Chỉ đổi tên/di chuyển, không sửa code khác. */
  onSkip: () => void;
  onCancel: () => void;
}

/** Giống VS Code: hỏi có cập nhật các import và asset('...') trỏ tới file vừa đổi tên/di chuyển không. */
export function ReferenceUpdateDialog({ changes, onUpdate, onSkip, onCancel }: Props) {
  return (
    <Dialog open={changes !== null} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{t('cms.workspace.updateRefsTitle')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          {t('cms.workspace.updateRefsText')}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, fontFamily: 'monospace', fontSize: 13 }}>
          {(changes ?? []).map((c) => (
            <li key={c.file}>
              {c.file} <Typography component="span" variant="caption" color="text.secondary">({t('cms.workspace.places', { count: c.count })})</Typography>
            </li>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button onClick={onSkip}>{t('cms.workspace.updateRefsSkip')}</Button>
        <Button variant="contained" onClick={onUpdate} autoFocus>
          {t('cms.workspace.updateRefsConfirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
