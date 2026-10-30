'use client';

import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import ReplayIcon from '@mui/icons-material/Replay';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import LinearProgress from '@mui/material/LinearProgress';
import type { GameSource, SerializedSchema } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { FRAME_ALLOW, FRAME_SANDBOX, useGameFrame } from './useGame';

export const DEVICES = [
  { id: 'small', label: '360 × 640', width: 360, height: 640 },
  { id: 'medium', label: '390 × 844', width: 390, height: 844 },
  { id: 'large', label: '430 × 932', width: 430, height: 932 },
] as const;

type DeviceId = (typeof DEVICES)[number]['id'];

interface Props {
  /** Game cần chạy (phiên bản đã phát hành, hoặc code bản nháp). */
  source: GameSource;
  config: unknown;
  /** Chiều cao tối đa của khung (px); mặc định vừa màn hình. */
  maxHeight?: number;
  /** Báo mô tả game khi tải xong (hoặc null khi đang tải / lỗi). */
  onSchema?: (schema: SerializedSchema | null, error: string | null) => void;
}

/**
 * Khung xem trước dạng điện thoại: chọn kích thước máy, nhảy tới từng màn hình, bật/tắt tiếng,
 * chơi lại. Game chạy trong iframe trên tên miền trang chơi (tách khỏi CMS), với SandboxHost nên không
 * gọi mạng; cấu hình thay đổi được áp dụng ngay.
 */
export function PreviewFrame({ source, config, maxHeight, onSchema }: Props) {
  const [deviceId, setDeviceId] = useState<DeviceId>('medium');
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const { schema, error, client } = useGameFrame(frame, source);
  const screens = schema?.screens ?? [];
  const [screen, setScreen] = useState('');
  const [muted, setMuted] = useState(true);
  const [run, setRun] = useState(0);
  const area = useRef<HTMLDivElement>(null);
  const [areaWidth, setAreaWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const device = DEVICES.find((d) => d.id === deviceId) ?? DEVICES[1];
  const firstScreen = schema?.screens[0]?.id ?? '';

  useEffect(() => {
    setScreen(firstScreen);
  }, [schema, firstScreen]);

  useEffect(() => {
    onSchema?.(schema, error);
    // Chỉ báo khi kết quả tải đổi.
  }, [schema, error]);

  // Gửi cấu hình và trạng thái hiện tại sang khung mỗi khi đổi.
  useEffect(() => {
    if (!client || !schema || config === null || config === undefined) return;
    client.render({ config, screen: screen || undefined, muted, run });
  }, [client, schema, config, screen, muted, run]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAreaWidth(entry.contentRect.width);
    });
    observer.observe(el);
    const onResize = () => setViewportHeight(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const bezel = 12;
  const outerW = device.width + bezel * 2;
  const outerH = device.height + bezel * 2;
  // Vừa chiều ngang khung và chiều cao màn hình (trừ thanh trên + thanh công cụ).
  const availableHeight = maxHeight ?? (viewportHeight > 0 ? Math.max(360, viewportHeight - 210) : outerH);
  const scale = areaWidth > 0 ? Math.min(1, areaWidth / outerW, availableHeight / outerH) : 0;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          select
          size="small"
          label={t('cms.preview.device')}
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value as DeviceId)}
          sx={{ minWidth: 130 }}
        >
          {DEVICES.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.label}
            </MenuItem>
          ))}
        </TextField>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={screen}
          aria-label={t('cms.preview.screen')}
          onChange={(_, value: string | null) => {
            if (!value) return;
            setScreen(value);
            setRun((n) => n + 1);
          }}
        >
          {screens.map((s) => (
            <ToggleButton key={s.id} value={s.id} sx={{ px: 1.25 }}>
              {s.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={muted ? t('cms.preview.unmute') : t('cms.preview.mute')}>
          <IconButton onClick={() => setMuted((m) => !m)} aria-label={muted ? t('cms.preview.unmute') : t('cms.preview.mute')}>
            {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title={t('cms.preview.restart')}>
          <IconButton
            onClick={() => {
              setScreen(firstScreen);
              setRun((n) => n + 1);
            }}
            aria-label={t('cms.preview.restart')}
          >
            <ReplayIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box
        ref={area}
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ width: outerW * scale, height: outerH * scale, flexShrink: 0 }}>
          <Box
            sx={{
              width: outerW,
              height: outerH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              p: `${bezel}px`,
              borderRadius: '36px',
              bgcolor: '#111',
              boxShadow: 6,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: device.width,
                height: device.height,
                borderRadius: '26px',
                overflow: 'hidden',
                bgcolor: '#000',
              }}
            >
              <iframe
                ref={setFrame}
                title={t('cms.preview.frameTitle')}
                sandbox={FRAME_SANDBOX}
                allow={FRAME_ALLOW}
                style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
              />
              {!schema && !error && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                  <LinearProgress />
                </Box>
              )}
              {error && (
                <Box sx={{ position: 'absolute', inset: 0, p: 2, bgcolor: 'background.paper' }}>
                  <Alert severity="error">{t('cms.preview.loadFailed', { message: error })}</Alert>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Chip size="small" variant="outlined" label={t('cms.preview.badge')} />
      </Box>
    </Stack>
  );
}
