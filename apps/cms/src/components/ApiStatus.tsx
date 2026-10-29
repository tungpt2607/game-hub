'use client';

import { useEffect, useState } from 'react';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';

type Database = 'ok' | 'down' | 'not_configured';
type Status =
  | { state: 'checking' }
  | { state: 'ok'; version: string; database: Database }
  | { state: 'down' };

const DB_CHIP: Record<Database, { label: string; color: 'success' | 'error' | 'default' }> = {
  ok: { label: t('cms.overview.dbOk'), color: 'success' },
  down: { label: t('cms.overview.dbDown'), color: 'error' },
  not_configured: { label: t('cms.overview.dbNotConfigured'), color: 'default' },
};

/**
 * Gọi /api/health (chuyển tiếp sang API) để cho biết CMS có kết nối được API,
 * và API có kết nối được cơ sở dữ liệu hay không.
 */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ state: 'checking' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health', { cache: 'no-store' })
      .then(async (res) => {
        // 503 nghĩa là API chạy nhưng cơ sở dữ liệu lỗi; nội dung vẫn đọc được.
        if (!res.ok && res.status !== 503) throw new Error(String(res.status));
        const body = (await res.json()) as { version?: string; database?: Database };
        if (!cancelled) {
          setStatus({
            state: 'ok',
            version: body.version ?? '?',
            database: body.database ?? 'not_configured',
          });
        }
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
  const db = DB_CHIP[status.database];
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip color="success" label={t('cms.overview.apiOk')} />
        <Typography variant="body2" color="text.secondary">
          {t('cms.overview.apiVersion', { version: status.version })}
        </Typography>
      </Stack>
      <div>
        <Typography variant="overline" color="text.secondary" component="div">
          {t('cms.overview.dbStatus')}
        </Typography>
        <Chip color={db.color} label={db.label} />
      </div>
    </Stack>
  );
}
