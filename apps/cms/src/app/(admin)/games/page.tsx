'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import type { GameModuleDetail, GameModuleListResponse, GameModuleSummary } from '@opes/contracts';
import { t } from '@opes/i18n';
import { CompileFailed, prepareNewGame } from '../../../games/import';
import { downloadBlob, exampleZip, readGameZip } from '../../../games/zip';

/** Hướng dẫn viết game (repo công khai). */
const GUIDE_URL = 'https://github.com/tungpt2607/game-hub/blob/main/docs/huong-dan/viet-game.md';
import { api, ApiRequestError, handleAuthError } from '../../../lib/api';

const formatDate = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/** Mục Game: danh sách game lưu trong cơ sở dữ liệu; tải lên game mới bằng file .zip. */
export default function GamesPage() {
  const router = useRouter();
  const [items, setItems] = useState<GameModuleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [importError, setImportError] = useState<{ message: string; lines: string[] } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setItems((await api<GameModuleListResponse>('/modules')).items);
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onZip(file: File) {
    setImportError(null);
    setStep(t('cms.games.readingZip'));
    try {
      const zip = await readGameZip(file);
      const prepared = await prepareNewGame(zip.files, zip.assets, setStep, (key) => {
        if (items?.some((m) => m.key === key)) throw new Error(t('cms.games.keyExists', { key }));
      });
      setStep(t('cms.games.creating'));
      const res = await api<{ module: GameModuleDetail }>('/modules', {
        method: 'POST',
        body: { files: prepared.files, assets: prepared.assets, schemaJs: prepared.schemaJs, runtimeJs: prepared.runtimeJs },
      });
      router.push(`/games/${encodeURIComponent(res.module.key)}${zip.skipped.length ? '?boQua=' + zip.skipped.length : ''}`);
    } catch (e) {
      if (handleAuthError(e)) return;
      if (e instanceof CompileFailed) {
        setImportError({ message: t('cms.games.compileFailed'), lines: e.message.split('\n') });
      } else {
        setImportError({ message: e instanceof Error ? e.message : String(e), lines: [] });
      }
      setStep(null);
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            {t('cms.games.heading')}
          </Typography>
          <Typography color="text.secondary">{t('cms.games.lead')}</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0, alignItems: 'flex-start' }}>
          <Button startIcon={<MenuBookOutlined />} href={GUIDE_URL} target="_blank" rel="noopener noreferrer">
            {t('cms.games.guide')}
          </Button>
          <Button
            startIcon={<DownloadOutlined />}
            onClick={() => {
              void exampleZip().then(({ key, blob }) => downloadBlob(blob, `${key}.zip`));
            }}
          >
            {t('cms.games.downloadExample')}
          </Button>
          <Button variant="contained" startIcon={<UploadFileOutlined />} onClick={() => input.current?.click()} disabled={step !== null}>
            {t('cms.games.uploadNew')}
          </Button>
          <input
            ref={input}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void onZip(file);
            }}
          />
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {importError && (
        <Alert severity="error" onClose={() => setImportError(null)}>
          {importError.message}
          {importError.lines.length > 0 && (
            <Box component="pre" sx={{ m: 0, mt: 1, whiteSpace: 'pre-wrap', fontSize: 13 }}>
              {importError.lines.slice(0, 20).join('\n')}
            </Box>
          )}
        </Alert>
      )}
      {!items && !error && <LinearProgress />}

      <Grid container spacing={2}>
        {(items ?? []).map((m) => (
          <Grid key={m.key} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea component={Link} href={`/games/${encodeURIComponent(m.key)}`} sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h6" fontWeight={700}>
                      {m.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
                      {m.description}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={<code>{m.key}</code>} variant="outlined" />
                      <Chip
                        size="small"
                        color={m.latestVersion ? 'success' : 'default'}
                        label={m.latestVersion ? `v${m.latestVersion}` : t('cms.games.unpublished')}
                      />
                      {m.hasDraft && <Chip size="small" color="warning" label={t('cms.games.hasDraft')} />}
                      {m.builtin && <Chip size="small" variant="outlined" label={t('cms.games.builtin')} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {t('cms.games.updated', { date: formatDate(m.draftUpdatedAt ?? m.updatedAt) })}
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={step !== null} fullWidth maxWidth="xs">
        <DialogTitle>{t('cms.games.uploadingTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>{step}</Typography>
            <LinearProgress />
          </Stack>
        </DialogContent>
        <DialogActions />
      </Dialog>
    </Stack>
  );
}
