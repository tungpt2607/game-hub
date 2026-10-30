'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { t } from '@opes/i18n';
import { FileIcon } from '../FileIcon';
import { baseName } from '../vfs';

/** Một lỗi trong bảng Vấn đề: từ bước biên dịch (esbuild) hoặc từ kiểm tra kiểu (TypeScript). */
export interface Problem {
  path: string | null;
  /** Dòng (từ 1) và cột (từ 0). */
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: 'build' | 'ts';
}

/** Một chỗ dùng trong kết quả "Tìm mọi chỗ dùng". */
export interface ReferenceItem {
  path: string;
  from: number;
  to: number;
  line: number;
  lineText: string;
}

export type PanelTab = 'problems' | 'references';

interface Props {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  problems: Problem[];
  references: { title: string; items: ReferenceItem[] } | null;
  height: number;
  onOpenProblem: (p: Problem) => void;
  onOpenReference: (r: ReferenceItem) => void;
  onClose: () => void;
}

function groupByFile<T extends { path: string | null }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.path ?? '';
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()];
}

const rowSx = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1,
  px: 1.5,
  py: 0.25,
  cursor: 'pointer',
  fontSize: 12.5,
  '&:hover': { bgcolor: 'action.hover' },
} as const;

/** Bảng dưới khung code (giống VS Code): Vấn đề (mọi lỗi của game) và Tham chiếu (Shift+F12). */
export function BottomPanel({ tab, onTab, problems, references, height, onOpenProblem, onOpenReference, onClose }: Props) {
  return (
    <Stack sx={{ height, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', minHeight: 0 }}>
      <Stack direction="row" alignItems="center" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 32, pr: 0.5 }}>
        <Tabs value={tab} onChange={(_, v: PanelTab) => onTab(v)} sx={{ minHeight: 32, flexGrow: 1, '& .MuiTab-root': { minHeight: 32, py: 0, fontSize: 12 } }}>
          <Tab value="problems" label={t('cms.editor.problems', { count: problems.length })} />
          <Tab value="references" label={t('cms.editor.references')} disabled={!references} />
        </Tabs>
        <IconButton size="small" onClick={onClose} aria-label={t('common.close')}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', py: 0.5 }}>
        {tab === 'problems' &&
          (problems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1.5 }}>
              {t('cms.editor.noProblems')}
            </Typography>
          ) : (
            groupByFile(problems).map(([path, list]) => (
              <Box key={path}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1, py: 0.25, fontSize: 12.5, fontWeight: 600 }}>
                  {path && <FileIcon path={path} sx={{ fontSize: 16 }} />}
                  <span>{path ? baseName(path) : t('cms.editor.general')}</span>
                  <Typography component="span" variant="caption" color="text.secondary">
                    {path}
                  </Typography>
                </Stack>
                {list.map((p, i) => (
                  <Box key={i} sx={{ ...rowSx, pl: 4 }} role="button" tabIndex={0} onClick={() => onOpenProblem(p)} onKeyDown={(e) => e.key === 'Enter' && onOpenProblem(p)}>
                    {p.severity === 'error' ? (
                      <ErrorOutline sx={{ fontSize: 16, color: 'error.main', mt: '1px' }} />
                    ) : (
                      <WarningAmberOutlined sx={{ fontSize: 16, color: 'warning.main', mt: '1px' }} />
                    )}
                    <Box sx={{ flexGrow: 1, whiteSpace: 'pre-wrap' }}>
                      {p.message}{' '}
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {p.source === 'ts' ? t('cms.editor.typeCheck') : t('cms.editor.build')}
                        {p.line > 0 ? ` [${p.line}, ${p.column + 1}]` : ''}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            ))
          ))}
        {tab === 'references' && references && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, display: 'block' }}>
              {references.title}
            </Typography>
            {groupByFile(references.items).map(([path, list]) => (
              <Box key={path}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1, py: 0.25, fontSize: 12.5, fontWeight: 600 }}>
                  <FileIcon path={path} sx={{ fontSize: 16 }} />
                  <span>{baseName(path)}</span>
                  <Typography component="span" variant="caption" color="text.secondary">
                    {path.startsWith('lib:') ? t('cms.editor.library') : path} · {list.length}
                  </Typography>
                </Stack>
                {list.map((r, i) => (
                  <Box key={i} sx={{ ...rowSx, pl: 4 }} role="button" tabIndex={0} onClick={() => onOpenReference(r)} onKeyDown={(e) => e.key === 'Enter' && onOpenReference(r)}>
                    <Box component="span" sx={{ color: 'text.secondary', minWidth: 32, textAlign: 'right', fontFamily: 'monospace' }}>
                      {r.line}
                    </Box>
                    <Box component="span" sx={{ fontFamily: 'monospace', whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.lineText}
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
          </>
        )}
      </Box>
    </Stack>
  );
}
