'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';
import type { TemplateDraft } from './useTemplateDraft';

/** Sửa tên, nhãn hàng, ghi chú của template (áp vào bản nháp, lưu khi bấm Lưu nháp). */
export function TemplateInfoDialog({
  open,
  draft,
  onClose,
  onApply,
}: {
  open: boolean;
  draft: TemplateDraft;
  onClose: () => void;
  onApply: (info: Pick<TemplateDraft, 'name' | 'brandName' | 'note'>) => void;
}) {
  const [name, setName] = useState(draft.name);
  const [brandName, setBrandName] = useState(draft.brandName);
  const [note, setNote] = useState(draft.note);
  useEffect(() => {
    if (!open) return;
    setName(draft.name);
    setBrandName(draft.brandName);
    setNote(draft.note);
  }, [open, draft.name, draft.brandName, draft.note]);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('cms.templates.editInfo')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('cms.templates.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            error={!name.trim()}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            label={t('cms.templates.brandName')}
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            label={t('cms.templates.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <Typography variant="body2" color="text.secondary">
            {t('cms.templates.infoHint')}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!name.trim()}
          onClick={() => onApply({ name: name.trim(), brandName, note })}
        >
          {t('cms.templates.applyInfo')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
