import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export interface LoadErrorViewProps {
  message: string;
  /** Trang để quay lại (thường là danh sách). */
  backHref: string;
  backLabel: string;
}

/** Thay cho cả trang khi không tải được dữ liệu: thông báo lỗi và nút quay lại. */
export function LoadErrorView({ message, backHref, backLabel }: LoadErrorViewProps) {
  return (
    <Stack spacing={2}>
      <Alert severity="error">{message}</Alert>
      <Box>
        <Button component={Link} href={backHref} startIcon={<ArrowBackIcon />}>
          {backLabel}
        </Button>
      </Box>
    </Stack>
  );
}
