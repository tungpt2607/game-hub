'use client';

import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { validateConfig } from '@opes/module-sdk';
import { MODULES } from '@opes/modules';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { PreviewFrame } from '../../../module-ui/PreviewFrame';
import { SchemaForm } from '../../../module-ui/SchemaForm';

/**
 * Phòng thử module: form cấu hình tự sinh bên trái, khung xem trước bên phải.
 * Chỉ để thử chuẩn module; cấu hình không được lưu (lưu nháp/công bố là việc của thư viện template, Bước 6).
 */
export default function PlaygroundPage() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const [moduleKey, setModuleKey] = useState(MODULES[0]?.key ?? '');
  const mod = MODULES.find((m) => m.key === moduleKey) ?? MODULES[0];
  const [configs, setConfigs] = useState<Record<string, unknown>>({});
  const [tab, setTab] = useState<'form' | 'preview'>('form');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetCount, setResetCount] = useState(0);

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
          <Button startIcon={<RestartAltIcon />} onClick={() => setConfirmReset(true)} sx={{ flexShrink: 0 }}>
            {t('cms.playground.reset')}
          </Button>
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
        open={confirmReset}
        title={t('cms.playground.resetTitle')}
        text={t('cms.playground.resetText')}
        confirmLabel={t('cms.playground.reset')}
        onConfirm={() => {
          setConfigs((prev) => {
            const next = { ...prev };
            delete next[mod.key];
            return next;
          });
          setResetCount((n) => n + 1);
          setConfirmReset(false);
        }}
        onClose={() => setConfirmReset(false)}
      />
    </Stack>
  );
}
