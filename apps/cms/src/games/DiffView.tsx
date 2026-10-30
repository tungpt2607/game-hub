'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';
import { diffLines, toHunks } from './lineDiff';

const COLORS = {
  add: { bg: 'rgba(46, 160, 67, 0.15)', sign: '+', color: '#1A7F37' },
  del: { bg: 'rgba(248, 81, 73, 0.15)', sign: '-', color: '#CF222E' },
  same: { bg: 'transparent', sign: ' ', color: 'inherit' },
} as const;

/** Khác biệt theo dòng của một file code (xanh = thêm, đỏ = xóa), chỉ hiện các đoạn thay đổi kèm 3 dòng xung quanh. */
export function DiffView({ before, after }: { before: string; after: string }) {
  const hunks = useMemo(() => {
    const lines = diffLines(before, after);
    return lines ? toHunks(lines) : null;
  }, [before, after]);

  if (hunks === null) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
        {t('cms.diff.tooLarge')}
      </Typography>
    );
  }
  return (
    <Box sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12, overflowX: 'auto' }}>
      {hunks.map((hunk, h) => (
        <Box key={h} sx={{ borderTop: h ? '1px dashed' : 'none', borderColor: 'divider' }}>
          {hunk.lines.map((line, i) => {
            const c = COLORS[line.type];
            return (
              <Box key={i} sx={{ display: 'flex', bgcolor: c.bg, whiteSpace: 'pre', minWidth: 'fit-content' }}>
                <Box component="span" sx={{ width: 40, flexShrink: 0, textAlign: 'right', pr: 1, color: 'text.disabled', userSelect: 'none' }}>
                  {line.oldNo ?? ''}
                </Box>
                <Box component="span" sx={{ width: 40, flexShrink: 0, textAlign: 'right', pr: 1, color: 'text.disabled', userSelect: 'none' }}>
                  {line.newNo ?? ''}
                </Box>
                <Box component="span" sx={{ width: 16, flexShrink: 0, color: c.color, userSelect: 'none' }}>
                  {c.sign}
                </Box>
                <Box component="span" sx={{ pr: 2 }}>
                  {line.text || ' '}
                </Box>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
