import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

export interface PageHeaderProps {
  title: ReactNode;
  /** Dòng mô tả ngắn dưới tiêu đề. */
  description?: ReactNode;
  /** Nút / ô điều khiển bên phải tiêu đề (xuống dòng khi màn hình hẹp). */
  actions?: ReactNode;
  sx?: SxProps<Theme>;
}

/** Tiêu đề trang: tiêu đề + mô tả bên trái, các nút thao tác bên phải. */
export function PageHeader({ title, description, actions, sx }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      sx={sx}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h1" fontWeight={700}>
          {title}
        </Typography>
        {description && <Typography color="text.secondary">{description}</Typography>}
      </Box>
      {actions && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ flexShrink: 0, alignSelf: { sm: 'flex-start' } }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
