'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import QRCode from 'qrcode';
import type { PreviewLink } from '@opes/contracts';
import { t } from '@opes/i18n';

export function QrDialog({
  link,
  onClose,
  onCopy,
}: {
  link: PreviewLink | null;
  onClose: () => void;
  onCopy: (link: PreviewLink) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    setDataUrl(null);
    if (!link) return;
    QRCode.toDataURL(link.url, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [link]);
  const fileName = `qr-${(link?.label ?? link?.token ?? 'link')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.png`;
  return (
    <Dialog open={Boolean(link)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{link?.label ?? t('cms.links.qr')}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} alignItems="center">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={t('cms.links.qrAlt')}
              style={{ width: '100%', maxWidth: 300, imageRendering: 'pixelated' }}
            />
          ) : (
            <LinearProgress sx={{ width: '100%' }} />
          )}
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              wordBreak: 'break-all',
              textAlign: 'center',
            }}
          >
            {link?.url}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        {link && <Button onClick={() => onCopy(link)}>{t('cms.links.copyLink')}</Button>}
        {dataUrl && (
          <Button href={dataUrl} download={fileName}>
            {t('cms.links.downloadQr')}
          </Button>
        )}
        <Button variant="contained" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
