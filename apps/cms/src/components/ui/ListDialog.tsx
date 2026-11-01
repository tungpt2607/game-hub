import type { Key, ReactNode } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';

export interface ListDialogProps<T> {
  open: boolean;
  title: ReactNode;
  items: readonly T[];
  getKey: (item: T) => Key;
  /** Dòng chính của mỗi mục. */
  renderPrimary: (item: T) => ReactNode;
  /** Dòng phụ (ngày, người thực hiện…). */
  renderSecondary?: (item: T) => ReactNode;
  /** Các nút bên phải mỗi mục. */
  renderActions?: (item: T) => ReactNode;
  /** Chữ hiện khi danh sách rỗng. */
  emptyText: ReactNode;
  /** Chừa chỗ bên phải cho các nút (đơn vị spacing của theme); mặc định 18. */
  actionsSpace?: number;
  onClose: () => void;
}

/** Hộp thoại liệt kê các mục, mỗi mục có thể kèm nút thao tác (ví dụ lịch sử phiên bản). */
export function ListDialog<T>({
  open,
  title,
  items,
  getKey,
  renderPrimary,
  renderSecondary,
  renderActions,
  emptyText,
  actionsSpace = 18,
  onClose,
}: ListDialogProps<T>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {items.length === 0 ? (
          <Typography color="text.secondary">{emptyText}</Typography>
        ) : (
          <List disablePadding>
            {items.map((item) => (
              <ListItem
                key={getKey(item)}
                disableGutters
                secondaryAction={
                  renderActions && (
                    <Stack direction="row" spacing={1}>
                      {renderActions(item)}
                    </Stack>
                  )
                }
              >
                <ListItemText
                  primary={renderPrimary(item)}
                  secondary={renderSecondary?.(item)}
                  sx={{ pr: renderActions ? actionsSpace : 0 }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
