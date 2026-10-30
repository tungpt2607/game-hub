'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { t } from '@opes/i18n';
import type { GameFiles } from '../../types';
import { FileIcon } from '../FileIcon';
import { baseName, dirName } from '../vfs';
import { replaceInFiles, searchFiles, type SearchOptions } from './searchAll';

const toggleSx = (on: boolean) => ({
  minWidth: 26,
  height: 24,
  px: 0.5,
  fontSize: 12,
  fontFamily: 'monospace',
  borderRadius: 0.5,
  border: 1,
  borderColor: on ? 'primary.main' : 'transparent',
  bgcolor: on ? 'action.selected' : 'transparent',
});

/**
 * Tìm trong cả game (Ctrl+Shift+F): kết quả nhóm theo file, bấm để mở đúng chỗ; thay trong một file hoặc
 * mọi file. Chỉ tìm trong file code (không tìm trong ảnh, âm thanh).
 */
export function SearchView({
  files,
  focusToken,
  onOpen,
  onReplace,
}: {
  files: GameFiles;
  /** Đổi giá trị để đặt con trỏ vào ô tìm (khi bấm Ctrl+Shift+F). */
  focusToken: number;
  onOpen: (path: string, from: number, to: number) => void;
  onReplace: (next: GameFiles, count: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [opts, setOpts] = useState({ caseSensitive: false, wholeWord: false, regexp: false });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const input = useRef<HTMLInputElement>(null);
  // Tìm theo giá trị trễ để gõ nhanh không bị giật khi game nhiều file.
  const deferredQuery = useDeferredValue(query);
  const deferredFiles = useDeferredValue(files);
  const options: SearchOptions = useMemo(() => ({ query: deferredQuery, ...opts }), [deferredQuery, opts]);
  const result = useMemo(() => searchFiles(deferredFiles, options), [deferredFiles, options]);

  useEffect(() => {
    if (focusToken) {
      input.current?.focus();
      input.current?.select();
    }
  }, [focusToken]);

  const replace = (paths?: string[]) => {
    const r = replaceInFiles(files, { query, ...opts }, replacement, paths);
    if (r.count) onReplace(r.files, r.count);
  };

  const toggle = (key: keyof typeof opts, label: string, text: string) => (
    <Tooltip title={label}>
      <Box component="button" type="button" aria-pressed={opts[key]} aria-label={label} onClick={() => setOpts((o) => ({ ...o, [key]: !o[key] }))} sx={{ ...toggleSx(opts[key]), cursor: 'pointer', color: 'inherit', background: 'none' }}>
        {text}
      </Box>
    </Tooltip>
  );

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" spacing={0.5} sx={{ p: 1, pb: 0.5 }}>
        <IconButton size="small" onClick={() => setShowReplace((s) => !s)} aria-label={t('cms.editor.toggleReplace')} sx={{ alignSelf: 'flex-start', mt: 0.25 }}>
          {showReplace ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
        <Stack spacing={0.5} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" sx={{ border: 1, borderColor: result.error ? 'error.main' : 'divider', borderRadius: 0.5, pr: 0.25 }}>
            <InputBase
              inputRef={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('cms.editor.find')}
              inputProps={{ spellCheck: false, autoCapitalize: 'off', 'aria-label': t('cms.editor.find') }}
              sx={{ flexGrow: 1, px: 1, fontSize: 13, '@media (pointer: coarse)': { fontSize: 16 } }}
            />
            {toggle('caseSensitive', t('cms.editor.matchCase'), 'Aa')}
            {toggle('wholeWord', t('cms.editor.wholeWord'), 'ab')}
            {toggle('regexp', t('cms.editor.regex'), '.*')}
          </Stack>
          {showReplace && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <InputBase
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder={t('cms.editor.replace')}
                inputProps={{ spellCheck: false, autoCapitalize: 'off', 'aria-label': t('cms.editor.replace') }}
                sx={{ flexGrow: 1, px: 1, fontSize: 13, border: 1, borderColor: 'divider', borderRadius: 0.5, '@media (pointer: coarse)': { fontSize: 16 } }}
              />
              <Button size="small" disabled={!result.total} onClick={() => replace()} sx={{ minWidth: 0, whiteSpace: 'nowrap' }}>
                {t('cms.editor.replaceAll')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Stack>
      <Typography variant="caption" color={result.error ? 'error' : 'text.secondary'} sx={{ px: 1.5, pb: 0.5 }}>
        {result.error
          ? t('cms.editor.invalidRegex')
          : query
            ? t('cms.editor.searchSummary', { count: result.total, files: result.files.length }) + (result.truncated ? '+' : '')
            : ''}
      </Typography>
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', fontSize: 13 }}>
        {result.files.map((f) => {
          const open = !collapsed.has(f.path);
          return (
            <Box key={f.path}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                onClick={() =>
                  setCollapsed((s) => {
                    const next = new Set(s);
                    if (next.has(f.path)) next.delete(f.path);
                    else next.add(f.path);
                    return next;
                  })
                }
                sx={{ px: 0.5, py: 0.25, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '&:hover .replace-file': { opacity: 1 } }}
              >
                {open ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}
                <FileIcon path={f.path} />
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {baseName(f.path)}
                </Box>
                <Box component="span" sx={{ color: 'text.secondary', fontSize: 11, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dirName(f.path)}
                </Box>
                {showReplace && (
                  <Button
                    size="small"
                    className="replace-file"
                    onClick={(e) => {
                      e.stopPropagation();
                      replace([f.path]);
                    }}
                    sx={{ minWidth: 0, py: 0, fontSize: 11, opacity: 0, '@media (hover: none)': { opacity: 1 } }}
                  >
                    {t('cms.editor.replaceInFile')}
                  </Button>
                )}
                <Box component="span" sx={{ fontSize: 11, px: 0.75, borderRadius: 2, bgcolor: 'action.selected' }}>
                  {f.matches.length}
                </Box>
              </Stack>
              {open &&
                f.matches.map((m, i) => (
                  <Box
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(f.path, m.from, m.to)}
                    onKeyDown={(e) => e.key === 'Enter' && onOpen(f.path, m.from, m.to)}
                    sx={{ pl: 4.5, pr: 1, py: 0.25, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace', fontSize: 12, '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    {m.preview.slice(0, m.previewFrom)}
                    <Box component="mark" sx={{ bgcolor: 'rgba(234, 92, 0, 0.33)', color: 'inherit', textDecoration: showReplace && replacement !== '' ? 'line-through' : 'none' }}>
                      {m.preview.slice(m.previewFrom, m.previewTo)}
                    </Box>
                    {showReplace && replacement !== '' && (
                      <Box component="span" sx={{ bgcolor: 'rgba(46, 160, 67, 0.25)' }}>
                        {replacement}
                      </Box>
                    )}
                    {m.preview.slice(m.previewTo)}
                  </Box>
                ))}
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
