import Button from '@mui/material/Button';
import type { TemplateDetail } from '@opes/contracts';
import { t } from '@opes/i18n';
import { ListDialog } from '../components/ui/ListDialog';
import { formatDateTime } from '../lib/format';

/** Lịch sử công bố của template: xem lại từng bản hoặc lấy làm bản nháp. */
export function TemplateHistoryDialog({
  open,
  template,
  canRestore,
  onView,
  onRestore,
  onClose,
}: {
  open: boolean;
  template: TemplateDetail;
  /** Template đã lưu trữ thì không khôi phục được. */
  canRestore: boolean;
  onView: (version: number) => void;
  onRestore: (version: number) => void;
  onClose: () => void;
}) {
  return (
    <ListDialog
      open={open}
      title={t('cms.templates.historyTitle')}
      emptyText={t('cms.templates.historyEmpty')}
      items={template.versions}
      getKey={(v) => v.version}
      renderPrimary={(v) =>
        `${t('cms.templates.versionLabel', { version: v.version })}${
          v.version === template.publishedVersion ? ` · ${t('cms.templates.current')}` : ''
        }`
      }
      renderSecondary={(v) =>
        `${formatDateTime(v.publishedAt)}${v.publishedByName ? ` · ${v.publishedByName}` : ''}`
      }
      renderActions={(v) => (
        <>
          <Button size="small" onClick={() => onView(v.version)}>
            {t('cms.templates.view')}
          </Button>
          {canRestore && (
            <Button size="small" onClick={() => onRestore(v.version)}>
              {t('cms.templates.restore')}
            </Button>
          )}
        </>
      )}
      onClose={onClose}
    />
  );
}
