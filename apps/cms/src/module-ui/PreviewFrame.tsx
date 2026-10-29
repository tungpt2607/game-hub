'use client';

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { createSandboxHost, type ModuleDefinition } from '@opes/module-sdk';
import { t } from '@opes/i18n';

export const DEVICES = [
  { id: 'small', label: '360 × 640', width: 360, height: 640 },
  { id: 'medium', label: '390 × 844', width: 390, height: 844 },
  { id: 'large', label: '430 × 932', width: 430, height: 932 },
] as const;

type DeviceId = (typeof DEVICES)[number]['id'];

/** Bắt lỗi khi module chạy, để lỗi trong game không làm hỏng cả trang CMS. */
class RuntimeBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <Box sx={{ position: 'absolute', inset: 0, p: 2, bgcolor: 'background.paper' }}>
          <Alert severity="error">{t('cms.preview.crashed', { message: this.state.error.message })}</Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}

interface Props<Config> {
  module: ModuleDefinition<Config>;
  config: Config;
  /** Chiều cao tối đa của khung (px); mặc định vừa màn hình. */
  maxHeight?: number;
}

/**
 * Khung xem trước dạng điện thoại: chọn kích thước máy, nhảy tới từng màn hình, bật/tắt tiếng,
 * chơi lại. Module chạy với SandboxHost nên không gọi mạng; cấu hình thay đổi được áp dụng ngay.
 */
export function PreviewFrame<Config>({ module, config, maxHeight }: Props<Config>) {
  const [deviceId, setDeviceId] = useState<DeviceId>('medium');
  const [screen, setScreen] = useState(module.screens[0]?.id ?? '');
  const [muted, setMuted] = useState(true);
  const [run, setRun] = useState(0);
  const area = useRef<HTMLDivElement>(null);
  const [areaWidth, setAreaWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const device = DEVICES.find((d) => d.id === deviceId) ?? DEVICES[1];
  const host = useMemo(() => createSandboxHost(), []);
  const Runtime = module.Runtime;

  useEffect(() => {
    setScreen(module.screens[0]?.id ?? '');
  }, [module]);

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
          {module.screens.map((s) => (
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
              setScreen(module.screens[0]?.id ?? '');
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
                // Cô lập phần chạy module khỏi CSS của CMS.
                isolation: 'isolate',
                contain: 'strict',
              }}
            >
              <RuntimeBoundary key={`${module.key}-${run}`}>
                <Runtime config={config} host={host} initialScreen={screen} muted={muted} />
              </RuntimeBoundary>
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
