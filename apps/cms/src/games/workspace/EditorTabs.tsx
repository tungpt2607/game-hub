'use client';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { t } from '@opes/i18n';
import { FileIcon } from './FileIcon';
import type { Tab } from './useTabs';
import { baseName } from './vfs';

interface Props {
  tabs: Tab[];
  active: string | null;
  /** File đã sửa mà chưa lưu nháp (hiện dấu ●). */
  isDirty: (path: string) => boolean;
  /** Số lỗi biên dịch của file (tô đỏ tên tab). */
  errorCount: (path: string) => number;
  onActivate: (path: string) => void;
  onPin: (path: string) => void;
  onClose: (path: string) => void;
}

/** Hàng tab các file đang mở, giống VS Code; vuốt/cuộn ngang khi nhiều tab. */
export function EditorTabs({ tabs, active, isDirty, errorCount, onActivate, onPin, onClose }: Props) {
  if (tabs.length === 0) return null;
  return (
    <Box
      role="tablist"
      sx={{
        display: 'flex',
        overflowX: 'auto',
        bgcolor: '#252526',
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.2)' },
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.path === active;
        const dirty = isDirty(tab.path);
        const errors = errorCount(tab.path);
        return (
          <Box
            key={tab.path}
            role="tab"
            aria-selected={selected}
            title={tab.path}
            tabIndex={0}
            onClick={() => onActivate(tab.path)}
            onDoubleClick={() => onPin(tab.path)}
            onAuxClick={(e) => {
              // Bấm chuột giữa để đóng tab.
              if (e.button === 1) {
                e.preventDefault();
                onClose(tab.path);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivate(tab.path);
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              pl: 1.25,
              pr: 0.5,
              height: 36,
              flexShrink: 0,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 13,
              color: errors ? '#F48771' : selected ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
              bgcolor: selected ? '#1E1E1E' : 'transparent',
              borderTop: 1,
              borderColor: selected ? '#3794FF' : 'transparent',
              borderRight: '1px solid #1E1E1E',
              '&:hover .tab-close, &:focus-within .tab-close': { opacity: 1 },
            }}
          >
            <FileIcon path={tab.path} sx={{ fontSize: 16 }} />
            <Box component="span" sx={{ fontStyle: tab.preview ? 'italic' : 'normal', whiteSpace: 'nowrap' }}>
              {baseName(tab.path)}
            </Box>
            <IconButton
              size="small"
              className="tab-close"
              aria-label={t('cms.workspace.closeTab', { name: baseName(tab.path) })}
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.path);
              }}
              sx={{
                width: 22,
                height: 22,
                color: 'inherit',
                // Giống VS Code: file chưa lưu hiện ●, rê chuột vào thì thành ✕. Trên điện thoại luôn hiện.
                opacity: selected || dirty ? 1 : 0,
                '@media (hover: none)': { opacity: 1 },
                '& .dot': { display: dirty ? 'block' : 'none' },
                '& .x': { display: dirty ? 'none' : 'block' },
                '&:hover .dot': { display: 'none' },
                '&:hover .x': { display: 'block' },
              }}
            >
              <Box className="dot" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'currentColor' }} />
              <CloseIcon className="x" sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        );
      })}
    </Box>
  );
}
