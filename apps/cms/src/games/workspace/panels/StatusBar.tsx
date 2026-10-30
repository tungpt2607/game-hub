'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { t } from '@opes/i18n';
import { useCursor, type CursorStore } from '../cursorStore';
import { extOf } from '../vfs';
import type { TsStatus } from '../ts/tsClient';

const LANGUAGE: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript JSX',
  js: 'JavaScript',
  jsx: 'JavaScript JSX',
  json: 'JSON',
  md: 'Markdown',
  txt: 'Văn bản',
};

const itemSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1,
  height: '100%',
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
} as const;

/** Thanh trạng thái dưới cùng (giống VS Code): số lỗi, trạng thái biên dịch và gợi ý code, dòng/cột, ngôn ngữ. */
export function StatusBar({
  cursorStore,
  errors,
  warnings,
  compiling,
  tsStatus,
  formatOnSave,
  onToggleProblems,
  onToggleFormatOnSave,
}: {
  cursorStore: CursorStore;
  errors: number;
  warnings: number;
  compiling: boolean;
  tsStatus: TsStatus;
  formatOnSave: boolean;
  onToggleProblems: () => void;
  onToggleFormatOnSave: () => void;
}) {
  const cursor = useCursor(cursorStore);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        height: 24,
        flexShrink: 0,
        bgcolor: '#007ACC',
        color: '#FFF',
        fontSize: 12,
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none',
      }}
    >
      <Box component="button" type="button" onClick={onToggleProblems} sx={itemSx} aria-label={t('cms.editor.toggleProblems')}>
        <ErrorOutline sx={{ fontSize: 14 }} /> {errors}
        <WarningAmberOutlined sx={{ fontSize: 14, ml: 0.5 }} /> {warnings}
      </Box>
      <Box sx={{ ...itemSx, cursor: 'default', '&:hover': undefined }}>
        {compiling ? t('cms.editor.compiling') : ''}
        {tsStatus === 'loading' ? ` ${t('cms.editor.tsLoading')}` : tsStatus === 'error' ? ` ${t('cms.editor.tsError')}` : ''}
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      {cursor && (
        <>
          <Box sx={{ ...itemSx, cursor: 'default', '&:hover': undefined }}>
            {t('cms.editor.lineColumn', { line: cursor.line, column: cursor.column + 1 })}
          </Box>
          <Box sx={{ ...itemSx, cursor: 'default', '&:hover': undefined }}>{LANGUAGE[extOf(cursor.path)] ?? ''}</Box>
        </>
      )}
      <Tooltip title={t('cms.editor.formatOnSaveHint')}>
        <Box component="button" type="button" onClick={onToggleFormatOnSave} sx={itemSx}>
          {formatOnSave ? t('cms.editor.formatOnSaveOn') : t('cms.editor.formatOnSaveOff')}
        </Box>
      </Tooltip>
    </Box>
  );
}
