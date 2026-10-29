'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { SetupStatus } from '@opes/contracts';
import { t } from '@opes/i18n';
import { AuthCard } from '../../components/AuthCard';
import { PasswordFields, passwordReady } from '../../components/PasswordFields';
import { api, ApiRequestError } from '../../lib/api';

/** Tạo quản trị viên đầu tiên. Khi hệ thống đã có tài khoản, trang chỉ còn nút đến trang đăng nhập. */
export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'open' | 'done'>('checking');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<SetupStatus>('/auth/setup-status')
      .then((s) => setStatus(s.needsSetup ? 'open' : 'done'))
      .catch((e: unknown) => {
        setError(e instanceof ApiRequestError ? e : null);
        setStatus('open');
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/setup', { method: 'POST', body: { name, email, password } });
      router.replace('/dashboard');
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'SETUP_ALREADY_DONE') setStatus('done');
      setError(e instanceof ApiRequestError ? e : new ApiRequestError(0, 'NETWORK', t('common.networkError')));
      setBusy(false);
    }
  }

  if (status === 'checking') {
    return (
      <AuthCard title={t('cms.setup.heading')}>
        <CircularProgress size={28} />
      </AuthCard>
    );
  }

  if (status === 'done') {
    return (
      <AuthCard title={t('cms.setup.heading')}>
        <Stack spacing={2.5}>
          <Alert severity="info">{t('cms.setup.done')}</Alert>
          <Button component={Link} href="/login" variant="contained">
            {t('cms.setup.goLogin')}
          </Button>
        </Stack>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('cms.setup.heading')} lead={t('cms.setup.lead')}>
      <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
        {error && <Alert severity="error">{error.message}</Alert>}
        <TextField
          id="name"
          label={t('cms.setup.name')}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={Boolean(error?.fields.name)}
          helperText={error?.fields.name}
          required
          autoFocus
          fullWidth
        />
        <TextField
          id="email"
          label={t('cms.login.email')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={Boolean(error?.fields.email)}
          helperText={error?.fields.email}
          required
          fullWidth
        />
        <PasswordFields
          password={password}
          confirm={confirm}
          onPassword={setPassword}
          onConfirm={setConfirm}
          serverError={error?.fields.password}
          label={t('cms.login.password')}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={busy || !name.trim() || !email.trim() || !passwordReady(password, confirm)}
        >
          {t('cms.setup.submit')}
        </Button>
      </Stack>
    </AuthCard>
  );
}
