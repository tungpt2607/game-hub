'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { t } from '@opes/i18n';
import type { FileChange } from './changes';
import { DiffView } from './DiffView';
import { countChanges, diffLines } from './lineDiff';
import { FileIcon } from './workspace/FileIcon';

const KIND_COLOR = { added: 'success', removed: 'error', modified: 'warning' } as const;

function ChangeRow({ change }: { change: FileChange }) {
  const [open, setOpen] = useState(false);
  const canExpand = change.type === 'code';
  const stats = useMemo(() => {
    if (!canExpand) return null;
    const lines = diffLines(change.before ?? '', change.after ?? '');
    return lines ? countChanges(lines) : null;
  }, [canExpand, change.before, change.after]);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        aria-expanded={canExpand ? open : undefined}
        onClick={() => canExpand && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (canExpand && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        sx={{ px: 1, py: 0.75, cursor: canExpand ? 'pointer' : 'default', '&:hover': canExpand ? { bgcolor: 'action.hover' } : undefined }}
      >
        <Box sx={{ width: 18, display: 'flex', color: 'text.secondary' }}>
          {canExpand && (open ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ChevronRightIcon sx={{ fontSize: 18 }} />)}
        </Box>
        <FileIcon path={change.path} />
        <Typography variant="body2" sx={{ fontFamily: 'monospace', flexGrow: 1, minWidth: 0, wordBreak: 'break-all' }}>
          {change.path}
        </Typography>
        {stats && (
          <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ color: 'success.main' }}>
              +{stats.added}
            </Box>{' '}
            <Box component="span" sx={{ color: 'error.main' }}>
              −{stats.removed}
            </Box>
          </Typography>
        )}
        <Chip size="small" variant="outlined" color={KIND_COLOR[change.kind]} label={t(`cms.diff.${change.kind}`)} />
      </Stack>
      {canExpand && (
        <Collapse in={open} unmountOnExit>
          <Box sx={{ borderTop: 1, borderColor: 'divider', maxHeight: 420, overflow: 'auto' }}>
            <DiffView before={change.before ?? ''} after={change.after ?? ''} />
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

/** Danh sách file thay đổi; bấm vào file code để xem khác biệt từng dòng. */
export function ChangeList({ changes }: { changes: FileChange[] }) {
  if (changes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('cms.diff.none')}
      </Typography>
    );
  }
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      {changes.map((c) => (
        <ChangeRow key={c.path} change={c} />
      ))}
    </Box>
  );
}
