'use client';

import { useEffect, useMemo, useState } from 'react';
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
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import { normalizeConfig, validateConfig } from '@opes/module-sdk';
import { MODULES } from '@opes/modules';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { PreviewFrame } from '../../../module-ui/PreviewFrame';
import { SchemaForm } from '../../../module-ui/SchemaForm';

/** Nơi nhớ tạm cấu hình phòng thử trong trình duyệt (chỉ trên máy này). */
const STORAGE_KEY = 'opes-playground:v1';

interface Stored {
  moduleKey?: string;
  configs?: Record<string, unknown>;
}

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

/**
 * Phòng thử module: form cấu hình tự sinh bên trái, khung xem trước bên phải.
 * Cấu hình được nhớ tạm trong trình duyệt; lưu thật (nháp/công bố) nằm ở Thư viện template.
 */
export default function PlaygroundPage() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const [moduleKey, setModuleKey] = useState(MODULES[0]?.key ?? '');
  const mod = MODULES.find((m) => m.key === moduleKey) ?? MODULES[0];
  const [configs, setConfigs] = useState<Record<string, unknown>>({});
  const [tab, setTab] = useState<'form' | 'preview'>('form');
  const [presetMenu, setPresetMenu] = useState<HTMLElement | null>(null);
  /** Mẫu đang chờ xác nhận: id mẫu, hoặc '' = cấu hình mặc định. */
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Đọc cấu hình đã nhớ (sau khi trang hiện, vì máy chủ không có localStorage).
  useEffect(() => {
    const stored = readStored();
    const configs: Record<string, unknown> = {};
    for (const m of MODULES) {
      const raw = stored.configs?.[m.key];
      if (raw !== undefined) configs[m.key] = normalizeConfig(m.fields, raw, m.defaults);
    }
    setConfigs(configs);
    if (stored.moduleKey && MODULES.some((m) => m.key === stored.moduleKey)) setModuleKey(stored.moduleKey);
    setResetCount((n) => n + 1);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ moduleKey, configs } satisfies Stored));
      } catch {
        // Trình duyệt chặn lưu trữ: phòng thử vẫn chạy, chỉ không nhớ được.
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [loaded, moduleKey, configs]);

  // Cấu hình mặc định không bị sửa trực tiếp (form luôn tạo object mới khi thay đổi).
  const config = mod ? (configs[mod.key] ?? mod.defaults) : null;
  const errors = useMemo(() => (mod ? validateConfig(mod.fields, config) : {}), [mod, config]);
  const errorCount = Object.keys(errors).length;

  if (!mod) return <Alert severity="info">Chưa có module nào.</Alert>;

  const setConfig = (next: unknown) => setConfigs((prev) => ({ ...prev, [mod.key]: next }));

  const form = (
    <Stack spacing={2}>
      {errorCount === 0 ? (
        <Alert severity="success">{t('cms.playground.valid')}</Alert>
      ) : (
        <Alert severity="info">{t('cms.playground.invalid', { count: errorCount })}</Alert>
      )}
      <SchemaForm key={`${mod.key}-${resetCount}`} fields={mod.fields} value={config} errors={errors} onChange={setConfig} />
    </Stack>
  );
  const preview = <PreviewFrame key={mod.key} module={mod} config={config} />;

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            {t('cms.playground.heading')}
          </Typography>
          <Typography color="text.secondary">{t('cms.playground.lead')}</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            select
            size="small"
            label={t('cms.playground.module')}
            value={mod.key}
            onChange={(e) => setModuleKey(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {MODULES.map((m) => (
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
        {mod.description} · <code>{mod.key}</code> v{mod.version}
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
