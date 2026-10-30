'use client';

import { Fragment } from 'react';
import Box from '@mui/material/Box';
import { useCursor, type CursorStore } from '../cursorStore';
import { FileIcon } from '../FileIcon';
import type { TsOutlineItem } from '../ts/protocol';

/**
 * Thanh đường dẫn dưới hàng tab (giống VS Code): thư mục › file › hàm đang đặt con trỏ.
 * Bấm vào tên hàm để mở danh sách hàm của file (Ctrl+Shift+O).
 */
export function Breadcrumbs({
  path,
  outline,
  cursorStore,
  onShowOutline,
}: {
  path: string;
  outline: TsOutlineItem[];
  cursorStore: CursorStore;
  onShowOutline: () => void;
}) {
  const cursor = useCursor(cursorStore);
  const pos = cursor?.path === path ? cursor.pos : -1;
  // Các ký hiệu chứa con trỏ, từ ngoài vào trong (danh sách đã theo thứ tự cây).
  const chain: TsOutlineItem[] = [];
  for (const item of outline) {
    if (pos >= item.from && pos <= item.to) {
      while (chain.length && chain[chain.length - 1]!.depth >= item.depth) chain.pop();
      chain.push(item);
    }
  }
  const parts = (path.startsWith('lib:') ? path.slice(4).replace(/^\//, '') : path).split('/');
  const sep = (
    <Box component="span" sx={{ opacity: 0.5, px: 0.5 }}>
      ›
    </Box>
  );
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: 22,
        px: 1.5,
        flexShrink: 0,
        bgcolor: '#1E1E1E',
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        whiteSpace: 'nowrap',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && sep}
          {i === parts.length - 1 && <FileIcon path={path} sx={{ fontSize: 14, mr: 0.5 }} />}
          <span>{part}</span>
        </Fragment>
      ))}
      {chain.map((item, i) => (
        <Fragment key={`${item.name}-${i}`}>
          {sep}
          <Box component="button" type="button" onClick={onShowOutline} sx={{ all: 'unset', cursor: 'pointer', '&:hover': { color: '#FFF' } }}>
            {item.name}
          </Box>
        </Fragment>
      ))}
    </Box>
  );
}
