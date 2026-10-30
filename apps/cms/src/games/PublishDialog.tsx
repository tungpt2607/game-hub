'use client';

import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { GameVersionDetail } from '@opes/contracts';
import { t } from '@opes/i18n';
import { api } from '../lib/api';
import { ChangeList } from './ChangeList';
import { diffPackages } from './changes';
import type { GameAssets, GameFiles } from './types';

interface Props {
  open: boolean;
  moduleKey: string;
  /** Phiên bản ghi trong schema.ts của bản sắp phát hành. */
  version: string | null;
  /** Phiên bản đang chạy (null = chưa phát hành lần nào). */
  latest: string | null;
  templateCount: number;
  files: GameFiles;
  assets: GameAssets;
  busy: boolean;
  onClose: () => void;
  onPublish: (notes: string) => void;
}

/** Hộp phát hành: ghi chú thay đổi và danh sách file khác với bản đang chạy (xem khác biệt từng dòng). */
export function PublishDialog({ open, moduleKey, version, latest, templateCount, files, assets, busy, onClose, onPublish }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [notes, setNotes] = useState('');
  const [current, setCurrent] = useState<{ files: GameFiles; assets: GameAssets } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNotes('');
    setLoadError(null);
    if (!latest) {
      setCurrent({ files: {}, assets: {} });
      return;
    }
    let alive = true;
    setCurrent(null);
    api<GameVersionDetail>(`/modules/${encodeURIComponent(moduleKey)}/versions/${encodeURIComponent(latest)}`).then(
      (v) => alive && setCurrent({ files: v.files, assets: v.assets }),
      (e: unknown) => alive && setLoadError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      alive = false;
    };
  }, [open, moduleKey, latest]);

  const changes = useMemo(() => (current ? diffPackages(current, { files, assets }) : null), [current, files, assets]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle>{t('cms.games.publishTitle', { version: version ?? '' })}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
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
          <Typography variant="subtitle2">
            {latest
              ? t('cms.diff.titleVsLatest', { version: latest, count: changes?.length ?? 0 })
              : t('cms.diff.titleFirst', { count: changes?.length ?? 0 })}
          </Typography>
          {loadError && <Alert severity="warning">{t('cms.diff.loadFailed', { message: loadError })}</Alert>}
          {!changes && !loadError && <LinearProgress />}
          {changes && <ChangeList changes={changes} />}
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
