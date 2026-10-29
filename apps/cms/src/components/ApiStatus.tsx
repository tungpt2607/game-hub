'use client';

import { useEffect, useState } from 'react';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';

type Status = { state: 'checking' } | { state: 'ok'; version: string } | { state: 'down' };

/** Gọi /api/health (chuyển tiếp sang API) để cho biết CMS có kết nối được API hay không. */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ state: 'checking' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { version?: string };
        if (!cancelled) setStatus({ state: 'ok', version: body.version ?? '?' });
      })
      .catch(() => {
        if (!cancelled) setStatus({ state: 'down' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status.state === 'checking') {
    return <Typography color="text.secondary">{t('cms.overview.apiChecking')}</Typography>;
  }
  if (status.state === 'down') {
    return <Chip color="error" label={t('cms.overview.apiDown')} />;
  }
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip color="success" label={t('cms.overview.apiOk')} />
      <Typography variant="body2" color="text.secondary">
        {t('cms.overview.apiVersion', { version: status.version })}
      </Typography>
    </Stack>
  );
}
