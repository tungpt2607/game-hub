'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { t } from '@opes/i18n';

const formatTime = (iso: string) => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Hỏi khôi phục bản tạm trên trình duyệt (thay đổi chưa lưu nháp từ lần sửa trước).
 * `outdated` = bản nháp trên máy chủ đã được lưu sau lần sửa đó (có thể bởi đồng nghiệp).
 */
export function LocalDraftBanner({
  savedAt,
  fileCount,
  outdated,
  onRestore,
  onDiscard,
}: {
  savedAt: string;
  fileCount: number;
  outdated: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <Alert
      severity="warning"
      action={
        <Stack direction="row" spacing={1}>
          <Button color="inherit" size="small" onClick={onDiscard}>
            {t('cms.localDraft.discard')}
          </Button>
          <Button color="inherit" size="small" variant="outlined" onClick={onRestore}>
            {t('cms.localDraft.restore')}
          </Button>
        </Stack>
      }
    >
      {t('cms.localDraft.text', { count: fileCount, time: formatTime(savedAt) })}
      {outdated ? ` ${t('cms.localDraft.outdated')}` : ''}
    </Alert>
  );
}
