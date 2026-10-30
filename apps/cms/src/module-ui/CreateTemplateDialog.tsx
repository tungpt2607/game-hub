'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { TemplateDetail, TemplateSource, TemplateSummary } from '@opes/contracts';
import { t } from '@opes/i18n';
import { api, ApiRequestError, handleAuthError } from '../lib/api';
import { readPlaygroundConfig } from './playground-storage';
import { TemplateThumb } from './TemplateThumb';
import { useGameModules } from './useGame';

export type CreateMode =
  | { type: 'new' }
  | { type: 'duplicate'; template: TemplateSummary }
  | { type: 'config'; moduleKey: string; config: Record<string, unknown> };

interface Choice {
  id: string;
  title: string;
  subtitle?: string;
  config: Record<string, unknown>;
  source: TemplateSource;
}

/** Hộp tạo template: chọn loại game và điểm bắt đầu (mẫu, mặc định, Phòng thử), hoặc nhân bản. */
export function CreateTemplateDialog({ open, mode, onClose }: { open: boolean; mode: CreateMode; onClose: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [note, setNote] = useState('');
  const { modules } = useGameModules();
  const [moduleKey, setModuleKey] = useState('');
  const [choiceId, setChoiceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [playground, setPlayground] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFields({});
    setBusy(false);
    if (mode.type === 'duplicate') {
      setName(`${mode.template.name} (bản sao)`);
      setBrandName(mode.template.brandName ?? '');
      setNote(mode.template.note ?? '');
    } else {
      setName('');
      setBrandName('');
      setNote('');
      if (mode.type === 'config') setModuleKey(mode.moduleKey);
    }
    // Chỉ đặt lại khi mở hộp; `mode` có thể là object mới ở mỗi lần render của trang cha.
  }, [open]);

  const mod = modules?.find((m) => m.key === moduleKey) ?? (moduleKey ? undefined : modules?.[0]);
  const selectedKey = mod?.key ?? moduleKey;
  useEffect(() => {
    if (open && mode.type === 'new' && selectedKey) setPlayground(readPlaygroundConfig(selectedKey));
  }, [open, mode.type, selectedKey]);

  const choices: Choice[] =
    mode.type === 'new' && mod
      ? [
          ...(mod.presets ?? []).map((p) => ({
            id: `preset:${p.id}`,
            title: p.name,
            subtitle: p.description,
            config: p.config,
            source: { type: 'preset', presetId: p.id } as TemplateSource,
          })),
          {
            id: 'defaults',
            title: t('cms.templates.fromDefaults'),
            config: mod.defaults,
            source: { type: 'defaults' },
          },
          ...(playground
            ? [
                {
                  id: 'playground',
                  title: t('cms.templates.fromPlayground'),
                  subtitle: t('cms.templates.fromPlaygroundHint'),
                  config: playground,
                  source: { type: 'config', config: playground } as TemplateSource,
                },
              ]
            : []),
        ]
      : [];

  useEffect(() => {
    if (choices.length > 0 && !choices.some((c) => c.id === choiceId)) setChoiceId(choices[0]!.id);
  }, [choices, choiceId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    let source: TemplateSource | undefined;
    if (mode.type === 'duplicate') source = { type: 'duplicate', templateId: mode.template.id };
    else if (mode.type === 'config') source = { type: 'config', config: mode.config };
    else source = choices.find((c) => c.id === choiceId)?.source;
    if (!source) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ template: TemplateDetail }>('/templates', {
        method: 'POST',
        body: { name, brandName, note, moduleKey: mode.type === 'duplicate' ? undefined : selectedKey, source },
      });
      router.push(`/templates/${res.template.id}`);
    } catch (err) {
      if (handleAuthError(err)) return;
      if (err instanceof ApiRequestError) {
        setError(err.message);
        setFields(err.fields);
      } else setError(t('common.networkError'));
      setBusy(false);
    }
  }

  const title =
    mode.type === 'duplicate'
      ? t('cms.templates.duplicateTitle')
      : mode.type === 'config'
        ? t('cms.templates.fromPlaygroundTitle')
        : t('cms.templates.createTitle');

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <form onSubmit={submit} noValidate>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('cms.templates.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                fullWidth
                error={Boolean(fields.name)}
                helperText={fields.name ?? t('cms.templates.nameHint')}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                label={t('cms.templates.brandName')}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                fullWidth
                helperText={t('cms.templates.brandHint')}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
            </Stack>
            <TextField
              label={t('cms.templates.note')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
            {mode.type === 'new' && (
              <>
                <TextField
                  select
                  label={t('cms.templates.module')}
                  value={modules ? selectedKey : ''}
                  onChange={(e) => setModuleKey(e.target.value)}
                  sx={{ maxWidth: 320 }}
                >
                  {(modules ?? []).map((m) => (
                    <MenuItem key={m.key} value={m.key}>
                      {m.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('cms.templates.startFrom')}
                  </Typography>
                  <Grid container spacing={1.5}>
                    {choices.map((c) => {
                      const selected = c.id === choiceId;
                      return (
                        <Grid key={c.id} size={{ xs: 6, sm: 4, md: 3 }}>
                          <ButtonBase
                            onClick={() => setChoiceId(c.id)}
                            aria-pressed={selected}
                            sx={{
                              width: '100%',
                              display: 'block',
                              textAlign: 'left',
                              borderRadius: 2,
                              overflow: 'hidden',
                              border: 2,
                              borderColor: selected ? 'primary.main' : 'divider',
                            }}
                          >
                            <TemplateThumb config={c.config} height={110} />
                            <Box sx={{ p: 1 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {c.title}
                              </Typography>
                              {c.subtitle && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                  {c.subtitle}
                                </Typography>
                              )}
                            </Box>
                          </ButtonBase>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              </>
            )}
            {mode.type !== 'new' && (
              <Box sx={{ maxWidth: 220, borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                <TemplateThumb config={mode.type === 'duplicate' ? mode.template.config : mode.config} height={120} />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={busy || !name.trim()}>
            {t('cms.templates.createSubmit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
