'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { MeResponse, SetupStatus } from '@opes/contracts';
import { t } from '@opes/i18n';
import { AuthCard } from '../../components/AuthCard';
import { api, ApiRequestError } from '../../lib/api';

/** Chỉ cho chuyển tiếp tới đường dẫn nội bộ của CMS. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [checking, setChecking] = useState(true);

  // Đã đăng nhập thì vào thẳng CMS; chưa có tài khoản nào thì sang trang thiết lập lần đầu.
  useEffect(() => {
    let alive = true;
    api<MeResponse>('/auth/me')
      .then(({ user }) => {
        if (alive) router.replace(user.mustChangePassword ? '/change-password' : safeNext(params.get('next')));
      })
      .catch(async () => {
        const s = await api<SetupStatus>('/auth/setup-status').catch(() => null);
        if (!alive) return;
        if (s?.needsSetup) router.replace('/setup');
        else setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [router, params]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<MeResponse>('/auth/login', { method: 'POST', body: { email, password } });
      router.replace(user.mustChangePassword ? '/change-password' : safeNext(params.get('next')));
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('common.networkError'));
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label={t('common.loading')} />
      </Box>
    );
  }

  return (
    <AuthCard title={t('cms.login.heading')}>
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          id="email"
          label={t('cms.login.email')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          fullWidth
        />
        <TextField
          id="password"
          label={t('cms.login.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" disabled={busy || !email || !password}>
          {t('cms.login.submit')}
        </Button>
        <Typography variant="body2" color="text.secondary">
          {t('cms.login.forgot')}
        </Typography>
      </Stack>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
