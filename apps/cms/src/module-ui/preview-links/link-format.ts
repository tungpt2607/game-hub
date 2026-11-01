import type { PreviewLink } from '@opes/contracts';
import { t } from '@opes/i18n';

/** Ô ngày (yyyy-mm-dd) → hết ngày đó theo giờ máy, dạng ISO. */
export const endOfDay = (day: string) => (day ? new Date(`${day}T23:59:59`).toISOString() : null);

export const toDayInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function modeLabel(link: PreviewLink) {
  if (link.mode === 'live') return t('cms.links.modeLive');
  return link.snapshotVersion !== null
    ? t('cms.links.modeSnapshotVersion', { version: link.snapshotVersion })
    : t('cms.links.modeSnapshotDraft');
}
