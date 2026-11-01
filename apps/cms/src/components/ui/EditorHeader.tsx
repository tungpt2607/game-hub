import Link from 'next/link';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export interface EditorHeaderProps {
  /** Trang danh sách để quay lại. */
  backHref: string;
  /** Nhãn cho nút quay lại (đọc bởi trình đọc màn hình). */
  backLabel: string;
  title: ReactNode;
  /** Phần tử ngay sau tiêu đề (ví dụ nút sửa tên). */
  titleAction?: ReactNode;
  /** Dòng trạng thái dưới tiêu đề (nhãn phiên bản, "Chưa lưu"…). */
  status?: ReactNode;
  /** Các nút thao tác bên phải. */
  actions?: ReactNode;
}

/** Đầu trang của màn sửa một đối tượng: nút quay lại, tiêu đề, trạng thái, các nút thao tác. */
export function EditorHeader({
  backHref,
  backLabel,
  title,
  titleAction,
  status,
  actions,
}: EditorHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ md: 'flex-start' }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
        <IconButton component={Link} href={backHref} aria-label={backLabel} sx={{ mt: 0.25 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="h5" component="h1" fontWeight={700} noWrap>
              {title}
            </Typography>
            {titleAction}
          </Stack>
          {status}
        </Box>
      </Stack>
      {actions && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
