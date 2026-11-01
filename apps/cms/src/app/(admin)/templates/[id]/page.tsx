'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import EditOutlined from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/History';
import LinkIcon from '@mui/icons-material/Link';
import PublishIcon from '@mui/icons-material/Publish';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import type { TemplateVersionResponse } from '@opes/contracts';
import type { GameSource } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { LeaveGuard } from '../../../../components/LeaveGuard';
import { ApiRequestError, handleAuthError, errorMessage } from '../../../../lib/api';
import { formatDateTime } from '../../../../lib/format';
import { PreviewFrame } from '../../../../module-ui/PreviewFrame';
import { PreviewLinksDialog } from '../../../../module-ui/preview-links/PreviewLinksDialog';
import { SchemaForm } from '../../../../module-ui/SchemaForm';
import { StatusChip } from '../../../../module-ui/StatusChip';
import { useGameForm } from '../../../../module-ui/useGame';
import { Toast } from '../../../../components/ui/Toast';
import { EditorHeader } from '../../../../components/ui/EditorHeader';
import { LoadErrorView } from '../../../../components/ui/LoadErrorView';
import { SplitView } from '../../../../components/ui/SplitView';
import { TemplateHistoryDialog } from '../../../../templates/TemplateHistoryDialog';
import { TemplateInfoDialog } from '../../../../templates/TemplateInfoDialog';
import { TemplateVersionDialog } from '../../../../templates/TemplateVersionDialog';
import { useTemplateDraft } from '../../../../templates/useTemplateDraft';

