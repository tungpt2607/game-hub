import Button from '@mui/material/Button';
import type { GameModuleDetail } from '@opes/contracts';
import { t } from '@opes/i18n';
import { ListDialog } from '../components/ui/ListDialog';
import { formatDateTime } from '../lib/format';

/** Lịch sử phát hành của game: tải về từng phiên bản hoặc lấy làm bản nháp. */
export function GameHistoryDialog({
  open,
  mod,
  busy,
  onDownload,
  onUseAsDraft,
  onClose,
}: {
  open: boolean;
  mod: GameModuleDetail;
  /** Đang có thao tác khác: khóa nút tải về. */
  busy: boolean;
  onDownload: (version: string) => void;
  onUseAsDraft: (version: string) => void;
  onClose: () => void;
}) {
  return (
    <ListDialog
      open={open}
      title={t('cms.games.historyTitle')}
      emptyText={t('cms.games.historyEmpty')}
      items={mod.versions}
      getKey={(v) => v.version}
      renderPrimary={(v) =>
        `v${v.version}${v.version === mod.latestVersion ? ` · ${t('cms.games.current')}` : ''}`
      }
      renderSecondary={(v) =>
        [formatDateTime(v.publishedAt), v.publishedByName, v.notes].filter(Boolean).join(' · ')
      }
      renderActions={(v) => (
        <>
          <Button size="small" onClick={() => onDownload(v.version)} disabled={busy}>
            {t('cms.games.downloadShort')}
          </Button>
          <Button size="small" onClick={() => onUseAsDraft(v.version)}>
            {t('cms.games.useAsDraft')}
          </Button>
        </>
      )}
      actionsSpace={22}
      onClose={onClose}
    />
  );
}
