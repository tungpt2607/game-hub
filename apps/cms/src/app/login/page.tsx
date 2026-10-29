'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Bản khung: chưa kiểm tra tài khoản. Đăng nhập thật làm ở Bước 4.
    router.push('/dashboard');
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }} variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            <Box>
              <Typography variant="overline" color="primary">
                {t('app.name')}
              </Typography>
              <Typography variant="h5" component="h1" fontWeight={700}>
                {t('cms.login.heading')}
              </Typography>
            </Box>
            <TextField
              id="email"
              label={t('cms.login.email')}
              type="email"
              autoComplete="email"
              fullWidth
            />
            <TextField
              id="password"
              label={t('cms.login.password')}
              type="password"
              autoComplete="current-password"
              fullWidth
            />
            <Button type="submit" variant="contained" size="large">
              {t('cms.login.submit')}
            </Button>
            <Alert severity="info">{t('cms.login.skeletonNote')}</Alert>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
