'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AudiotrackOutlined from '@mui/icons-material/AudiotrackOutlined';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { MediaItem, MediaListResponse } from '@opes/contracts';
import type { MediaRef } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { api, ApiRequestError, handleAuthError } from '../lib/api';
import { precheck, uploadFile } from '../lib/media-upload';

const ACCEPT = {
  image: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
  audio: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav',
};

export const toMediaRef = (item: MediaItem): MediaRef => ({
  id: item.id,
  url: item.url,
  name: item.originalName ?? undefined,
});

interface Props {
  open: boolean;
  kind: 'image' | 'audio';
  onClose: () => void;
  onPick: (ref: MediaRef) => void;
}

/** Hộp chọn file từ thư viện Media, có tìm kiếm và tải lên ngay tại chỗ. */
export function MediaPickerDialog({ open, kind, onClose, onPick }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fail = useCallback((e: unknown) => {
    if (handleAuthError(e)) return;
    setError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
  }, []);

  const load = useCallback(
    async (after: string | null) => {
      const params = new URLSearchParams({ kind });
      if (debounced) params.set('q', debounced);
      if (after) params.set('cursor', after);
      try {
        const res = await api<MediaListResponse>(`/media?${params.toString()}`);
        setItems((prev) => (after && prev ? [...prev, ...res.items] : res.items));
        setCursor(res.nextCursor);
      } catch (e) {
        fail(e);
        if (!after) setItems([]);
      }
    },
    [kind, debounced, fail],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setItems(null);
    void load(null);
  }, [open, load]);

  async function handleUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const problem = precheck(file);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { item } = await uploadFile(file);
      if (item.kind !== kind) {
        setError(t('cms.media.noMatch'));
        await load(null);
      } else {
        onPick(toMediaRef(item));
      }
    } catch (e) {
      fail(e);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle>{kind === 'image' ? t('cms.mediaPicker.titleImage') : t('cms.mediaPicker.titleAudio')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('cms.mediaPicker.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT[kind]}
              hidden
              onChange={(e) => void handleUpload(e.target.files)}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              sx={{ flexShrink: 0 }}
            >
              {t('cms.mediaPicker.upload')}
            </Button>
          </Stack>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {(uploading || items === null) && <LinearProgress />}
          {items?.length === 0 && <Typography color="text.secondary">{t('cms.mediaPicker.empty')}</Typography>}
          <Grid container spacing={1.5}>
            {items?.map((item) => (
              <Grid key={item.id} size={{ xs: 4, sm: 3, md: 2 }}>
                <ButtonBase
                  onClick={() => onPick(toMediaRef(item))}
                  sx={{
                    width: '100%',
                    display: 'block',
                    textAlign: 'left',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    overflow: 'hidden',
                    '&:hover, &.Mui-focusVisible': { borderColor: 'primary.main' },
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      display: 'grid',
                      placeItems: 'center',
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                      backgroundImage:
                        kind === 'image'
                          ? 'repeating-conic-gradient(rgba(0,0,0,.06) 0% 25%, transparent 0% 50%)'
                          : undefined,
                      backgroundSize: '12px 12px',
                      p: 0.5,
                    }}
                  >
                    {kind === 'image' ? (
                      <img
                        src={item.url}
                        alt=""
                        loading="lazy"
                        style={{
                          position: 'absolute',
                          inset: 4,
                          width: 'calc(100% - 8px)',
                          height: 'calc(100% - 8px)',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <AudiotrackOutlined color="action" fontSize="large" />
                    )}
                  </Box>
                  <Typography variant="caption" noWrap component="div" sx={{ px: 0.75, py: 0.5 }}>
                    {item.originalName}
                  </Typography>
                </ButtonBase>
              </Grid>
            ))}
          </Grid>
          {cursor && (
            <Box>
              <Button onClick={() => void load(cursor)}>{t('common.loadMore')}</Button>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </DialogActions>
    </Dialog>
  );
}
