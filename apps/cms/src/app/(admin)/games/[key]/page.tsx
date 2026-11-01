'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import HistoryIcon from '@mui/icons-material/History';
import PublishIcon from '@mui/icons-material/Publish';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { compareVersions } from '@opes/contracts';
import type { GameSource, SerializedSchema } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { uploadAssets } from '../../../../games/assets';
import type { PendingAsset } from '../../../../games/types';
import { Workspace, type WorkspaceHandle } from '../../../../games/workspace/Workspace';
import { diffPackages } from '../../../../games/changes';
import { LocalDraftBanner } from '../../../../games/LocalDraftBanner';
import { PublishDialog } from '../../../../games/PublishDialog';
import { LeaveGuard } from '../../../../components/LeaveGuard';
import { downloadBlob, readGameZip, writeGameZip } from '../../../../games/zip';
import { ApiRequestError, handleAuthError } from '../../../../lib/api';
import { Toast } from '../../../../components/ui/Toast';
import { EditorHeader } from '../../../../components/ui/EditorHeader';
import { SplitView } from '../../../../components/ui/SplitView';
import { fetchGameVersion } from '../../../../games/game-api';
import { useGameCompile } from '../../../../games/useGameCompile';
import { useGameDraft } from '../../../../games/useGameDraft';
import { GamePreviewPanel } from '../../../../games/GamePreviewPanel';
import { GameStatusLine } from '../../../../games/GameStatusLine';
import { GameHistoryDialog } from '../../../../games/GameHistoryDialog';
import { LoadErrorView } from '../../../../components/ui/LoadErrorView';

