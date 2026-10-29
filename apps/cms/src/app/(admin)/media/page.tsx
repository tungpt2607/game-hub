'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { MediaItem, MediaListResponse } from '@opes/contracts';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { api, ApiRequestError, handleAuthError } from '../../../lib/api';
import { precheck, uploadFile } from '../../../lib/media-upload';

type KindFilter = 'all' | 'image' | 'audio';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number | null) {
  if (ms === null) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MediaPage() {
  const [kind, setKind] = useState<KindFilter>('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fail = useCallback((e: unknown) => {
    if (handleAuthError(e)) return;
    if (e instanceof ApiRequestError && e.code === 'STORAGE_NOT_CONFIGURED') {
      setNotConfigured(true);
      return;
    }
    setError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
  }, []);

  const load = useCallback(
    async (after: string | null) => {
      const params = new URLSearchParams();
      if (kind !== 'all') params.set('kind', kind);
      if (debounced) params.set('q', debounced);
      if (after) params.set('cursor', after);
      try {
        const res = await api<MediaListResponse>(`/media?${params.toString()}`);
        setItems((prev) => (after && prev ? [...prev, ...res.items] : res.items));
        setCursor(res.nextCursor);
        setNotConfigured(false);
      } catch (e) {
        fail(e);
        if (!after) setItems([]);
      }
    },
    [kind, debounced, fail],
  );

  useEffect(() => {
    setItems(null);
    void load(null);
  }, [load]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    let done = 0;
    let optimized = 0;
    for (const file of Array.from(files)) {
      const problem = precheck(file);
      if (problem) {
        setError(problem);
        continue;
      }
      setUploading(t('cms.media.uploading', { name: file.name }));
      try {
        const result = await uploadFile(file);
        done += 1;
        if (result.optimized) optimized += 1;
      } catch (e) {
        fail(e);
      }
    }
    setUploading(null);
    if (fileInput.current) fileInput.current.value = '';
    if (done > 0) {
      setToast(
        t('cms.media.uploaded', { count: done }) +
          (optimized > 0 ? ` (${optimized} ${t('cms.media.optimized')})` : ''),
      );
      await load(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api(`/media/${toDelete.id}`, { method: 'DELETE' });
      setItems((prev) => prev?.filter((i) => i.id !== toDelete.id) ?? null);
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'MEDIA_IN_USE') {
        const names = (e.details as { templates?: { name: string }[] } | undefined)?.templates
          ?.map((tpl) => tpl.name)
          .join(', ');
        setError(t('cms.media.inUse', { templates: names ?? '' }));
      } else {
        fail(e);
      }
    } finally {
      setBusy(false);
      setToDelete(null);
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            {t('cms.media.heading')}
          </Typography>
          <Typography color="text.secondary">{t('cms.media.lead')}</Typography>
        </Box>
        <Box>
          <input
            ref={fileInput}
            id="media-file-input"
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInput.current?.click()}
            disabled={Boolean(uploading) || notConfigured}
          >
            {t('cms.media.upload')}
          </Button>
        </Box>
      </Stack>

      {notConfigured && <Alert severity="warning">{t('cms.media.notConfigured')}</Alert>}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {uploading && (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {uploading}
          </Typography>
          <LinearProgress />
        </Box>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <ToggleButtonGroup
          value={kind}
          exclusive
          size="small"
          onChange={(_, value: KindFilter | null) => value && setKind(value)}
          aria-label="Lọc theo loại"
        >
          <ToggleButton value="all">{t('cms.media.all')}</ToggleButton>
          <ToggleButton value="image">{t('cms.media.images')}</ToggleButton>
          <ToggleButton value="audio">{t('cms.media.audio')}</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          id="media-search"
          size="small"
          placeholder={t('cms.media.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ maxWidth: { sm: 320 } }}
          fullWidth
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
      </Stack>

      {items === null && <LinearProgress />}
      {items?.length === 0 && !notConfigured && (
        <Typography color="text.secondary">
          {debounced || kind !== 'all' ? t('cms.media.noMatch') : t('cms.media.empty')}
        </Typography>
      )}

      <Grid container spacing={2}>
        {items?.map((item) => (
          <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  aspectRatio: '1 / 1',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'action.hover',
                  // Nền ô vuông để thấy rõ ảnh trong suốt.
                  backgroundImage:
                    item.kind === 'image'
                      ? 'repeating-conic-gradient(rgba(0,0,0,.06) 0% 25%, transparent 0% 50%)'
                      : undefined,
                  backgroundSize: '16px 16px',
                  p: 1,
                }}
              >
                {item.kind === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.originalName ?? ''}
                    loading="lazy"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <audio controls preload="none" src={item.url} style={{ width: '100%' }} />
                )}
              </Box>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, flexGrow: 1 }}>
                <Tooltip title={item.originalName ?? ''}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {item.originalName}
                  </Typography>
                </Tooltip>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {formatSize(item.sizeBytes)}
                    {item.kind === 'image' && item.width ? ` · ${item.width}×${item.height}` : ''}
                    {item.kind === 'audio' && item.durationMs !== null ? ` · ${formatDuration(item.durationMs)}` : ''}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={`${t('cms.media.delete')} ${item.originalName ?? ''}`}
                    onClick={() => setToDelete(item)}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>
                {item.kind === 'audio' && <Chip size="small" label={item.mime.split('/')[1]} sx={{ mt: 0.5 }} />}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {cursor && (
        <Box>
          <Button onClick={() => void load(cursor)}>{t('common.loadMore')}</Button>
        </Box>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('cms.media.deleteTitle')}
        text={t('cms.media.deleteText', { name: toDelete?.originalName ?? '' })}
        confirmLabel={t('cms.media.delete')}
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Stack>
  );
}
