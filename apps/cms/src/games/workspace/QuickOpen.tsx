'use client';

import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import InputBase from '@mui/material/InputBase';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';
import { FileIcon } from './FileIcon';
import { baseName, dirName } from './vfs';

/** Điểm khớp mờ kiểu VS Code: các chữ của từ khóa xuất hiện theo thứ tự; khớp trong tên file được ưu tiên. */
export function fuzzyScore(query: string, path: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return 0;
  const name = baseName(path).toLowerCase();
  const full = path.toLowerCase();
  const match = (text: string) => {
    let score = 0;
    let at = -1;
    for (const ch of q) {
      const next = text.indexOf(ch, at + 1);
      if (next < 0) return null;
      score += next === at + 1 ? 3 : 1;
      at = next;
    }
    return score;
  };
  const inName = match(name);
  if (inName !== null) return inName + 100 + (name.startsWith(q) ? 50 : 0);
  return match(full);
}

interface Props {
  open: boolean;
  paths: string[];
  onOpen: (path: string) => void;
  onClose: () => void;
}

/** Ctrl+P: gõ vài chữ để tìm và mở nhanh một file. */
export function QuickOpen({ open, paths, onOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const results = useMemo(
    () =>
      paths
        .map((p) => ({ p, s: fuzzyScore(query, p) }))
        .filter((r): r is { p: string; s: number } => r.s !== null)
        .sort((a, b) => b.s - a.s || a.p.localeCompare(b.p))
        .slice(0, 50)
        .map((r) => r.p),
    [paths, query],
  );

  const choose = (path: string | undefined) => {
    if (!path) return;
    onClose();
    onOpen(path);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { position: 'absolute', top: 40, m: 0 } } }}>
      <InputBase
        autoFocus
        fullWidth
        placeholder={t('cms.workspace.quickOpenPlaceholder')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIndex(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(results[index]);
          }
        }}
        inputProps={{ spellCheck: false, autoCapitalize: 'off', style: { fontSize: 16 } }}
        sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}
      />
      <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
        {results.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
            {t('cms.workspace.quickOpenEmpty')}
          </Typography>
        )}
        {results.map((p, i) => (
          <ListItemButton key={p} selected={i === index} onClick={() => choose(p)}>
            <ListItemIcon sx={{ minWidth: 30 }}>
              <FileIcon path={p} />
            </ListItemIcon>
            <ListItemText primary={baseName(p)} secondary={dirName(p) || undefined} />
          </ListItemButton>
        ))}
      </List>
    </Dialog>
  );
}
