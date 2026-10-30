'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import MenuItem from '@mui/material/MenuItem';
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
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import HistoryIcon from '@mui/icons-material/History';
import PublishIcon from '@mui/icons-material/Publish';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { compareVersions, type GameModuleDetail, type GameVersionDetail } from '@opes/contracts';
import type { GameSource, SerializedSchema } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { uploadAssets } from '../../../../games/assets';
import { compileGame, type CompileResult } from '../../../../games/compiler';
import type { GameAssets, GameFiles, PendingAsset } from '../../../../games/types';
import { Workspace, type WorkspaceHandle } from '../../../../games/workspace/Workspace';
import { diffPackages, sameAssets, sameFiles } from '../../../../games/changes';
import { LocalDraftBanner } from '../../../../games/LocalDraftBanner';
import { clearLocalDraft, readLocalDraft, writeLocalDraft, type LocalDraft } from '../../../../games/localDraft';
import { PublishDialog } from '../../../../games/PublishDialog';
import { LeaveGuard } from '../../../../components/LeaveGuard';
import { downloadBlob, readGameZip, writeGameZip } from '../../../../games/zip';
import { api, ApiRequestError, handleAuthError } from '../../../../lib/api';
import { PreviewFrame } from '../../../../module-ui/PreviewFrame';

const formatDate = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

type Compile = { state: 'idle' | 'compiling' } | ({ state: 'done' } & CompileResult);

