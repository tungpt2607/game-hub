import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GameModuleDetail } from '@opes/contracts';
import { t } from '@opes/i18n';
import { formatDateTime } from '../lib/format';

/** Dòng trạng thái của game dưới tiêu đề: key, bản phát hành mới nhất, bản nháp, chưa lưu / đã lưu lúc nào. */
export function GameStatusLine({
  mod,
  dirty,
  hasDraft,
  draftVersion,
}: {
  mod: GameModuleDetail;
  dirty: boolean;
  hasDraft: boolean;
  draftVersion: string | null;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Chip size="small" variant="outlined" label={<code>{mod.key}</code>} />
      <Chip
        size="small"
        color={mod.latestVersion ? 'success' : 'default'}
        label={
          mod.latestVersion
            ? t('cms.games.latest', { version: mod.latestVersion })
            : t('cms.games.unpublished')
        }
      />
      {hasDraft && (
        <Chip
          size="small"
          color="warning"
          label={
            draftVersion
              ? t('cms.games.draftVersion', { version: draftVersion })
              : t('cms.games.hasDraft')
          }
        />
      )}
      {dirty && (
        <Typography variant="body2" color="warning.main">
          {t('cms.games.unsaved')}
        </Typography>
      )}
      {!dirty && mod.draft && (
        <Typography variant="body2" color="text.secondary">
          {t('cms.games.draftSavedAt', {
            date: formatDateTime(mod.draft.updatedAt),
            name: mod.draft.updatedByName ?? '',
          })}
        </Typography>
      )}
    </Stack>
  );
}
