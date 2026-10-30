'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import type { TemplateListResponse, TemplateStatus, TemplateSummary } from '@opes/contracts';
import { t } from '@opes/i18n';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { api, ApiRequestError, handleAuthError } from '../../../lib/api';
import { CreateTemplateDialog, type CreateMode } from '../../../module-ui/CreateTemplateDialog';
import { StatusChip } from '../../../module-ui/StatusChip';
import { TemplateThumb } from '../../../module-ui/TemplateThumb';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export default function TemplatesPage() {
  const [status, setStatus] = useState<TemplateStatus>('active');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [create, setCreate] = useState<CreateMode | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; item: TemplateSummary } | null>(null);
  const [toDelete, setToDelete] = useState<TemplateSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fail = useCallback((e: unknown) => {
    if (handleAuthError(e)) return;
    setError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ status });
    if (debounced) params.set('q', debounced);
    try {
      const res = await api<TemplateListResponse>(`/templates?${params.toString()}`);
      setItems(res.items);
    } catch (e) {
      fail(e);
      setItems([]);
    }
  }, [status, debounced, fail]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  async function action(item: TemplateSummary, path: 'archive' | 'unarchive', message: string) {
    setMenu(null);
    try {
      await api(`/templates/${item.id}/${path}`, { method: 'POST' });
      setToast(message);
      await load();
    } catch (e) {
      fail(e);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api(`/templates/${toDelete.id}`, { method: 'DELETE' });
      setToast(t('cms.templates.deleted', { name: toDelete.name }));
      await load();
    } catch (e) {
      fail(e);
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
            {t('cms.templates.heading')}
          </Typography>
          <Typography color="text.secondary">{t('cms.templates.lead')}</Typography>
        </Box>
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreate({ type: 'new' })}>
            {t('cms.templates.create')}
          </Button>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Tabs value={status} onChange={(_, v: TemplateStatus) => setStatus(v)}>
          <Tab value="active" label={t('cms.templates.tabActive')} />
          <Tab value="archived" label={t('cms.templates.tabArchived')} />
        </Tabs>
        <TextField
          size="small"
          placeholder={t('cms.templates.search')}
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
      {items?.length === 0 && (
        <Typography color="text.secondary">
          {debounced
            ? t('cms.templates.noMatch')
            : status === 'archived'
              ? t('cms.templates.emptyArchived')
              : t('cms.templates.empty')}
        </Typography>
      )}

      <Grid container spacing={2}>
        {items?.map((item) => (
          <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <CardActionArea component={Link} href={`/templates/${item.id}`} sx={{ flexGrow: 1, alignItems: 'stretch' }}>
                <TemplateThumb config={item.config} height={150} />
                <CardContent sx={{ pb: 1.5 }}>
                  <Typography fontWeight={700} noWrap sx={{ pr: 3 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {[item.brandName, item.moduleName].filter(Boolean).join(' · ')}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <StatusChip template={item} />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {formatDate(item.updatedAt)}
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
              <IconButton
                size="small"
                aria-label={t('cms.templates.actions', { name: item.name })}
                onClick={(e) => setMenu({ anchor: e.currentTarget, item })}
                sx={{ position: 'absolute', right: 6, bottom: 52, bgcolor: 'background.paper' }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu && menu.item.status === 'active' && [
          <MenuItem
            key="dup"
            onClick={() => {
              setCreate({ type: 'duplicate', template: menu.item });
              setMenu(null);
            }}
          >
            {t('cms.templates.duplicate')}
          </MenuItem>,
          <MenuItem key="archive" onClick={() => void action(menu.item, 'archive', t('cms.templates.archivedToast', { name: menu.item.name }))}>
            {t('cms.templates.archive')}
          </MenuItem>,
        ]}
        {menu && menu.item.status === 'archived' && [
          <MenuItem key="restore" onClick={() => void action(menu.item, 'unarchive', t('cms.templates.unarchivedToast', { name: menu.item.name }))}>
            {t('cms.templates.unarchive')}
          </MenuItem>,
          <MenuItem
            key="delete"
            sx={{ color: 'error.main' }}
            onClick={() => {
              setToDelete(menu.item);
              setMenu(null);
            }}
          >
            {t('cms.templates.delete')}
          </MenuItem>,
        ]}
      </Menu>

      <CreateTemplateDialog open={create !== null} mode={create ?? { type: 'new' }} onClose={() => setCreate(null)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('cms.templates.deleteTitle')}
        text={t('cms.templates.deleteText', { name: toDelete?.name ?? '' })}
        confirmLabel={t('cms.templates.delete')}
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Stack>
  );
}
