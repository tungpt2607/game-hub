'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { t } from '@opes/i18n';

/** Hộp xác nhận cho thao tác cần cân nhắc (đặt lại mật khẩu, vô hiệu hóa, xóa…). */
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{text}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} variant="contained" color={danger ? 'error' : 'primary'} disabled={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
