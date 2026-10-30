'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { t } from '@opes/i18n';

interface Props {
  open: boolean;
  title: string;
  label: string;
  /** Giá trị ban đầu (ví dụ đường dẫn hiện tại khi đổi tên). */
  initial: string;
  /** Phần được chọn sẵn khi mở (ví dụ tên file không gồm đuôi), [đầu, cuối). */
  selection?: [number, number];
  hint?: string;
  confirmLabel: string;
  /** Kiểm tra giá trị: trả về câu báo lỗi, hoặc null nếu hợp lệ. */
  validate: (value: string) => string | null;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

/** Hộp nhập một đường dẫn (tạo file, tạo thư mục, đổi tên, di chuyển). */
export function PathDialog({ open, title, label, initial, selection, hint, confirmLabel, validate, onConfirm, onClose }: Props) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);
  const clean = value.trim();
  const problem = clean && clean !== initial ? validate(clean) : null;
  const disabled = !clean || clean === initial || Boolean(problem);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!disabled) onConfirm(clean);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={label}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => {
              if (selection) e.target.setSelectionRange(selection[0], selection[1]);
            }}
            error={Boolean(problem)}
            helperText={problem ?? hint ?? ' '}
            slotProps={{ htmlInput: { spellCheck: false, autoCapitalize: 'off', autoCorrect: 'off', style: { fontFamily: 'monospace' } } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={disabled}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
