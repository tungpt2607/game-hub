'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import type { GameAsset } from '@opes/contracts';
import { t } from '@opes/i18n';
import { categoryOf } from './FileIcon';
import { assetKey } from './vfs';

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(bytes / 1024)}KB`);

/** Nền ô bàn cờ để thấy rõ ảnh nền trong suốt. */
const CHECKER = {
  backgroundColor: '#2D2D2D',
  backgroundImage:
    'linear-gradient(45deg, #3A3A3A 25%, transparent 25%), linear-gradient(-45deg, #3A3A3A 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3A3A3A 75%), linear-gradient(-45deg, transparent 75%, #3A3A3A 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
};

function FontSample({ url, family }: { url: string; family: string }) {
  const [ready, setReady] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    let alive = true;
    const face = new FontFace(family, `url(${JSON.stringify(url)})`);
    face.load().then(
      (f) => {
        document.fonts.add(f);
        if (alive) setReady('ok');
      },
      () => alive && setReady('error'),
    );
    return () => {
      alive = false;
    };
  }, [url, family]);
  if (ready === 'error') return <Typography color="error">{t('cms.workspace.fontError')}</Typography>;
  return (
    <Box sx={{ fontFamily: ready === 'ok' ? `"${family}"` : 'inherit', color: '#fff', textAlign: 'center', p: 2 }}>
      <Box sx={{ fontSize: 40, lineHeight: 1.2 }}>Chạm quà nhận lộc</Box>
      <Box sx={{ fontSize: 22, mt: 1 }}>ÀÁẢÃẠ ĂẮẰẲ ÂẤẦẨ ĐĐ ƠỚỜ ƯỨỪ</Box>
      <Box sx={{ fontSize: 22 }}>0123456789 !?%+−×</Box>
    </Box>
  );
}

/** Xem trước file kèm trong tab: ảnh (có nút toàn màn hình), âm thanh (nút phát), font (chữ mẫu). */
export function AssetPreview({ path, asset, onCopyUsage }: { path: string; asset: GameAsset; onCopyUsage: () => void }) {
  const [full, setFull] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const category = categoryOf(path);
  useEffect(() => setSize(null), [asset.url]);

  return (
    <Stack sx={{ height: '100%', bgcolor: '#1E1E1E', color: '#CCC' }}>
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', ...(category === 'image' ? CHECKER : {}) }}>
        {category === 'image' && (
          <Box
            component="img"
            src={asset.url}
            alt={path}
            onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onClick={() => setFull(true)}
            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'zoom-in' }}
          />
        )}
        {category === 'audio' && <audio src={asset.url} controls preload="metadata" style={{ width: 'min(420px, 90%)' }} />}
        {category === 'font' && <FontSample url={asset.url} family={`opes-preview-${asset.sha256.slice(0, 12)}`} />}
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.5, py: 1, borderTop: '1px solid #333', fontSize: 12 }}>
        <Box sx={{ flexGrow: 1, fontFamily: 'monospace' }}>
          {path} · {formatSize(asset.size)}
          {size ? ` · ${size.w} × ${size.h}px` : ''}
        </Box>
        <Button size="small" startIcon={<ContentCopyOutlined />} onClick={onCopyUsage} sx={{ color: '#CCC' }}>
          asset(&apos;{assetKey(path)}&apos;)
        </Button>
        {category === 'image' && (
          <IconButton size="small" onClick={() => setFull(true)} aria-label={t('cms.workspace.fullscreen')} sx={{ color: '#CCC' }}>
            <FullscreenIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <Dialog open={full} onClose={() => setFull(false)} fullScreen>
        <Box sx={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...CHECKER }} onClick={() => setFull(false)}>
          <Box component="img" src={asset.url} alt={path} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          <IconButton
            onClick={() => setFull(false)}
            aria-label={t('common.close')}
            sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Dialog>
    </Stack>
  );
}
