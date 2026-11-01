import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Grid, { type GridSize } from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

type Breakpoint = 'md' | 'lg' | 'xl';

export interface SplitViewProps {
  /** Màn hình đủ rộng để hiện hai cột (nơi dùng tự quyết theo breakpoint). */
  wide: boolean;
  main: ReactNode;
  side: ReactNode;
  /** Tên tab của hai phần khi màn hình hẹp. */
  mainLabel: string;
  sideLabel: string;
  /** Độ rộng cột theo breakpoint khi màn hình rộng (tổng 12). */
  mainSize: Partial<Record<Breakpoint, GridSize>>;
  sideSize: Partial<Record<Breakpoint, GridSize>>;
  spacing?: number;
}

/**
 * Hai phần cạnh nhau: màn hình rộng thì chia hai cột (cột phụ đặt trong khung, dính khi cuộn);
 * màn hình hẹp thì chuyển thành hai tab.
 */
export function SplitView({
  wide,
  main,
  side,
  mainLabel,
  sideLabel,
  mainSize,
  sideSize,
  spacing = 2,
}: SplitViewProps) {
  const [tab, setTab] = useState<'main' | 'side'>('main');
  if (wide) {
    return (
      <Grid container spacing={spacing} alignItems="flex-start">
        <Grid size={mainSize}>{main}</Grid>
        <Grid size={sideSize} sx={{ position: 'sticky', top: 88 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            {side}
          </Paper>
        </Grid>
      </Grid>
    );
  }
  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v: 'main' | 'side') => setTab(v)}
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab value="main" label={mainLabel} />
        <Tab value="side" label={sideLabel} />
      </Tabs>
      {tab === 'main' ? main : side}
    </Box>
  );
}
