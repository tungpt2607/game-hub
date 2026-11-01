'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import type { PreviewLink, TemplateDetail } from '@opes/contracts';
import { t } from '@opes/i18n';
import { api, ApiRequestError, handleAuthError } from '../../lib/api';
import { endOfDay } from './link-format';

export function CreateLinkDialog({
  open,
  template,
  onClose,
  onCreated,
}: {
  open: boolean;
  template: TemplateDetail;
  onClose: () => void;
  onCreated: (link: PreviewLink) => void;
}) {
  const hasPublished = template.publishedVersion > 0;
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState<'live' | 'snapshot'>('live');
  const [snapshotSource, setSnapshotSource] = useState<'published' | 'draft'>('published');
  const [custom, setCustom] = useState(false);
  const [slug, setSlug] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expires, setExpires] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel('');
    setMode('live');
    setSnapshotSource(hasPublished ? 'published' : 'draft');
    setCustom(false);
    setSlug('');
    setUsePassword(false);
    setPassword('');
    setExpires('');
    setError(null);
    setFields({});
    setBusy(false);
  }, [open, hasPublished]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const res = await api<{ link: PreviewLink }>(`/preview-links?templateId=${template.id}`, {
        method: 'POST',
        body: {
          label,
          mode,
          snapshotSource: mode === 'snapshot' ? snapshotSource : undefined,
          slug: custom ? slug : null,
          password: usePassword ? password : null,
          expiresAt: endOfDay(expires),
        },
      });
      onCreated(res.link);
    } catch (err) {
      if (handleAuthError(err)) return;
      if (err instanceof ApiRequestError) {
        setError(err.message);
        setFields(err.fields);
      } else setError(t('common.networkError'));
    } finally {
      setBusy(false);
    }
  }

  const draftHasErrors = Object.keys(template.errors).length > 0;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{t('cms.links.createTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label={t('cms.links.label')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              helperText={t('cms.links.labelHint')}
              autoFocus
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <Box>
              <FormLabel>{t('cms.links.modeQuestion')}</FormLabel>
              <RadioGroup
                value={mode}
                onChange={(e) => setMode(e.target.value as 'live' | 'snapshot')}
              >
                <FormControlLabel
                  value="live"
                  control={<Radio />}
                  label={t('cms.links.modeLiveHint')}
                />
                <FormControlLabel
                  value="snapshot"
                  control={<Radio />}
                  label={t('cms.links.modeSnapshotHint')}
                />
              </RadioGroup>
              {mode === 'snapshot' && (
                <RadioGroup
                  value={snapshotSource}
                  onChange={(e) => setSnapshotSource(e.target.value as 'published' | 'draft')}
                  sx={{ pl: 4 }}
                >
                  <FormControlLabel
                    value="published"
                    control={<Radio size="small" />}
                    disabled={!hasPublished}
                    label={
                      hasPublished
                        ? t('cms.links.fromPublished', { version: template.publishedVersion })
                        : t('cms.links.fromPublishedNone')
                    }
                  />
                  <FormControlLabel
                    value="draft"
                    control={<Radio size="small" />}
                    disabled={draftHasErrors}
                    label={
                      draftHasErrors ? t('cms.links.fromDraftInvalid') : t('cms.links.fromDraft')
                    }
                  />
                </RadioGroup>
              )}
            </Box>
            <Box>
              <FormControlLabel
                control={<Switch checked={custom} onChange={(e) => setCustom(e.target.checked)} />}
                label={t('cms.links.customSlug')}
              />
              {custom && (
                <TextField
                  fullWidth
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="tet-2027-sua-sen"
                  error={Boolean(fields.slug)}
                  helperText={fields.slug ?? t('cms.links.slugHint')}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">/try/</InputAdornment>,
                    },
                    htmlInput: { maxLength: 60, spellCheck: false, autoCapitalize: 'off' },
                  }}
                />
              )}
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                  />
                }
                label={t('cms.links.usePassword')}
              />
              {usePassword && (
                <TextField
                  fullWidth
                  label={t('cms.links.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={Boolean(fields.password)}
                  helperText={fields.password ?? t('cms.links.passwordHint')}
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
            disabled={busy || (usePassword && password.length < 4) || (custom && !slug)}
          >
            {t('cms.links.createSubmit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
