'use client';

import Chip from '@mui/material/Chip';
import type { TemplateSummary } from '@opes/contracts';
import { t } from '@opes/i18n';

/** Trạng thái công bố của template. */
export function StatusChip({ template }: { template: Pick<TemplateSummary, 'publishedVersion' | 'hasUnpublishedChanges' | 'status'> }) {
  if (template.status === 'archived') return <Chip size="small" label={t('cms.templates.archived')} />;
  if (template.publishedVersion === 0) return <Chip size="small" color="warning" variant="outlined" label={t('cms.templates.notPublished')} />;
  if (template.hasUnpublishedChanges)
    return <Chip size="small" color="info" variant="outlined" label={t('cms.templates.unpublishedChanges', { version: template.publishedVersion })} />;
  return <Chip size="small" color="success" label={t('cms.templates.published', { version: template.publishedVersion })} />;
}
