import Snackbar from '@mui/material/Snackbar';

export interface ToastProps {
  /** Nội dung thông báo; null thì ẩn. */
  message: string | null;
  onClose: () => void;
  /** Tự ẩn sau bao nhiêu mili giây; mặc định 4 giây. */
  duration?: number;
}

/** Thông báo ngắn ở góc màn hình sau một thao tác (đã lưu, đã sao chép…). */
export function Toast({ message, onClose, duration = 4000 }: ToastProps) {
  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={duration}
      onClose={onClose}
      message={message}
    />
  );
}
