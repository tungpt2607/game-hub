'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import QRCode from 'qrcode';
import type { PreviewLink, PreviewLinkListResponse, TemplateDetail } from '@opes/contracts';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { api, ApiRequestError, handleAuthError } from '../lib/api';
import { copyText } from '../lib/clipboard';

const formatDate = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const formatDay = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

/** Ô ngày (yyyy-mm-dd) → hết ngày đó theo giờ máy, dạng ISO. */
const endOfDay = (day: string) => (day ? new Date(`${day}T23:59:59`).toISOString() : null);
const toDayInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function modeLabel(link: PreviewLink) {
  if (link.mode === 'live') return t('cms.links.modeLive');
  return link.snapshotVersion !== null
    ? t('cms.links.modeSnapshotVersion', { version: link.snapshotVersion })
    : t('cms.links.modeSnapshotDraft');
}

export function PreviewLinksDialog({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template: TemplateDetail;
  onClose: () => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [links, setLinks] = useState<PreviewLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PreviewLink | null>(null);
  const [qr, setQr] = useState<PreviewLink | null>(null);
  const [toDelete, setToDelete] = useState<PreviewLink | null>(null);

  const fail = useCallback((e: unknown) => {
    if (handleAuthError(e)) return;
    setError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api<PreviewLinkListResponse>(`/preview-links?templateId=${template.id}`);
      setLinks(res.items);
    } catch (e) {
      fail(e);
      setLinks([]);
    }
  }, [template.id, fail]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNote(null);
    setLinks(null);
    void load();
  }, [open, load]);

  const patch = async (link: PreviewLink, body: Record<string, unknown>) => {
    try {
      const res = await api<{ link: PreviewLink }>(`/preview-links/${link.id}`, { method: 'PATCH', body });
      setLinks((prev) => prev?.map((l) => (l.id === link.id ? res.link : l)) ?? null);
    } catch (e) {
      fail(e);
    }
  };

  const copy = async (link: PreviewLink) => {
    const ok = await copyText(link.url);
    if (ok) setNote(t('cms.links.copied'));
    else setError(t('cms.links.copyFailed'));
  };

  const archived = template.status === 'archived';
  const now = Date.now();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <span>{t('cms.links.title')}</span>
          {!archived && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
              {t('cms.links.create')}
            </Button>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {archived && <Alert severity="warning">{t('cms.links.archived')}</Alert>}
          {!archived && template.publishedVersion === 0 && <Alert severity="info">{t('cms.links.notPublished')}</Alert>}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {note && (
            <Alert severity="success" onClose={() => setNote(null)}>
              {note}
            </Alert>
          )}
          {links === null && <LinearProgress />}
          {links?.length === 0 && <Typography color="text.secondary">{t('cms.links.empty')}</Typography>}
          {links?.map((link) => {
            const expired = link.expiresAt !== null && new Date(link.expiresAt).getTime() <= now;
            return (
              <Paper key={link.id} variant="outlined" sx={{ p: 2, opacity: link.disabled || expired ? 0.7 : 1 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography fontWeight={700}>{link.label ?? t('cms.links.unnamed')}</Typography>
                    <Chip size="small" label={modeLabel(link)} color={link.mode === 'live' ? 'primary' : 'default'} variant="outlined" />
                    {link.hasPassword && <Chip size="small" icon={<LockOutlined />} label={t('cms.links.hasPassword')} />}
                    {link.expiresAt && (
                      <Chip
                        size="small"
                        color={expired ? 'error' : 'default'}
                        label={expired ? t('cms.links.expired') : t('cms.links.expiresOn', { date: formatDay(link.expiresAt) })}
                      />
                    )}
                    {link.disabled && <Chip size="small" color="error" label={t('cms.links.off')} />}
                  </Stack>
                  <Typography variant="body2" sx={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', wordBreak: 'break-all' }}>
                    {link.url}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('cms.links.views', { count: link.viewCount })}
                    {link.lastViewedAt ? ` · ${t('cms.links.lastViewed', { date: formatDate(link.lastViewedAt) })}` : ''}
                    {` · ${t('cms.links.createdAt', { date: formatDate(link.createdAt) })}`}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => void copy(link)}>
                      {t('common.copy')}
                    </Button>
                    <Button size="small" startIcon={<OpenInNewIcon />} href={link.url} target="_blank" rel="noopener">
                      {t('cms.links.open')}
                    </Button>
                    <Button size="small" startIcon={<QrCode2Icon />} onClick={() => setQr(link)}>
                      {t('cms.links.qr')}
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={!link.disabled}
                          onChange={(e) => void patch(link, { disabled: !e.target.checked })}
                          disabled={archived}
                        />
                      }
                      label={link.disabled ? t('cms.links.off') : t('cms.links.on')}
                    />
                    <Tooltip title={t('cms.links.edit')}>
                      <span>
                        <IconButton size="small" onClick={() => setEditing(link)} disabled={archived} aria-label={t('cms.links.edit')}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={t('cms.links.delete')}>
                      <IconButton size="small" onClick={() => setToDelete(link)} aria-label={t('cms.links.delete')}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>

      <CreateLinkDialog
        open={creating}
        template={template}
        onClose={() => setCreating(false)}
        onCreated={(link) => {
          setCreating(false);
          setLinks((prev) => [link, ...(prev ?? [])]);
          setQr(link);
        }}
      />
      {editing && (
        <EditLinkDialog
          link={editing}
          onClose={() => setEditing(null)}
          onSaved={(link) => {
            setEditing(null);
            setLinks((prev) => prev?.map((l) => (l.id === link.id ? link : l)) ?? null);
          }}
        />
      )}
      <QrDialog link={qr} onClose={() => setQr(null)} onCopy={(link) => void copy(link)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('cms.links.deleteTitle')}
        text={t('cms.links.deleteText', { name: toDelete?.label ?? toDelete?.token ?? '' })}
        confirmLabel={t('cms.links.delete')}
        danger
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await api(`/preview-links/${toDelete.id}`, { method: 'DELETE' });
            setLinks((prev) => prev?.filter((l) => l.id !== toDelete.id) ?? null);
          } catch (e) {
            fail(e);
          } finally {
            setToDelete(null);
          }
        }}
        onClose={() => setToDelete(null)}
      />
    </Dialog>
  );
}

