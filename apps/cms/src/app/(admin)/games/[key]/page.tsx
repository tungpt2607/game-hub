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
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
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
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import HistoryIcon from '@mui/icons-material/History';
import PublishIcon from '@mui/icons-material/Publish';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { GAME_PATH, compareVersions, type GameModuleDetail, type GameVersionDetail } from '@opes/contracts';
import type { GameSource, SerializedSchema } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { uploadAssets } from '../../../../games/assets';
import { CodeEditor, type EditorApi } from '../../../../games/CodeEditor';
import { compileGame, type CompileResult } from '../../../../games/compiler';
import type { GameAssets, GameFiles } from '../../../../games/types';
import { assetMime, downloadBlob, isCodePath, readGameZip, writeGameZip } from '../../../../games/zip';
import { api, ApiRequestError, handleAuthError } from '../../../../lib/api';
import { copyText } from '../../../../lib/clipboard';
import { PreviewFrame } from '../../../../module-ui/PreviewFrame';

const formatDate = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(bytes / 1024)}KB`);

/** Thứ tự file: schema, index, config… trước, còn lại theo tên. */
const FIRST = ['schema.ts', 'index.ts', 'config.ts', 'presets.ts', 'Runtime.tsx', 'engine.ts'];
const sortPaths = (paths: string[]) =>
  [...paths].sort((a, b) => {
    const ia = FIRST.indexOf(a);
    const ib = FIRST.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });

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
  const [selected, setSelected] = useState<string>('schema.ts');
  const [dirty, setDirty] = useState(false);
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
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [deletePath, setDeletePath] = useState<{ kind: 'file' | 'asset'; path: string } | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState<string | null>(null);
  const editor = useRef<EditorApi | null>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  const assetInput = useRef<HTMLInputElement>(null);

  const apply = useCallback(async (next: GameModuleDetail) => {
    setMod(next);
    if (next.draft) {
      setFiles(next.draft.files);
      setAssets(next.draft.assets);
    } else if (next.latestVersion) {
      const v = await api<GameVersionDetail>(`/modules/${encodeURIComponent(next.key)}/versions/${encodeURIComponent(next.latestVersion)}`);
      setFiles(v.files);
      setAssets(v.assets);
    }
    setDirty(false);
    setConflict(false);
  }, []);

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

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const paths = useMemo(() => sortPaths(Object.keys(files)), [files]);
  useEffect(() => {
    if (paths.length && !paths.includes(selected)) setSelected(paths[0]!);
  }, [paths, selected]);

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
    setFiles(nextFiles);
    setAssets(nextAssets);
    setDirty(true);
  };

  /** Lưu nháp (kèm gói đã biên dịch nếu không lỗi). */
  async function save(): Promise<GameModuleDetail | null> {
    if (!mod) return null;
    const compiled = await compileGame(files, assets);
    const res = await api<{ module: GameModuleDetail }>(`/modules/${encodeURIComponent(mod.key)}/draft`, {
      method: 'PUT',
      body: {
        files,
        assets,
        schemaJs: compiled.ok ? compiled.schemaJs : null,
        runtimeJs: compiled.ok ? compiled.runtimeJs : null,
        baseUpdatedAt: mod.draft?.updatedAt ?? null,
      },
    });
    setMod(res.module);
    setDirty(false);
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

  const onAddAssets = (list: FileList) =>
    run('assets', async () => {
      const pending: Record<string, { blob: Blob; mime: string }> = {};
      const rejected: string[] = [];
      for (const file of Array.from(list)) {
        const mime = assetMime(file.name);
        if (!mime || !GAME_PATH.test(file.name)) rejected.push(file.name);
        else pending[file.name] = { blob: file, mime };
      }
      const uploaded = await uploadAssets(moduleKey, pending);
      change(files, { ...assets, ...uploaded });
      if (rejected.length) setError(t('cms.games.assetsRejected', { list: rejected.join(', ') }));
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

  const jump = (file: string | null, line: number, column: number) => {
    if (file && files[file] !== undefined) setSelected(file);
    setTab('code');
    setTimeout(() => {
      const ed = editor.current;
      if (!ed || line <= 0) return;
      ed.goTo(line, column);
    }, 50);
  };

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

  const fileList = (
    <Paper variant="outlined">
      <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 1 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {t('cms.games.codeFiles')}
        </Typography>
        <Tooltip title={t('cms.games.newFile')}>
          <IconButton size="small" onClick={() => setNewFileOpen(true)} aria-label={t('cms.games.newFile')}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Divider />
      <List dense disablePadding sx={{ maxHeight: 280, overflow: 'auto' }}>
        {paths.map((p) => {
          const errCount = errors.filter((e) => e.file === p).length;
          return (
            <ListItem
              key={p}
              disablePadding
              secondaryAction={
                !['schema.ts', 'index.ts'].includes(p) && (
                  <IconButton edge="end" size="small" onClick={() => setDeletePath({ kind: 'file', path: p })} aria-label={t('cms.games.deleteFile')}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                )
              }
            >
              <ListItemButton selected={p === selected} onClick={() => setSelected(p)}>
                <ListItemText
                  primary={<code>{p}</code>}
                  secondary={errCount ? t('cms.games.errorCount', { count: errCount }) : undefined}
                  slotProps={{ secondary: { color: 'error' } }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 1 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {t('cms.games.assets', { count: Object.keys(assets).length })}
        </Typography>
        <Tooltip title={t('cms.games.addAssets')}>
          <IconButton size="small" onClick={() => assetInput.current?.click()} aria-label={t('cms.games.addAssets')} disabled={busy !== null}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <input
          ref={assetInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void onAddAssets(e.target.files);
            e.target.value = '';
          }}
        />
      </Stack>
      <Divider />
      <List dense disablePadding sx={{ maxHeight: 240, overflow: 'auto' }}>
        {Object.keys(assets).length === 0 && (
          <ListItem>
            <ListItemText secondary={t('cms.games.noAssets')} />
          </ListItem>
        )}
        {Object.keys(assets)
          .sort()
          .map((p) => (
            <ListItem
              key={p}
              secondaryAction={
                <Stack direction="row">
                  <Tooltip title={t('cms.games.copyUsage')}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        void copyText(`asset('${p}')`).then(() => setToast(t('cms.games.copied')));
                      }}
                      aria-label={t('cms.games.copyUsage')}
                    >
                      <ContentCopyOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => setDeletePath({ kind: 'asset', path: p })} aria-label={t('cms.games.deleteFile')}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemText
                primary={<code style={{ wordBreak: 'break-all' }}>{p}</code>}
                secondary={formatSize(assets[p]!.size)}
                sx={{ pr: 8 }}
              />
            </ListItem>
          ))}
      </List>
    </Paper>
  );

  const errorPanel =
    compile.state === 'compiling' ? (
      <Typography variant="body2" color="text.secondary">
        {t('cms.games.compiling')}
      </Typography>
    ) : errors.length > 0 ? (
      <Alert severity="error">
        <Typography variant="body2" fontWeight={600}>
          {t('cms.games.compileErrors', { count: errors.length })}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {errors.slice(0, 10).map((e, i) => (
            <li key={i}>
              {e.file ? (
                <Box
                  component="button"
                  type="button"
                  onClick={() => jump(e.file, e.line, e.column)}
                  sx={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'monospace' }}
                >
                  {e.file}:{e.line}:{e.column}
                </Box>
              ) : null}{' '}
              {e.text}
            </li>
          ))}
        </Box>
      </Alert>
    ) : compiled ? (
      <Typography variant="body2" color="success.main">
        {t('cms.games.compiledOk')}
      </Typography>
    ) : null;

  const code = (
    <Stack spacing={1.5}>
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: 13 }}>{selected}</Box>
        {files[selected] !== undefined && (
          <CodeEditor
            path={selected}
            value={files[selected]!}
            height={wide ? 'calc(100vh - 330px)' : 480}
            onChange={(v) => {
              if (v !== files[selected]) change({ ...files, [selected]: v });
            }}
            onMount={(ed) => {
              editor.current = ed;
            }}
          />
        )}
      </Box>
      {errorPanel}
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
          <Grid size={{ lg: 2.5 }}>{fileList}</Grid>
          <Grid size={{ lg: 5.5 }}>{code}</Grid>
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
          {tab === 'code' ? (
            <Stack spacing={2}>
              {fileList}
              {code}
            </Stack>
          ) : (
            preview
          )}
        </Box>
      )}

      <NewFileDialog
        open={newFileOpen}
        existing={files}
        onClose={() => setNewFileOpen(false)}
        onCreate={(path) => {
          change({ ...files, [path]: '' });
          setSelected(path);
          setNewFileOpen(false);
        }}
      />

      <PublishDialog
        open={publishOpen}
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
      <ConfirmDialog
        open={deletePath !== null}
        title={t('cms.games.deleteTitle', { path: deletePath?.path ?? '' })}
        text={deletePath?.kind === 'asset' ? t('cms.games.deleteAssetText') : t('cms.games.deleteFileText')}
        confirmLabel={t('cms.games.deleteFile')}
        danger
        onConfirm={() => {
          if (!deletePath) return;
          if (deletePath.kind === 'file') {
            const next = { ...files };
            delete next[deletePath.path];
            change(next);
          } else {
            const next = { ...assets };
            delete next[deletePath.path];
            change(files, next);
          }
          setDeletePath(null);
        }}
        onClose={() => setDeletePath(null)}
      />
      <Snackbar open={Boolean(toast)} autoHideDuration={5000} onClose={() => setToast(null)} message={toast} />
    </Stack>
  );
}

function NewFileDialog({
  open,
  existing,
  onClose,
  onCreate,
}: {
  open: boolean;
  existing: GameFiles;
  onClose: () => void;
  onCreate: (path: string) => void;
}) {
  const [path, setPath] = useState('');
  useEffect(() => {
    if (open) setPath('');
  }, [open]);
  const clean = path.trim();
  const problem = !clean
    ? null
    : !GAME_PATH.test(clean) || clean.startsWith('assets/')
      ? t('cms.games.badFileName')
      : !isCodePath(clean)
        ? t('cms.games.badFileExt')
        : existing[clean] !== undefined
          ? t('cms.games.fileExists')
          : null;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('cms.games.newFile')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label={t('cms.games.fileName')}
          placeholder="utils.ts"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          error={Boolean(problem)}
          helperText={problem ?? t('cms.games.fileNameHint')}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" disabled={!clean || Boolean(problem)} onClick={() => onCreate(clean)}>
          {t('cms.games.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PublishDialog({
  open,
  version,
  latest,
  templateCount,
  busy,
  onClose,
  onPublish,
}: {
  open: boolean;
  version: string | null;
  latest: string | null;
  templateCount: number;
  busy: boolean;
  onClose: () => void;
  onPublish: (notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (open) setNotes('');
  }, [open]);
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('cms.games.publishTitle', { version: version ?? '' })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">
            {latest ? t('cms.games.publishTextUpdate', { latest }) : t('cms.games.publishTextFirst')}
          </Typography>
          {templateCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('cms.games.publishTemplates', { count: templateCount })}
            </Typography>
          )}
          <TextField
            label={t('cms.games.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={() => onPublish(notes)} disabled={busy}>
          {busy ? t('cms.games.publishing') : t('cms.games.publish')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
