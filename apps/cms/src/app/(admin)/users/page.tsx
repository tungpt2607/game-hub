'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { TemporaryPasswordResponse, User, UserListResponse } from '@opes/contracts';
import { t } from '@opes/i18n';
import { useCurrentUser } from '../../../components/AuthContext';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { api, ApiRequestError, handleAuthError } from '../../../lib/api';
import { copyText, selectAll } from '../../../lib/clipboard';

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
    : t('cms.users.never');

type Pending = { kind: 'reset' | 'disable'; user: User } | null;

export default function UsersPage() {
  const me = useCurrentUser();
  const [data, setData] = useState<UserListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [temp, setTemp] = useState<TemporaryPasswordResponse | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; user: User } | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<UserListResponse>('/users')
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!handleAuthError(e)) setError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
      });
  }, []);

  useEffect(load, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      load();
    } catch (e) {
      if (!handleAuthError(e)) setError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function confirmPending() {
    if (!pending) return;
    const { kind, user } = pending;
    await run(async () => {
      if (kind === 'reset') {
        setTemp(await api<TemporaryPasswordResponse>(`/users/${user.id}/reset-password`, { method: 'POST' }));
      } else {
        await api(`/users/${user.id}`, { method: 'PATCH', body: { status: 'disabled' } });
      }
    });
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            {t('cms.users.heading')}
          </Typography>
          <Typography color="text.secondary">{t('cms.users.lead')}</Typography>
        </Box>
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            {t('cms.users.add')}
          </Button>
        </Box>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {data && data.activeAdminCount <= 1 && <Alert severity="warning">{t('cms.users.singleAdmin')}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t('cms.users.name')}</TableCell>
              <TableCell>{t('cms.users.email')}</TableCell>
              <TableCell>{t('cms.users.status')}</TableCell>
              <TableCell>{t('cms.users.lastLogin')}</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {!data && (
              <TableRow>
                <TableCell colSpan={5}>{t('common.loading')}</TableCell>
              </TableRow>
            )}
            {data?.users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{user.name}</span>
                    {user.id === me?.id && <Chip size="small" label={t('cms.users.you')} />}
                  </Stack>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.status === 'disabled' ? (
                    <Chip size="small" label={t('cms.users.disabled')} />
                  ) : user.mustChangePassword ? (
                    <Chip size="small" color="warning" label={t('cms.users.mustChange')} />
                  ) : (
                    <Chip size="small" color="success" label={t('cms.users.active')} />
                  )}
                </TableCell>
                <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    aria-label={`Thao tác với ${user.name}`}
                    onClick={(e) => setMenu({ anchor: e.currentTarget, user })}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu && menu.user.id !== me?.id && (
          <MenuItem
            onClick={() => {
              setPending({ kind: 'reset', user: menu.user });
              setMenu(null);
            }}
          >
            {t('cms.users.resetPassword')}
          </MenuItem>
        )}
        {menu && menu.user.status === 'active' && (
          <MenuItem
            onClick={() => {
              setPending({ kind: 'disable', user: menu.user });
              setMenu(null);
            }}
          >
            {t('cms.users.disable')}
          </MenuItem>
        )}
        {menu && menu.user.status === 'disabled' && (
          <MenuItem
            onClick={() => {
              const user = menu.user;
              setMenu(null);
              void run(async () => {
                await api(`/users/${user.id}`, { method: 'PATCH', body: { status: 'active' } });
              });
            }}
          >
            {t('cms.users.enable')}
          </MenuItem>
        )}
      </Menu>

      <ConfirmDialog
        open={pending?.kind === 'reset'}
        title={t('cms.users.resetConfirmTitle')}
        text={t('cms.users.resetConfirmText', { name: pending?.user.name ?? '' })}
        confirmLabel={t('cms.users.resetPassword')}
        busy={busy}
        onConfirm={confirmPending}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'disable'}
        title={t('cms.users.disableConfirmTitle')}
        text={t('cms.users.disableConfirmText', { name: pending?.user.name ?? '' })}
        confirmLabel={t('cms.users.disable')}
        danger
        busy={busy}
        onConfirm={confirmPending}
        onClose={() => setPending(null)}
      />

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(result) => {
          setCreateOpen(false);
          setTemp(result);
          load();
        }}
      />
      <TemporaryPasswordDialog result={temp} onClose={() => setTemp(null)} />
    </Stack>
  );
}

function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: TemporaryPasswordResponse) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      onCreated(await api<TemporaryPasswordResponse>('/users', { method: 'POST', body: { name, email } }));
    } catch (e) {
      if (!handleAuthError(e)) {
        setError(e instanceof ApiRequestError ? e : new ApiRequestError(0, 'NETWORK', t('common.networkError')));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{t('cms.users.createTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && !error.fields.name && !error.fields.email && (
              <Alert severity="error">{error.message}</Alert>
            )}
            <TextField
              id="new-user-name"
              label={t('cms.users.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={Boolean(error?.fields.name)}
              helperText={error?.fields.name}
              autoFocus
              fullWidth
            />
            <TextField
              id="new-user-email"
              label={t('cms.users.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={Boolean(error?.fields.email)}
              helperText={error?.fields.email}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={busy || !name.trim() || !email.trim()}>
            {t('cms.users.createSubmit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function TemporaryPasswordDialog({
  result,
  onClose,
}: {
  result: TemporaryPasswordResponse | null;
  onClose: () => void;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setCopyState('idle'), [result]);

  async function copy() {
    if (!result) return;
    const ok = await copyText(result.temporaryPassword, input.current);
    setCopyState(ok ? 'copied' : 'failed');
  }

  return (
    <Dialog open={Boolean(result)} maxWidth="xs" fullWidth>
      <DialogTitle>{t('cms.users.tempTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {t('cms.users.tempLead', { name: result?.user.name ?? '' })}
        </DialogContentText>
        {/* Ô chỉ-đọc: trên iPhone chọn được chữ trong ô nhập, còn chữ thường trong hộp thoại thì không. */}
        <TextField
          value={result?.temporaryPassword ?? ''}
          inputRef={input}
          fullWidth
          aria-label={t('cms.users.tempTitle')}
          onFocus={() => input.current && selectAll(input.current)}
          onClick={() => input.current && selectAll(input.current)}
          slotProps={{
            htmlInput: {
              readOnly: true,
              spellCheck: false,
              autoCapitalize: 'off',
              autoCorrect: 'off',
              style: {
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 1,
                textAlign: 'center',
              },
            },
          }}
        />
        {copyState === 'copied' && (
          <Alert severity="success" sx={{ mt: 1.5 }}>
            {t('common.copied')}
          </Alert>
        )}
        {copyState === 'failed' && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            {t('common.copyFailed')}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {result?.user.email}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void copy()}>{t('common.copy')}</Button>
        <Button onClick={onClose} variant="contained">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