/** Màn sửa code một game: file code, file kèm, biên dịch tự động, chạy thử, lưu nháp, phát hành. */
export default function GameEditorPage() {
  const { key: rawKey } = useParams<{ key: string }>();
  const moduleKey = decodeURIComponent(rawKey);
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));

  const {
    mod,
    files,
    assets,
    savedFiles,
    localOffer,
    loadError,
    conflict,
    setConflict,
    dirty,
    serverBase,
    load,
    change,
    restoreLocal,
    discardLocal,
    save,
    publish,
    discardDraft,
  } = useGameDraft(moduleKey);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [schema, setSchema] = useState<SerializedSchema | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [presetId, setPresetId] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState<string | null>(null);
  const workspace = useRef<WorkspaceHandle>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  /** Code sẽ lưu: qua "tự định dạng khi lưu" của trình sửa code nếu đang bật. */
  const prepareSave = async () => workspace.current?.prepareSave();

  // Vừa tạo game từ .zip có file bị bỏ qua: báo một lần.
  useEffect(() => {
    const skipped = new URLSearchParams(window.location.search).get('boQua');
    if (skipped) setToast(t('cms.games.skippedFiles', { count: skipped }));
  }, []);

  const { compile, runtimeJs } = useGameCompile(mod !== null, files, assets);

  const source = useMemo<GameSource | null>(
    () => (runtimeJs ? { kind: 'code', code: runtimeJs, label: moduleKey } : null),
    [runtimeJs, moduleKey],
  );
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

  /** Chạy một thao tác: đánh dấu đang bận, hiện lỗi nếu có. */
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
      await save(prepareSave);
      setToast(t('cms.games.saved'));
    });

  const onPublish = (notes: string) =>
    run('publish', async () => {
      const published = await publish(notes, prepareSave);
      if (!published) return;
      setPublishOpen(false);
      setToast(t('cms.games.publishedToast', { version: published.latestVersion ?? '' }));
    });

  const onDiscard = () =>
    run('discard', async () => {
      await discardDraft();
      setDiscardOpen(false);
      setToast(t('cms.games.discarded'));
    });

  const onDownload = (version?: string) =>
    run('download', async () => {
      let f = files;
      let a = assets;
      let name = `${moduleKey}-${dirty || mod?.draft ? 'ban-nhap' : (mod?.latestVersion ?? '')}`;
      if (version) {
        const v = await fetchGameVersion(moduleKey, version);
        f = v.files;
        a = v.assets;
        name = `${moduleKey}-${version}`;
      }
      downloadBlob(await writeGameZip(f, a), `${name}.zip`);
    });

  const onRestore = () =>
    run('restore', async () => {
      if (!restoreVersion) return;
      const v = await fetchGameVersion(moduleKey, restoreVersion);
      change(v.files, v.assets);
      setRestoreVersion(null);
      setHistoryOpen(false);
      setToast(t('cms.games.restoredToast', { version: v.version }));
    });

  const onZip = (file: File) =>
    run('zip', async () => {
      const zip = await readGameZip(file);
      const uploaded = await uploadAssets(
        moduleKey,
        zip.assets,
        (done, total) => total && setBusy(`zip:${done}/${total}`),
      );
      change(zip.files, uploaded);
      setToast(
        zip.skipped.length
          ? t('cms.games.zipLoadedSkipped', {
              count: zip.skipped.length,
              list: zip.skipped.slice(0, 3).join(', '),
            })
          : t('cms.games.zipLoaded'),
      );
    });

  if (loadError) {
    return (
      <LoadErrorView message={loadError} backHref="/games" backLabel={t('cms.games.backToList')} />
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
    <GameStatusLine mod={mod} dirty={dirty} hasDraft={hasDraft} draftVersion={draftVersion} />
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
        onNotice={(message, severity) =>
          severity === 'error' ? setError(message) : setToast(message)
        }
      />
    </Stack>
  );

  const preview = (
    <GamePreviewPanel
      schema={schema}
      presetId={presetId}
      onPresetChange={setPresetId}
      source={source}
      config={previewConfig}
      onSchema={onSchema}
    />
  );

  return (
    <Stack spacing={2}>
      <EditorHeader
        backHref="/games"
        backLabel={t('cms.games.backToList')}
        title={mod.name}
        status={status}
        actions={
          <>
            <Button
              startIcon={<UploadFileOutlined />}
              onClick={() => zipInput.current?.click()}
              disabled={busy !== null}
            >
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
            <Button
              startIcon={<DownloadOutlined />}
              onClick={() => void onDownload()}
              disabled={busy !== null}
            >
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
            <Button
              variant="outlined"
              startIcon={<SaveOutlined />}
              onClick={() => void onSave()}
              disabled={!dirty || busy !== null}
            >
              {busy === 'save' ? t('cms.games.saving') : t('cms.games.saveDraft')}
            </Button>
            <Tooltip
              title={
                canPublish
                  ? ''
                  : (versionProblem ??
                    (hasDraft ? t('cms.games.fixBeforePublish') : t('cms.games.nothingToPublish')))
              }
            >
              <span>
                <Button
                  variant="contained"
                  startIcon={<PublishIcon />}
                  onClick={() => setPublishOpen(true)}
                  disabled={!canPublish}
                >
                  {t('cms.games.publish')}
                </Button>
              </span>
            </Tooltip>
          </>
        }
      />

      {busy?.startsWith('zip:') && (
        <Alert severity="info">{t('cms.games.uploadingAssets', { progress: busy.slice(4) })}</Alert>
      )}
      {busy !== null && <LinearProgress />}
      {localOffer && (
        <LocalDraftBanner
          savedAt={localOffer.savedAt}
          fileCount={diffPackages({ files, assets }, localOffer).length}
          outdated={localOffer.base !== serverBase}
          onRestore={restoreLocal}
          onDiscard={discardLocal}
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
      {previewError && (
        <Alert severity="error">{t('cms.games.runtimeError', { message: previewError })}</Alert>
      )}
      {mod.templateCount > 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('cms.games.templateCount', { count: mod.templateCount })}
        </Typography>
      )}

      <SplitView
        wide={wide}
        main={code}
        side={preview}
        mainLabel={t('cms.games.tabCode')}
        sideLabel={t('cms.games.tabPreview')}
        mainSize={{ lg: 8 }}
        sideSize={{ lg: 4 }}
      />

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

      <GameHistoryDialog
        open={historyOpen}
        mod={mod}
        busy={busy !== null}
        onDownload={(version) => void onDownload(version)}
        onUseAsDraft={setRestoreVersion}
        onClose={() => setHistoryOpen(false)}
      />

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
      <Toast message={toast} onClose={() => setToast(null)} duration={5000} />
    </Stack>
  );
}