/** Màn chỉnh template: form trái, xem trước phải; Lưu nháp, Công bố, lịch sử công bố. */
export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const {
    template,
    draft,
    dirty,
    formKey,
    loadError,
    conflict,
    setConflict,
    load,
    update,
    save,
    publish,
    upgrade,
    restore,
    fetchVersion,
  } = useTemplateDraft(id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'publish' | 'restore' | 'upgrade' | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [viewing, setViewing] = useState<TemplateVersionResponse | null>(null);
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null);

  // Bản nháp chạy bằng phiên bản game template đang dùng (đổi khi bấm "Nâng lên bản mới").
  const moduleKey = template?.moduleKey;
  const moduleVersion = template?.moduleVersion;
  const source = useMemo<GameSource | null>(
    () =>
      moduleKey && moduleVersion
        ? { kind: 'version', key: moduleKey, version: moduleVersion }
        : null,
    [moduleKey, moduleVersion],
  );
  const game = useGameForm(source, draft?.config);

  const errors = game.check?.errors ?? template?.errors ?? {};
  const errorCount = Object.keys(errors).length;

  const fail = (e: unknown) => {
    if (handleAuthError(e)) return;
    if (e instanceof ApiRequestError && e.code === 'TEMPLATE_CONFLICT') {
      setConflict(true);
      return;
    }
    setError(errorMessage(e));
  };

  /** Chạy một thao tác: đánh dấu đang bận, hiện lỗi nếu có; `after` luôn chạy khi xong. */
  async function run(label: NonNullable<typeof busy>, fn: () => Promise<void>, after?: () => void) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
      after?.();
    }
  }

  const onSave = () =>
    run('save', async () => {
      await save();
      setToast(t('cms.templates.saved'));
    });

  const onPublish = () =>
    run('publish', async () => {
      const next = await publish();
      if (next) setToast(t('cms.templates.publishedToast', { version: next.publishedVersion }));
    });

  const onUpgrade = () =>
    run(
      'upgrade',
      async () => {
        const next = await upgrade();
        if (next) setToast(t('cms.templates.upgradedToast', { version: next.moduleVersion }));
      },
      () => setUpgradeOpen(false),
    );

  async function viewVersion(version: number) {
    try {
      setViewing(await fetchVersion(version));
    } catch (e) {
      fail(e);
    }
  }

  const onRestore = () => {
    if (restoreVersion === null) return;
    const version = restoreVersion;
    return run(
      'restore',
      async () => {
        await restore(version);
        setToast(t('cms.templates.restoredToast', { version }));
        setViewing(null);
        setHistoryOpen(false);
      },
      () => setRestoreVersion(null),
    );
  };

  if (loadError) {
    return (
      <LoadErrorView
        message={loadError}
        backHref="/templates"
        backLabel={t('cms.templates.backToList')}
      />
    );
  }
  if (!template || !draft || !source) return <LinearProgress />;

  const archived = template.status === 'archived';
  const checked = game.check !== null;
  const canPublish =
    checked && !archived && errorCount === 0 && (dirty || template.hasUnpublishedChanges);
  const canUpgrade =
    !archived &&
    template.latestModuleVersion !== null &&
    template.latestModuleVersion !== template.moduleVersion;
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
      <StatusChip
        template={{ ...template, hasUnpublishedChanges: template.hasUnpublishedChanges || dirty }}
      />
      {dirty && (
        <Typography variant="body2" color="warning.main">
          {t('cms.templates.unsaved')}
        </Typography>
      )}
      {template.publishedAt && (
        <Typography variant="body2" color="text.secondary">
          {t('cms.templates.lastPublished', { date: formatDateTime(template.publishedAt) })}
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
      {errorCount > 0 && (
        <Alert severity="info">{t('cms.playground.invalid', { count: errorCount })}</Alert>
      )}
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
      <EditorHeader
        backHref="/templates"
        backLabel={t('cms.templates.backToList')}
        title={draft.name}
        titleAction={
          !archived && (
            <IconButton
              size="small"
              onClick={() => setInfoOpen(true)}
              aria-label={t('cms.templates.editInfo')}
            >
              <EditOutlined fontSize="small" />
            </IconButton>
          )
        }
        status={
          <>
            <Typography variant="body2" color="text.secondary" noWrap>
              {[draft.brandName, `${template.moduleName} v${template.moduleVersion}`]
                .filter(Boolean)
                .join(' · ')}
            </Typography>
            {statusLine}
          </>
        }
        actions={
          <>
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
                    {busy === 'publish'
                      ? t('cms.templates.publishing')
                      : t('cms.templates.publish')}
                  </Button>
                </span>
              </Tooltip>
            )}
          </>
        }
      />

      {archived && <Alert severity="warning">{t('cms.templates.archivedHint')}</Alert>}
      {canUpgrade && (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setUpgradeOpen(true)}
              disabled={busy !== null}
            >
              {t('cms.templates.upgrade')}
            </Button>
          }
        >
          {t('cms.templates.upgradeHint', {
            current: template.moduleVersion,
            latest: template.latestModuleVersion ?? '',
          })}
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

      <SplitView
        wide={wide}
        main={form}
        side={preview}
        mainLabel={t('cms.playground.tabForm')}
        sideLabel={t('cms.playground.tabPreview')}
        mainSize={{ md: 6, lg: 7 }}
        sideSize={{ md: 6, lg: 5 }}
        spacing={3}
      />

      <TemplateInfoDialog
        open={infoOpen}
        draft={draft}
        onClose={() => setInfoOpen(false)}
        onApply={(info) => {
          update(info);
          setInfoOpen(false);
        }}
      />

      <PreviewLinksDialog
        open={linksOpen}
        template={template}
        onClose={() => setLinksOpen(false)}
      />

      <TemplateHistoryDialog
        open={historyOpen}
        template={template}
        canRestore={!archived}
        onView={(version) => void viewVersion(version)}
        onRestore={setRestoreVersion}
        onClose={() => setHistoryOpen(false)}
      />

      <TemplateVersionDialog
        viewing={viewing}
        moduleKey={template.moduleKey}
        canRestore={!archived}
        onRestore={setRestoreVersion}
        onClose={() => setViewing(null)}
      />

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
      <Toast message={toast} onClose={() => setToast(null)} />
    </Stack>
  );
}
