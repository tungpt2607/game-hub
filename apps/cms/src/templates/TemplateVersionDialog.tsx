import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import type { TemplateVersionResponse } from '@opes/contracts';
import { t } from '@opes/i18n';
import { formatDateTime } from '../lib/format';
import { PreviewFrame } from '../module-ui/PreviewFrame';

/** Xem lại một bản đã công bố (chạy bằng đúng phiên bản game lúc đó); có thể lấy làm bản nháp. */
export function TemplateVersionDialog({
  viewing,
  moduleKey,
  canRestore,
  onRestore,
  onClose,
}: {
  /** Bản đang xem; null thì đóng. */
  viewing: TemplateVersionResponse | null;
  moduleKey: string;
  canRestore: boolean;
  onRestore: (version: number) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={viewing !== null} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {viewing && t('cms.templates.versionLabel', { version: viewing.version })}
        {viewing && (
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(viewing.publishedAt)}
            {viewing.publishedByName ? ` · ${viewing.publishedByName}` : ''}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {viewing && (
          <PreviewFrame
            source={{ kind: 'version', key: moduleKey, version: viewing.moduleVersion }}
            config={viewing.config}
            maxHeight={560}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
        {viewing && canRestore && (
          <Button variant="contained" onClick={() => onRestore(viewing.version)}>
            {t('cms.templates.restore')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
