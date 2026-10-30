'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import type { GameSource } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { PreviewFrame } from '../../../module-ui/PreviewFrame';
import { SchemaForm } from '../../../module-ui/SchemaForm';
import { CreateTemplateDialog } from '../../../module-ui/CreateTemplateDialog';
import { readPlayground, writePlayground } from '../../../module-ui/playground-storage';
import { useGameForm, useGameModules } from '../../../module-ui/useGame';

/**
 * Phòng thử module: form cấu hình tự sinh bên trái, khung xem trước bên phải.
 * Cấu hình được nhớ tạm trong trình duyệt; lưu thật (nháp/công bố) nằm ở Thư viện template.
 */
export default function PlaygroundPage() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { modules, error: modulesError } = useGameModules();
  const [moduleKey, setModuleKey] = useState('');
  const mod = modules?.find((m) => m.key === moduleKey) ?? modules?.[0];
  const [configs, setConfigs] = useState<Record<string, unknown>>({});
  const [tab, setTab] = useState<'form' | 'preview'>('form');
  const [presetMenu, setPresetMenu] = useState<HTMLElement | null>(null);
  /** Mẫu đang chờ xác nhận: id mẫu, hoặc '' = cấu hình mặc định. */
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  /** Game đã chuẩn hóa cấu hình nhớ trong trình duyệt theo lược đồ hiện tại. */
  const normalized = useRef(new Set<string>());

  // Đọc cấu hình đã nhớ (sau khi trang hiện, vì máy chủ không có localStorage).
  useEffect(() => {
    const stored = readPlayground();
    setConfigs(stored.configs ?? {});
    if (stored.moduleKey) setModuleKey(stored.moduleKey);
    setLoaded(true);
  }, []);

  const source = useMemo<GameSource | null>(
    () => (mod?.latestVersion ? { kind: 'version', key: mod.key, version: mod.latestVersion } : null),
    [mod?.key, mod?.latestVersion],
  );
  const stored = mod ? configs[mod.key] : undefined;
  const game = useGameForm(source, stored);
  const schema = game.schema;
  const { normalize } = game;

  // Cấu hình nhớ từ trước có thể thiếu trường mới: chuẩn hóa theo lược đồ một lần khi tải game.
  useEffect(() => {
    if (!schema || !loaded || normalized.current.has(schema.key)) return;
    normalized.current.add(schema.key);
    const raw = configs[schema.key];
    if (raw === undefined) return;
    normalize(raw).then(
      (next) => {
        setConfigs((prev) => ({ ...prev, [schema.key]: next }));
        setResetCount((n) => n + 1);
      },
      () => {},
    );
  }, [schema, loaded, configs, normalize]);

  useEffect(() => {
    if (!loaded || !mod) return;
    const timer = setTimeout(() => {
      writePlayground({ moduleKey: mod.key, configs });
    }, 300);
    return () => clearTimeout(timer);
  }, [loaded, mod, configs]);

  // Chưa có cấu hình riêng thì dùng mặc định (form luôn tạo object mới khi thay đổi).
  const config = schema ? (configs[schema.key] ?? schema.defaults) : null;
  const errors = game.check?.errors ?? {};
  const errorCount = Object.keys(errors).length;

  if (modulesError) return <Alert severity="error">{t('common.networkError')}</Alert>;
  if (!modules) return <LinearProgress />;
  if (!mod || !source) return <Alert severity="info">Chưa có module nào.</Alert>;

  const setConfig = (next: unknown) => setConfigs((prev) => ({ ...prev, [mod.key]: next }));

  const form = game.error ? (
    <Alert severity="error">{t('cms.templates.gameLoadFailed', { message: game.error })}</Alert>
  ) : !schema || schema.key !== mod.key ? (
    <LinearProgress />
  ) : (
    <Stack spacing={2}>
      {!game.check ? null : errorCount === 0 ? (
        <Alert severity="success">{t('cms.playground.valid')}</Alert>
      ) : (
        <Alert severity="info">{t('cms.playground.invalid', { count: errorCount })}</Alert>
      )}
      <SchemaForm
        key={`${mod.key}-${resetCount}`}
        fields={schema.fields}
        value={config}
        errors={errors}
        hidden={game.check?.hidden}
        labels={game.check?.labels}
        onChange={setConfig}
      />
    </Stack>
  );
  const preview = <PreviewFrame key={mod.key} source={source} config={config} />;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            {t('cms.playground.heading')}
          </Typography>
          <Typography color="text.secondary">{t('cms.playground.lead')}</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label={t('cms.playground.module')}
            value={mod.key}
            onChange={(e) => setModuleKey(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {modules.map((m) => (
              <MenuItem key={m.key} value={m.key}>
                {m.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            startIcon={<AutoAwesomeOutlined />}
            onClick={(e) => setPresetMenu(e.currentTarget)}
            sx={{ flexShrink: 0 }}
          >
            {t('cms.playground.usePreset')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            {t('cms.playground.createTemplate')}
          </Button>
          <Menu anchorEl={presetMenu} open={Boolean(presetMenu)} onClose={() => setPresetMenu(null)}>
            {(mod.presets ?? []).map((p) => (
              <MenuItem
                key={p.id}
                onClick={() => {
                  setPresetMenu(null);
                  setPendingPreset(p.id);
                }}
              >
                <ListItemText primary={p.name} secondary={p.description} />
              </MenuItem>
            ))}
            <MenuItem
              onClick={() => {
                setPresetMenu(null);
                setPendingPreset('');
              }}
            >
              <ListItemText primary={t('cms.playground.defaults')} secondary={t('cms.playground.defaultsHint')} />
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        {mod.description} · <code>{mod.key}</code> v{mod.latestVersion}
      </Typography>

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

      <CreateTemplateDialog
        open={createOpen}
        mode={{ type: 'config', moduleKey: mod.key, config: (config ?? {}) as Record<string, unknown> }}
        onClose={() => setCreateOpen(false)}
      />
      <ConfirmDialog
        open={pendingPreset !== null}
        title={t('cms.playground.presetTitle', {
          name:
            pendingPreset === ''
              ? t('cms.playground.defaults')
              : (mod.presets?.find((p) => p.id === pendingPreset)?.name ?? ''),
        })}
        text={t('cms.playground.presetText')}
        confirmLabel={t('cms.playground.presetConfirm')}
        onConfirm={() => {
          const preset = mod.presets?.find((p) => p.id === pendingPreset);
          setConfigs((prev) => {
            const next = { ...prev };
            if (preset) next[mod.key] = structuredClone(preset.config);
            else delete next[mod.key];
            return next;
          });
          setResetCount((n) => n + 1);
          setPendingPreset(null);
        }}
        onClose={() => setPendingPreset(null)}
      />
    </Stack>
  );
}
