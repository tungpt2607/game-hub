'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { MeResponse, User } from '@opes/contracts';
import { t } from '@opes/i18n';
import { AuthCard } from '../../components/AuthCard';
import { PasswordFields, passwordReady } from '../../components/PasswordFields';
import { api, ApiRequestError, handleAuthError } from '../../lib/api';

/** Đổi mật khẩu: bắt buộc khi đang dùng mật khẩu tạm, hoặc tự đổi từ menu tài khoản. */
export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<MeResponse>('/auth/me')
      .then((r) => setUser(r.user))
      .catch((e: unknown) => handleAuthError(e));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: password },
      });
      router.replace('/dashboard');
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e instanceof ApiRequestError ? e : new ApiRequestError(0, 'NETWORK', t('common.networkError')));
      setBusy(false);
    }
  }

  const forced = user?.mustChangePassword ?? false;
  return (
    <AuthCard
      title={t('cms.password.heading')}
      lead={forced ? t('cms.password.forcedLead') : undefined}
    >
      <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
        {error && !error.fields.currentPassword && !error.fields.newPassword && (
          <Alert severity="error">{error.message}</Alert>
        )}
        <TextField
          id="current-password"
          label={t('cms.password.current')}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={Boolean(error?.fields.currentPassword)}
          helperText={error?.fields.currentPassword}
          required
          autoFocus
          fullWidth
        />
        <PasswordFields
          password={password}
          confirm={confirm}
          onPassword={setPassword}
          onConfirm={setConfirm}
          serverError={error?.fields.newPassword}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={busy || !current || !passwordReady(password, confirm)}
        >
          {t('cms.password.submit')}
        </Button>
        {user && !forced && (
          <Button component={Link} href="/dashboard">
            {t('common.cancel')}
          </Button>
        )}
      </Stack>
    </AuthCard>
  );
}