function CreateLinkDialog({
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
              <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as 'live' | 'snapshot')}>
                <FormControlLabel value="live" control={<Radio />} label={t('cms.links.modeLiveHint')} />
                <FormControlLabel value="snapshot" control={<Radio />} label={t('cms.links.modeSnapshotHint')} />
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
                    label={draftHasErrors ? t('cms.links.fromDraftInvalid') : t('cms.links.fromDraft')}
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
                    input: { startAdornment: <InputAdornment position="start">/try/</InputAdornment> },
                    htmlInput: { maxLength: 60, spellCheck: false, autoCapitalize: 'off' },
                  }}
                />
              )}
            </Box>
            <Box>
              <FormControlLabel
                control={<Switch checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} />}
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
          <Button type="submit" variant="contained" disabled={busy || (usePassword && password.length < 4) || (custom && !slug)}>
            {t('cms.links.createSubmit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function EditLinkDialog({
  link,
  onClose,
  onSaved,
}: {
  link: PreviewLink;
  onClose: () => void;
  onSaved: (link: PreviewLink) => void;
}) {
  const [label, setLabel] = useState(link.label ?? '');
  const [passwordMode, setPasswordMode] = useState<'keep' | 'set' | 'remove'>(link.hasPassword ? 'keep' : 'remove');
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
      const res = await api<{ link: PreviewLink }>(`/preview-links/${link.id}`, { method: 'PATCH', body });
      onSaved(res.link);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err instanceof ApiRequestError ? err.message : t('common.networkError'));
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
            <TextField label={t('cms.links.label')} value={label} onChange={(e) => setLabel(e.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} />
            <Box>
              <FormLabel>{t('cms.links.password')}</FormLabel>
              <RadioGroup value={passwordMode} onChange={(e) => setPasswordMode(e.target.value as 'keep' | 'set' | 'remove')}>
                {link.hasPassword && <FormControlLabel value="keep" control={<Radio />} label={t('cms.links.passwordKeep')} />}
                <FormControlLabel value="set" control={<Radio />} label={link.hasPassword ? t('cms.links.passwordChange') : t('cms.links.passwordSet')} />
                <FormControlLabel value="remove" control={<Radio />} label={link.hasPassword ? t('cms.links.passwordRemove') : t('cms.links.passwordNone')} />
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
          <Button type="submit" variant="contained" disabled={busy || (passwordMode === 'set' && password.length < 4)}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function QrDialog({ link, onClose, onCopy }: { link: PreviewLink | null; onClose: () => void; onCopy: (link: PreviewLink) => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    setDataUrl(null);
    if (!link) return;
    QRCode.toDataURL(link.url, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [link]);
  const fileName = `qr-${(link?.label ?? link?.token ?? 'link').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;
  return (
    <Dialog open={Boolean(link)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{link?.label ?? t('cms.links.qr')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} alignItems="center">
          {dataUrl ? (
            <img src={dataUrl} alt={t('cms.links.qrAlt')} style={{ width: '100%', maxWidth: 300, imageRendering: 'pixelated' }} />
          ) : (
            <LinearProgress sx={{ width: '100%' }} />
          )}
          <Typography variant="body2" sx={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', wordBreak: 'break-all', textAlign: 'center' }}>
            {link?.url}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        {link && <Button onClick={() => onCopy(link)}>{t('cms.links.copyLink')}</Button>}
        {dataUrl && (
          <Button href={dataUrl} download={fileName}>
            {t('cms.links.downloadQr')}
          </Button>
        )}
        <Button variant="contained" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
