'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/History';
import LinkIcon from '@mui/icons-material/Link';
import PublishIcon from '@mui/icons-material/Publish';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import type { TemplateDetail, TemplateVersionResponse } from '@opes/contracts';
import type { GameSource } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { LeaveGuard } from '../../../../components/LeaveGuard';
import { api, ApiRequestError, handleAuthError } from '../../../../lib/api';
import { PreviewFrame } from '../../../../module-ui/PreviewFrame';
import { PreviewLinksDialog } from '../../../../module-ui/PreviewLinksDialog';
import { SchemaForm } from '../../../../module-ui/SchemaForm';
import { StatusChip } from '../../../../module-ui/StatusChip';
import { useGameForm } from '../../../../module-ui/useGame';

type Config = Record<string, unknown>;

interface Draft {
  name: string;
  brandName: string;
  note: string;
  config: Config;
}

const fromTemplate = (tpl: TemplateDetail): Draft => ({
  name: tpl.name,
  brandName: tpl.brandName ?? '',
  note: tpl.note ?? '',
  config: tpl.config,
});

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/** Màn chỉnh template: form trái, xem trước phải; Lưu nháp, Công bố, lịch sử công bố. */
export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState<'save' | 'publish' | 'restore' | 'upgrade' | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<'form' | 'preview'>('form');
  const [infoOpen, setInfoOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [viewing, setViewing] = useState<TemplateVersionResponse | null>(null);
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null);

  // Bản nháp chạy bằng phiên bản game template đang dùng (đổi khi bấm "Nâng lên bản mới").
  const moduleKey = template?.moduleKey;
  const moduleVersion = template?.moduleVersion;
  const source = useMemo<GameSource | null>(
    () => (moduleKey && moduleVersion ? { kind: 'version', key: moduleKey, version: moduleVersion } : null),
    [moduleKey, moduleVersion],
  );
  const game = useGameForm(source, draft?.config);

  const apply = useCallback((tpl: TemplateDetail) => {
    setTemplate(tpl);
    setDraft(fromTemplate(tpl));
    setDirty(false);
    setConflict(false);
    setFormKey((k) => k + 1);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api<{ template: TemplateDetail }>(`/templates/${id}`);
      apply(res.template);
    } catch (e) {
      if (handleAuthError(e)) return;
      setLoadError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
    }
  }, [id, apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const errors = game.check?.errors ?? template?.errors ?? {};
  const errorCount = Object.keys(errors).length;

  const fail = (e: unknown) => {
    if (handleAuthError(e)) return;
    if (e instanceof ApiRequestError && e.code === 'TEMPLATE_CONFLICT') {
      setConflict(true);
      return;
    }
    setError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
  };

  const update = (patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  /** Lưu nháp; trả về bản mới (để Công bố dùng tiếp). */
  async function save(): Promise<TemplateDetail | null> {
    if (!template || !draft) return null;
    const res = await api<{ template: TemplateDetail }>(`/templates/${template.id}`, {
      method: 'PUT',
      body: { ...draft, baseRevision: template.revision },
    });
    setTemplate(res.template);
    setDirty(false);
    return res.template;
  }

  async function onSave() {
    setBusy('save');
    setError(null);
    try {
      await save();
      setToast(t('cms.templates.saved'));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function onPublish() {
    if (!template) return;
    setBusy('publish');
    setError(null);
    try {
      const current = dirty ? await save() : template;
      if (!current) return;
      const res = await api<{ template: TemplateDetail }>(`/templates/${current.id}/publish`, {
        method: 'POST',
        body: { baseRevision: current.revision },
      });
      setTemplate(res.template);
      setToast(t('cms.templates.publishedToast', { version: res.template.publishedVersion }));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function onUpgrade() {
    if (!template) return;
    setBusy('upgrade');
    setError(null);
    try {
      const current = dirty ? await save() : template;
      if (!current) return;
      const res = await api<{ template: TemplateDetail }>(`/templates/${current.id}/upgrade`, {
        method: 'POST',
        body: { baseRevision: current.revision },
      });
      apply(res.template);
      setToast(t('cms.templates.upgradedToast', { version: res.template.moduleVersion }));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
      setUpgradeOpen(false);
    }
  }

  async function viewVersion(version: number) {
    if (!template) return;
    try {
      setViewing(await api<TemplateVersionResponse>(`/templates/${template.id}/versions/${version}`));
    } catch (e) {
      fail(e);
    }
  }

  async function onRestore() {
    if (!template || restoreVersion === null) return;
    setBusy('restore');
    try {
      const res = await api<{ template: TemplateDetail }>(`/templates/${template.id}/versions/${restoreVersion}/restore`, {
        method: 'POST',
        body: { baseRevision: template.revision },
      });
      apply(res.template);
      setToast(t('cms.templates.restoredToast', { version: restoreVersion }));
      setRestoreVersion(null);
      setViewing(null);
      setHistoryOpen(false);
    } catch (e) {
      fail(e);
      setRestoreVersion(null);
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Box>
          <Button component={Link} href="/templates" startIcon={<ArrowBackIcon />}>
            {t('cms.templates.backToList')}
          </Button>
        </Box>
      </Stack>
    );
  }
  if (!template || !draft || !source) return <LinearProgress />;

  const archived = template.status === 'archived';
  const checked = game.check !== null;
  const canPublish = checked && !archived && errorCount === 0 && (dirty || template.hasUnpublishedChanges);
  const canUpgrade =
    !archived && template.latestModuleVersion !== null && template.latestModuleVersion !== template.moduleVersion;
  const publishHint = archived
    ? t('cms.templates.archivedHint')
    : errorCount > 0
      ? t('cms.templates.fixBeforePublish', { count: errorCount })
      : !dirty && !template.hasUnpublishedChanges
        ? t('cms.templates.nothingToPublish')
        : dirty
          ? t('cms.templates.saveAndPublish')
          : '';

  const statusLine = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <StatusChip template={{ ...template, hasUnpublishedChanges: template.hasUnpublishedChanges || dirty }} />
      {dirty && <Typography variant="body2" color="warning.main">{t('cms.templates.unsaved')}</Typography>}
      {template.publishedAt && (
        <Typography variant="body2" color="text.secondary">
          {t('cms.templates.lastPublished', { date: formatDate(template.publishedAt) })}
        </Typography>
      )}
    </Stack>
  );

  const form = game.error ? (
    <Alert severity="error">{t('cms.templates.gameLoadFailed', { message: game.error })}</Alert>
  ) : !game.schema ? (
    <LinearProgress />
  ) : (
    <Stack spacing={2}>
      {errorCount > 0 && <Alert severity="info">{t('cms.playground.invalid', { count: errorCount })}</Alert>}
      <SchemaForm
        key={formKey}
        fields={game.schema.fields}
        value={draft.config}
        errors={errors}
        hidden={game.check?.hidden}
        labels={game.check?.labels}
        onChange={(config) => update({ config })}
      />
    </Stack>
  );
  const preview = <PreviewFrame source={source} config={draft.config} />;

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'flex-start' }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <IconButton component={Link} href="/templates" aria-label={t('cms.templates.backToList')} sx={{ mt: 0.25 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="h5" component="h1" fontWeight={700} noWrap>
                {draft.name}
              </Typography>
              {!archived && (
                <IconButton size="small" onClick={() => setInfoOpen(true)} aria-label={t('cms.templates.editInfo')}>
                  <EditOutlined fontSize="small" />
                </IconButton>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {[draft.brandName, `${template.moduleName} v${template.moduleVersion}`].filter(Boolean).join(' · ')}
            </Typography>
            {statusLine}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          <Button startIcon={<LinkIcon />} onClick={() => setLinksOpen(true)}>
            {t('cms.links.button')}
          </Button>
          <Button startIcon={<HistoryIcon />} onClick={() => setHistoryOpen(true)}>
            {t('cms.templates.history', { count: template.versions.length })}
          </Button>
          {!archived && (
            <Button
              variant="outlined"
              startIcon={<SaveOutlined />}
              onClick={() => void onSave()}
              disabled={!dirty || busy !== null}
            >
              {busy === 'save' ? t('cms.templates.saving') : t('cms.templates.saveDraft')}
            </Button>
          )}
          {!archived && (
            <Tooltip title={publishHint}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<PublishIcon />}
                  onClick={() => void onPublish()}
                  disabled={!canPublish || busy !== null}
                >
                  {busy === 'publish' ? t('cms.templates.publishing') : t('cms.templates.publish')}
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {archived && <Alert severity="warning">{t('cms.templates.archivedHint')}</Alert>}
      {canUpgrade && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={() => setUpgradeOpen(true)} disabled={busy !== null}>
              {t('cms.templates.upgrade')}
            </Button>
          }
        >
          {t('cms.templates.upgradeHint', { current: template.moduleVersion, latest: template.latestModuleVersion ?? '' })}
        </Alert>
      )}
      {conflict && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => void load()}>
              {t('cms.templates.reload')}
            </Button>
          }
        >
          {t('cms.templates.conflict')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {wide ? (
        <Grid container spacing={3} alignItems="flex-start">
          <Grid size={{ md: 6, lg: 7 }}>{form}</Grid>
          <Grid size={{ md: 6, lg: 5 }} sx={{ position: 'sticky', top: 88 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {preview}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Box>
          <Tabs value={tab} onChange={(_, v: 'form' | 'preview') => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
            <Tab value="form" label={t('cms.playground.tabForm')} />
            <Tab value="preview" label={t('cms.playground.tabPreview')} />
          </Tabs>
          {tab === 'form' ? form : preview}
        </Box>
      )}

      <InfoDialog
        open={infoOpen}
        draft={draft}
        onClose={() => setInfoOpen(false)}
        onApply={(info) => {
          update(info);
          setInfoOpen(false);
        }}
      />

      <PreviewLinksDialog open={linksOpen} template={template} onClose={() => setLinksOpen(false)} />

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('cms.templates.historyTitle')}</DialogTitle>
        <DialogContent dividers>
          {template.versions.length === 0 ? (
            <Typography color="text.secondary">{t('cms.templates.historyEmpty')}</Typography>
          ) : (
            <List disablePadding>
              {template.versions.map((v) => (
                <ListItem
                  key={v.version}
                  disableGutters
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => void viewVersion(v.version)}>
                        {t('cms.templates.view')}
                      </Button>
                      {!archived && (
                        <Button size="small" onClick={() => setRestoreVersion(v.version)}>
                          {t('cms.templates.restore')}
                        </Button>
                      )}
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={`${t('cms.templates.versionLabel', { version: v.version })}${
                      v.version === template.publishedVersion ? ` · ${t('cms.templates.current')}` : ''
                    }`}
                    secondary={`${formatDate(v.publishedAt)}${v.publishedByName ? ` · ${v.publishedByName}` : ''}`}
                    sx={{ pr: 18 }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewing !== null} onClose={() => setViewing(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {viewing && t('cms.templates.versionLabel', { version: viewing.version })}
          {viewing && (
            <Typography variant="body2" color="text.secondary">
              {formatDate(viewing.publishedAt)}
              {viewing.publishedByName ? ` · ${viewing.publishedByName}` : ''}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {viewing && (
            <PreviewFrame
              source={{ kind: 'version', key: template.moduleKey, version: viewing.moduleVersion }}
              config={viewing.config}
              maxHeight={560}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewing(null)}>{t('common.close')}</Button>
          {viewing && !archived && (
            <Button variant="contained" onClick={() => setRestoreVersion(viewing.version)}>
              {t('cms.templates.restore')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={restoreVersion !== null}
        title={t('cms.templates.restoreTitle', { version: restoreVersion ?? '' })}
        text={dirty ? t('cms.templates.restoreTextDirty') : t('cms.templates.restoreText')}
        confirmLabel={t('cms.templates.restore')}
        busy={busy === 'restore'}
        onConfirm={() => void onRestore()}
        onClose={() => setRestoreVersion(null)}
      />
      <ConfirmDialog
        open={upgradeOpen}
        title={t('cms.templates.upgradeTitle', { version: template.latestModuleVersion ?? '' })}
        text={dirty ? t('cms.templates.upgradeTextDirty') : t('cms.templates.upgradeText')}
        confirmLabel={t('cms.templates.upgrade')}
        busy={busy === 'upgrade'}
        onConfirm={() => void onUpgrade()}
        onClose={() => setUpgradeOpen(false)}
      />
      <LeaveGuard when={dirty} />
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Stack>
  );
}

function InfoDialog({
  open,
  draft,
  onClose,
  onApply,
}: {
  open: boolean;
  draft: Draft;
  onClose: () => void;
  onApply: (info: Pick<Draft, 'name' | 'brandName' | 'note'>) => void;
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
        <Button variant="contained" disabled={!name.trim()} onClick={() => onApply({ name: name.trim(), brandName, note })}>
          {t('cms.templates.applyInfo')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