/** Màn sửa code một game: file code, file kèm, biên dịch tự động, chạy thử, lưu nháp, phát hành. */
export default function GameEditorPage() {
  const { key: rawKey } = useParams<{ key: string }>();
  const moduleKey = decodeURIComponent(rawKey);
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));

  const [mod, setMod] = useState<GameModuleDetail | null>(null);
  const [files, setFiles] = useState<GameFiles>({});
  const [assets, setAssets] = useState<GameAssets>({});
  /** Code lúc lưu nháp gần nhất (đánh dấu ● file đã sửa). */
  const [savedFiles, setSavedFiles] = useState<GameFiles>({});
  const [savedAssets, setSavedAssets] = useState<GameAssets>({});
  /** Bản tạm trên trình duyệt đang chờ hỏi Khôi phục / Bỏ đi. */
  const [localOffer, setLocalOffer] = useState<LocalDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [compile, setCompile] = useState<Compile>({ state: 'idle' });
  /** Gói chạy biên dịch thành công gần nhất (để xem trước). */
  const [runtimeJs, setRuntimeJs] = useState<string | null>(null);
  const [schema, setSchema] = useState<SerializedSchema | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [presetId, setPresetId] = useState('');
  const [tab, setTab] = useState<'code' | 'preview'>('code');
  const [publishOpen, setPublishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState<string | null>(null);
  const workspace = useRef<WorkspaceHandle>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  const apply = useCallback(async (next: GameModuleDetail) => {
    let nextFiles: GameFiles = {};
    let nextAssets: GameAssets = {};
    if (next.draft) {
      nextFiles = next.draft.files;
      nextAssets = next.draft.assets;
    } else if (next.latestVersion) {
      const v = await api<GameVersionDetail>(`/modules/${encodeURIComponent(next.key)}/versions/${encodeURIComponent(next.latestVersion)}`);
      nextFiles = v.files;
      nextAssets = v.assets;
    }
    setFiles(nextFiles);
    setAssets(nextAssets);
    setSavedFiles(nextFiles);
    setSavedAssets(nextAssets);
    setMod(next);
    setConflict(false);
    // Có bản tạm khác bản vừa tải: hỏi người dùng (không tự khôi phục).
    const local = readLocalDraft(next.key);
    if (local && !(sameFiles(local.files, nextFiles) && sameAssets(local.assets, nextAssets))) setLocalOffer(local);
    else {
      setLocalOffer(null);
      clearLocalDraft(next.key);
    }
  }, []);

  /** "Chưa lưu" = khác bản đã lưu (gõ rồi xóa về như cũ thì không còn). */
  const dirty = useMemo(() => !sameFiles(files, savedFiles) || !sameAssets(assets, savedAssets), [files, savedFiles, assets, savedAssets]);
  /** Bản nháp trên máy chủ mà bản tạm dựa vào. */
  const serverBase = mod ? (mod.draft?.updatedAt ?? `v:${mod.latestVersion ?? ''}`) : '';

  const load = useCallback(async () => {
    try {
      await apply((await api<{ module: GameModuleDetail }>(`/modules/${encodeURIComponent(moduleKey)}`)).module);
    } catch (e) {
      if (handleAuthError(e)) return;
      setLoadError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
    }
  }, [moduleKey, apply]);

  useEffect(() => {
    void load();
  }, [load]);

  // Vừa tạo game từ .zip có file bị bỏ qua: báo một lần.
  useEffect(() => {
    const skipped = new URLSearchParams(window.location.search).get('boQua');
    if (skipped) setToast(t('cms.games.skippedFiles', { count: skipped }));
  }, []);

  // Biên dịch lại sau khi ngừng gõ một lúc.
  useEffect(() => {
    if (!mod) return;
    let alive = true;
    setCompile({ state: 'compiling' });
    const timer = setTimeout(() => {
      compileGame(files, assets).then(
        (result) => {
          if (!alive) return;
          setCompile({ state: 'done', ...result });
          if (result.ok) setRuntimeJs(result.runtimeJs);
        },
        (e: unknown) => alive && setCompile({ state: 'done', ok: false, errors: [{ file: null, line: 0, column: 0, text: String(e) }] }),
      );
    }, 700);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [mod, files, assets]);

  // Bản tạm trên trình duyệt: ghi sau khi ngừng sửa 1 giây; hết thay đổi thì xóa. Đang hỏi khôi phục thì để nguyên.
  useEffect(() => {
    if (!mod || localOffer) return;
    if (!dirty) {
      clearLocalDraft(mod.key);
      return;
    }
    const timer = setTimeout(() => {
      writeLocalDraft(mod.key, { files, assets, base: serverBase, savedAt: new Date().toISOString() });
    }, 1000);
    return () => clearTimeout(timer);
  }, [mod, localOffer, dirty, files, assets, serverBase]);

  const source = useMemo<GameSource | null>(() => (runtimeJs ? { kind: 'code', code: runtimeJs, label: moduleKey } : null), [runtimeJs, moduleKey]);
  const previewConfig = useMemo(() => {
    if (!schema) return null;
    return schema.presets.find((p) => p.id === presetId)?.config ?? schema.defaults;
  }, [schema, presetId]);
  const onSchema = useCallback((s: SerializedSchema | null, e: string | null) => {
    setSchema(s);
    setPreviewError(e);
  }, []);

  const fail = (e: unknown) => {
    if (handleAuthError(e)) return;
    if (e instanceof ApiRequestError && e.code === 'MODULE_CONFLICT') {
      setConflict(true);
      return;
    }
    setError(e instanceof Error ? e.message : t('common.networkError'));
  };

  const change = (nextFiles: GameFiles, nextAssets: GameAssets = assets) => {
    // Sửa tiếp mà không chọn khôi phục: bỏ bản tạm cũ.
    if (localOffer) setLocalOffer(null);
    setFiles(nextFiles);
    setAssets(nextAssets);
  };

  /** Lưu nháp (kèm gói đã biên dịch nếu không lỗi). Bật "tự định dạng khi lưu" thì định dạng trước. */
  async function save(): Promise<GameModuleDetail | null> {
    if (!mod) return null;
    const toSave = (await workspace.current?.prepareSave()) ?? files;
    const compiled = await compileGame(toSave, assets);
    const res = await api<{ module: GameModuleDetail }>(`/modules/${encodeURIComponent(mod.key)}/draft`, {
      method: 'PUT',
      body: {
        files: toSave,
        assets,
        schemaJs: compiled.ok ? compiled.schemaJs : null,
        runtimeJs: compiled.ok ? compiled.runtimeJs : null,
        baseUpdatedAt: mod.draft?.updatedAt ?? null,
      },
    });
    setMod(res.module);
    setSavedFiles(toSave);
    setSavedAssets(assets);
    clearLocalDraft(mod.key);
    return res.module;
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  const onSave = () =>
    run('save', async () => {
      await save();
      setToast(t('cms.games.saved'));
    });

  const onPublish = (notes: string) =>
    run('publish', async () => {
      const current = dirty || !mod?.draft ? await save() : mod;
      if (!current) return;
      const res = await api<{ module: GameModuleDetail }>(`/modules/${encodeURIComponent(current.key)}/publish`, {
        method: 'POST',
        body: { notes: notes.trim() || undefined, baseUpdatedAt: current.draft?.updatedAt ?? null },
      });
      setPublishOpen(false);
      await apply(res.module);
      setToast(t('cms.games.publishedToast', { version: res.module.latestVersion ?? '' }));
    });

  const onDiscard = () =>
    run('discard', async () => {
      if (!mod) return;
      const res = await api<{ module: GameModuleDetail }>(`/modules/${encodeURIComponent(mod.key)}/draft`, { method: 'DELETE' });
      clearLocalDraft(mod.key);
      setDiscardOpen(false);
      await apply(res.module);
      setToast(t('cms.games.discarded'));
    });

  const onDownload = (version?: string) =>
    run('download', async () => {
      let f = files;
      let a = assets;
      let name = `${moduleKey}-${dirty || mod?.draft ? 'ban-nhap' : (mod?.latestVersion ?? '')}`;
      if (version) {
        const v = await api<GameVersionDetail>(`/modules/${encodeURIComponent(moduleKey)}/versions/${encodeURIComponent(version)}`);
        f = v.files;
        a = v.assets;
        name = `${moduleKey}-${version}`;
      }
      downloadBlob(await writeGameZip(f, a), `${name}.zip`);
    });

  const onRestore = () =>
    run('restore', async () => {
      if (!restoreVersion) return;
      const v = await api<GameVersionDetail>(`/modules/${encodeURIComponent(moduleKey)}/versions/${encodeURIComponent(restoreVersion)}`);
      change(v.files, v.assets);
      setRestoreVersion(null);
      setHistoryOpen(false);
      setToast(t('cms.games.restoredToast', { version: v.version }));
    });

  const onZip = (file: File) =>
    run('zip', async () => {
      const zip = await readGameZip(file);
      const uploaded = await uploadAssets(moduleKey, zip.assets, (done, total) => total && setBusy(`zip:${done}/${total}`));
      change(zip.files, uploaded);
      setToast(
        zip.skipped.length
          ? t('cms.games.zipLoadedSkipped', { count: zip.skipped.length, list: zip.skipped.slice(0, 3).join(', ') })
          : t('cms.games.zipLoaded'),
      );
    });

  if (loadError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Box>
          <Button component={Link} href="/games" startIcon={<ArrowBackIcon />}>
            {t('cms.games.backToList')}
          </Button>
        </Box>
      </Stack>
    );
  }
  if (!mod) return <LinearProgress />;

  const errors = compile.state === 'done' && !compile.ok ? compile.errors : [];
  const compiled = compile.state === 'done' && compile.ok;
  const hasDraft = dirty || mod.draft !== null;
  const draftVersion = schema?.version ?? mod.draft?.version ?? null;
  const versionProblem =
    draftVersion && mod.latestVersion && compareVersions(draftVersion, mod.latestVersion) <= 0
      ? t('cms.games.versionNotNewer', { version: draftVersion, latest: mod.latestVersion })
      : null;
  const canPublish = hasDraft && compiled && !previewError && !versionProblem && busy === null;

  const status = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Chip size="small" variant="outlined" label={<code>{mod.key}</code>} />
      <Chip
        size="small"
        color={mod.latestVersion ? 'success' : 'default'}
        label={mod.latestVersion ? t('cms.games.latest', { version: mod.latestVersion }) : t('cms.games.unpublished')}
      />
      {hasDraft && <Chip size="small" color="warning" label={draftVersion ? t('cms.games.draftVersion', { version: draftVersion }) : t('cms.games.hasDraft')} />}
      {dirty && (
        <Typography variant="body2" color="warning.main">
          {t('cms.games.unsaved')}
        </Typography>
      )}
      {!dirty && mod.draft && (
        <Typography variant="body2" color="text.secondary">
          {t('cms.games.draftSavedAt', { date: formatDate(mod.draft.updatedAt), name: mod.draft.updatedByName ?? '' })}
        </Typography>
      )}
    </Stack>
  );

  const code = (
    <Stack spacing={1.5}>
      <Workspace
        ref={workspace}
        files={files}
        assets={assets}
        savedFiles={savedFiles}
        errors={errors}
        compiling={compile.state === 'compiling'}
        height={wide ? 'calc(100vh - 260px)' : 'calc(100vh - 220px)'}
        onChange={(f, a) => change(f, a)}
        uploadAssets={(pending: Record<string, PendingAsset>) => uploadAssets(moduleKey, pending)}
        onSave={() => {
          if (dirty && busy === null) void onSave();
        }}
        onNotice={(message, severity) => (severity === 'error' ? setError(message) : setToast(message))}
      />
    </Stack>
  );

  const preview = (
    <Stack spacing={1.5}>
      <TextField
        select
        size="small"
        label={t('cms.games.previewConfig')}
        value={presetId}
        onChange={(e) => setPresetId(e.target.value)}
        disabled={!schema}
      >
        <MenuItem value="">{t('cms.games.defaults')}</MenuItem>
        {(schema?.presets ?? []).map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>
      {source ? (
        <PreviewFrame source={source} config={previewConfig} onSchema={onSchema} />
      ) : (
        <Alert severity="info">{t('cms.games.previewWaiting')}</Alert>
      )}
      {schema && (
        <Typography variant="body2" color="text.secondary">
          {schema.name} · v{schema.version}
        </Typography>
      )}
    </Stack>
  );

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'flex-start' }}>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
          <IconButton component={Link} href="/games" aria-label={t('cms.games.backToList')} sx={{ mt: 0.25 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" fontWeight={700} noWrap>
              {mod.name}
            </Typography>
            {status}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          <Button startIcon={<UploadFileOutlined />} onClick={() => zipInput.current?.click()} disabled={busy !== null}>
            {t('cms.games.uploadZip')}
          </Button>
          <input
            ref={zipInput}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void onZip(file);
            }}
          />
          <Button startIcon={<DownloadOutlined />} onClick={() => void onDownload()} disabled={busy !== null}>
            {t('cms.games.downloadZip')}
          </Button>
          <Button startIcon={<HistoryIcon />} onClick={() => setHistoryOpen(true)}>
            {t('cms.games.history', { count: mod.versions.length })}
          </Button>
          {mod.draft && mod.latestVersion && (
            <Button color="inherit" onClick={() => setDiscardOpen(true)} disabled={busy !== null}>
              {t('cms.games.discard')}
            </Button>
          )}
          <Button variant="outlined" startIcon={<SaveOutlined />} onClick={() => void onSave()} disabled={!dirty || busy !== null}>
            {busy === 'save' ? t('cms.games.saving') : t('cms.games.saveDraft')}
          </Button>
          <Tooltip title={canPublish ? '' : (versionProblem ?? (hasDraft ? t('cms.games.fixBeforePublish') : t('cms.games.nothingToPublish')))}>
            <span>
              <Button variant="contained" startIcon={<PublishIcon />} onClick={() => setPublishOpen(true)} disabled={!canPublish}>
                {t('cms.games.publish')}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {busy?.startsWith('zip:') && <Alert severity="info">{t('cms.games.uploadingAssets', { progress: busy.slice(4) })}</Alert>}
      {busy !== null && <LinearProgress />}
      {localOffer && (
        <LocalDraftBanner
          savedAt={localOffer.savedAt}
          fileCount={diffPackages({ files, assets }, localOffer).length}
          outdated={localOffer.base !== serverBase}
          onRestore={() => {
            const local = localOffer;
            setLocalOffer(null);
            setFiles(local.files);
            setAssets(local.assets);
          }}
          onDiscard={() => {
            setLocalOffer(null);
            clearLocalDraft(mod.key);
          }}
        />
      )}
      {conflict && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => void load()}>
              {t('cms.games.reload')}
            </Button>
          }
        >
          {t('cms.games.conflict')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {versionProblem && hasDraft && <Alert severity="info">{versionProblem}</Alert>}
      {previewError && <Alert severity="error">{t('cms.games.runtimeError', { message: previewError })}</Alert>}
      {mod.templateCount > 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('cms.games.templateCount', { count: mod.templateCount })}
        </Typography>
      )}

      {wide ? (
        <Grid container spacing={2} alignItems="flex-start">
          <Grid size={{ lg: 8 }}>{code}</Grid>
          <Grid size={{ lg: 4 }} sx={{ position: 'sticky', top: 88 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {preview}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Box>
          <Tabs value={tab} onChange={(_, v: 'code' | 'preview') => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
            <Tab value="code" label={t('cms.games.tabCode')} />
            <Tab value="preview" label={t('cms.games.tabPreview')} />
          </Tabs>
          {tab === 'code' ? code : preview}
        </Box>
      )}

      <PublishDialog
        open={publishOpen}
        moduleKey={mod.key}
        files={files}
        assets={assets}
        version={draftVersion}
        latest={mod.latestVersion}
        templateCount={mod.templateCount}
        busy={busy === 'publish'}
        onClose={() => setPublishOpen(false)}
        onPublish={(notes) => void onPublish(notes)}
      />

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('cms.games.historyTitle')}</DialogTitle>
        <DialogContent dividers>
          {mod.versions.length === 0 ? (
            <Typography color="text.secondary">{t('cms.games.historyEmpty')}</Typography>
          ) : (
            <List disablePadding>
              {mod.versions.map((v) => (
                <ListItem
                  key={v.version}
                  disableGutters
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => void onDownload(v.version)} disabled={busy !== null}>
                        {t('cms.games.downloadShort')}
                      </Button>
                      <Button size="small" onClick={() => setRestoreVersion(v.version)}>
                        {t('cms.games.useAsDraft')}
                      </Button>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={`v${v.version}${v.version === mod.latestVersion ? ` · ${t('cms.games.current')}` : ''}`}
                    secondary={[formatDate(v.publishedAt), v.publishedByName, v.notes].filter(Boolean).join(' · ')}
                    sx={{ pr: 22 }}
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

      <ConfirmDialog
        open={restoreVersion !== null}
        title={t('cms.games.useAsDraftTitle', { version: restoreVersion ?? '' })}
        text={t('cms.games.useAsDraftText')}
        confirmLabel={t('cms.games.useAsDraft')}
        busy={busy === 'restore'}
        onConfirm={() => void onRestore()}
        onClose={() => setRestoreVersion(null)}
      />
      <ConfirmDialog
        open={discardOpen}
        title={t('cms.games.discardTitle')}
        text={t('cms.games.discardText', { version: mod.latestVersion ?? '' })}
        confirmLabel={t('cms.games.discard')}
        danger
        busy={busy === 'discard'}
        onConfirm={() => void onDiscard()}
        onClose={() => setDiscardOpen(false)}
      />
      <LeaveGuard when={dirty} />
      <Snackbar open={Boolean(toast)} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />
    </Stack>
  );
}
