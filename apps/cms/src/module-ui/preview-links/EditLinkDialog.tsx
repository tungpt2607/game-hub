'use client';

import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { PreviewLink } from '@opes/contracts';
import { t } from '@opes/i18n';
import { api, handleAuthError, errorMessage } from '../../lib/api';
import { endOfDay, toDayInput } from './link-format';

export function EditLinkDialog({
  link,
  onClose,
  onSaved,
}: {
  link: PreviewLink;
  onClose: () => void;
  onSaved: (link: PreviewLink) => void;
}) {
  const [label, setLabel] = useState(link.label ?? '');
  const [passwordMode, setPasswordMode] = useState<'keep' | 'set' | 'remove'>(
    link.hasPassword ? 'keep' : 'remove',
  );
  const [password, setPassword] = useState('');
  const [expires, setExpires] = useState(toDayInput(link.expiresAt));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = { label, expiresAt: endOfDay(expires) };
    if (passwordMode === 'set') body.password = password;
    if (passwordMode === 'remove' && link.hasPassword) body.password = null;
    try {
      const res = await api<{ link: PreviewLink }>(`/preview-links/${link.id}`, {
        method: 'PATCH',
        body,
      });
      onSaved(res.link);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{t('cms.links.edit')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label={t('cms.links.label')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <Box>
              <FormLabel>{t('cms.links.password')}</FormLabel>
              <RadioGroup
                value={passwordMode}
                onChange={(e) => setPasswordMode(e.target.value as 'keep' | 'set' | 'remove')}
              >
                {link.hasPassword && (
                  <FormControlLabel
                    value="keep"
                    control={<Radio />}
                    label={t('cms.links.passwordKeep')}
                  />
                )}
                <FormControlLabel
                  value="set"
                  control={<Radio />}
                  label={
                    link.hasPassword ? t('cms.links.passwordChange') : t('cms.links.passwordSet')
                  }
                />
                <FormControlLabel
                  value="remove"
                  control={<Radio />}
                  label={
                    link.hasPassword ? t('cms.links.passwordRemove') : t('cms.links.passwordNone')
                  }
                />
              </RadioGroup>
              {passwordMode === 'set' && (
                <TextField
                  fullWidth
                  label={t('cms.links.newPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText={t('cms.links.passwordChangeHint')}
                  slotProps={{ htmlInput: { maxLength: 100, autoComplete: 'off' } }}
                />
              )}
            </Box>
            <TextField
              type="date"
              label={t('cms.links.expires')}
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              helperText={t('cms.links.expiresHint')}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ maxWidth: 260 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || (passwordMode === 'set' && password.length < 4)}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
