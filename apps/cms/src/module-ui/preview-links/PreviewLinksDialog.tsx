'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
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
import type { PreviewLink, PreviewLinkListResponse, TemplateDetail } from '@opes/contracts';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { api, handleAuthError, errorMessage } from '../../lib/api';
import { formatDateTime, formatDay } from '../../lib/format';
import { copyText } from '../../lib/clipboard';
import { modeLabel } from './link-format';
import { CreateLinkDialog } from './CreateLinkDialog';
import { EditLinkDialog } from './EditLinkDialog';
import { QrDialog } from './QrDialog';

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
    setError(errorMessage(e));
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
      const res = await api<{ link: PreviewLink }>(`/preview-links/${link.id}`, {
        method: 'PATCH',
        body,
      });
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
          {!archived && template.publishedVersion === 0 && (
            <Alert severity="info">{t('cms.links.notPublished')}</Alert>
          )}
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
          {links?.length === 0 && (
            <Typography color="text.secondary">{t('cms.links.empty')}</Typography>
          )}
          {links?.map((link) => {
            const expired = link.expiresAt !== null && new Date(link.expiresAt).getTime() <= now;
            return (
              <Paper
                key={link.id}
                variant="outlined"
                sx={{ p: 2, opacity: link.disabled || expired ? 0.7 : 1 }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography fontWeight={700}>{link.label ?? t('cms.links.unnamed')}</Typography>
                    <Chip
                      size="small"
                      label={modeLabel(link)}
                      color={link.mode === 'live' ? 'primary' : 'default'}
                      variant="outlined"
                    />
                    {link.hasPassword && (
                      <Chip
                        size="small"
                        icon={<LockOutlined />}
                        label={t('cms.links.hasPassword')}
                      />
                    )}
                    {link.expiresAt && (
                      <Chip
                        size="small"
                        color={expired ? 'error' : 'default'}
                        label={
                          expired
                            ? t('cms.links.expired')
                            : t('cms.links.expiresOn', { date: formatDay(link.expiresAt) })
                        }
                      />
                    )}
                    {link.disabled && (
                      <Chip size="small" color="error" label={t('cms.links.off')} />
                    )}
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {link.url}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('cms.links.views', { count: link.viewCount })}
                    {link.lastViewedAt
                      ? ` · ${t('cms.links.lastViewed', { date: formatDateTime(link.lastViewedAt) })}`
                      : ''}
                    {` · ${t('cms.links.createdAt', { date: formatDateTime(link.createdAt) })}`}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Button
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => void copy(link)}
                    >
                      {t('common.copy')}
                    </Button>
                    <Button
                      size="small"
                      startIcon={<OpenInNewIcon />}
                      href={link.url}
                      target="_blank"
                      rel="noopener"
                    >
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
                        <IconButton
                          size="small"
                          onClick={() => setEditing(link)}
                          disabled={archived}
                          aria-label={t('cms.links.edit')}
                        >
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={t('cms.links.delete')}>
                      <IconButton
                        size="small"
                        onClick={() => setToDelete(link)}
                        aria-label={t('cms.links.delete')}
                      >
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
