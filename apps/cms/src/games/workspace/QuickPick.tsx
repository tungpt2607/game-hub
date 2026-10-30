'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import InputBase from '@mui/material/InputBase';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';

/** Điểm khớp mờ kiểu VS Code: các chữ của từ khóa xuất hiện theo thứ tự; khớp liền nhau và khớp đầu được ưu tiên. */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return 0;
  const s = text.toLowerCase();
  let score = 0;
  let at = -1;
  for (const ch of q) {
    const next = s.indexOf(ch, at + 1);
    if (next < 0) return null;
    score += next === at + 1 ? 3 : 1;
    at = next;
  }
  return score + (s.startsWith(q) ? 50 : 0);
}

export interface QuickPickItem {
  id: string;
  label: string;
  /** Chữ nhỏ bên dưới (ví dụ thư mục chứa file). */
  description?: string;
  /** Chữ bên phải (ví dụ phím tắt). */
  hint?: string;
  icon?: ReactNode;
  /** Thụt lề (danh sách hàm lồng nhau). */
  depth?: number;
  /** Chữ dùng để tìm, mặc định là label. */
  searchText?: string;
}

interface Props {
  open: boolean;
  placeholder: string;
  items: QuickPickItem[];
  /** Giữ thứ tự gốc khi chưa gõ gì (danh sách hàm theo thứ tự trong file). */
  keepOrder?: boolean;
  onPick: (item: QuickPickItem) => void;
  onClose: () => void;
}

/** Hộp chọn nhanh kiểu VS Code (Ctrl+P tìm file, Ctrl+Shift+P bảng lệnh, Ctrl+Shift+O danh sách hàm). */
export function QuickPick({ open, placeholder, items, keepOrder, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query && keepOrder) return items.slice(0, 200);
    return items
      .map((item) => ({ item, s: fuzzyScore(query, item.searchText ?? item.label) }))
      .filter((r): r is { item: QuickPickItem; s: number } => r.s !== null)
      .sort((a, b) => b.s - a.s || a.item.label.localeCompare(b.item.label))
      .slice(0, 100)
      .map((r) => r.item);
  }, [items, query, keepOrder]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const choose = (item: QuickPickItem | undefined) => {
    if (!item) return;
    onClose();
    onPick(item);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { position: 'absolute', top: 40, m: 0 } } }}>
      <InputBase
        autoFocus
        fullWidth
        placeholder={placeholder}
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
      <List dense ref={list} sx={{ maxHeight: 380, overflow: 'auto' }}>
        {results.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
            {t('cms.workspace.quickOpenEmpty')}
          </Typography>
        )}
        {results.map((item, i) => (
          <ListItemButton
            key={item.id}
            data-index={i}
            selected={i === index}
            onClick={() => choose(item)}
            sx={{ pl: 2 + (item.depth ?? 0) * 2 }}
          >
            {item.icon && <ListItemIcon sx={{ minWidth: 30 }}>{item.icon}</ListItemIcon>}
            <ListItemText primary={item.label} secondary={item.description} />
            {item.hint && (
              <Box component="span" sx={{ ml: 2, fontSize: 12, color: 'text.secondary', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {item.hint}
              </Box>
            )}
          </ListItemButton>
        ))}
      </List>
    </Dialog>
  );
}
