'use client';

import ArticleOutlined from '@mui/icons-material/ArticleOutlined';
import AudiotrackOutlined from '@mui/icons-material/AudiotrackOutlined';
import CodeOutlined from '@mui/icons-material/CodeOutlined';
import DataObjectOutlined from '@mui/icons-material/DataObjectOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import FolderSpecialOutlined from '@mui/icons-material/FolderSpecialOutlined';
import FontDownloadOutlined from '@mui/icons-material/FontDownloadOutlined';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import { ASSETS_DIR, extOf } from './vfs';

export type FileCategory = 'code' | 'json' | 'text' | 'image' | 'audio' | 'font' | 'other';

const CATEGORY: Record<string, FileCategory> = {
  ts: 'code',
  tsx: 'code',
  js: 'code',
  jsx: 'code',
  json: 'json',
  md: 'text',
  txt: 'text',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  svg: 'image',
  mp3: 'audio',
  m4a: 'audio',
  ogg: 'audio',
  wav: 'audio',
  woff: 'font',
  woff2: 'font',
  ttf: 'font',
  otf: 'font',
};

export const categoryOf = (path: string): FileCategory => CATEGORY[extOf(path)] ?? 'other';

/** Màu theo loại file, giống cách VS Code phân biệt (TS xanh, TSX xanh ngọc, JSON vàng…). */
const COLOR: Record<string, string> = {
  ts: '#3178C6',
  tsx: '#00A3C4',
  js: '#D4A000',
  jsx: '#00A3C4',
  json: '#C9A100',
};

/** Biểu tượng của một file hoặc thư mục trong cây. */
export function FileIcon({
  path,
  folder,
  open,
  ...props
}: { path: string; folder?: boolean; open?: boolean } & SvgIconProps) {
  const sx = { fontSize: 18, ...props.sx };
  if (folder) {
    if (path === ASSETS_DIR) return <FolderSpecialOutlined {...props} sx={{ ...sx, color: '#B7791F' }} />;
    return open ? <FolderOpenOutlined {...props} sx={{ ...sx, color: '#B7791F' }} /> : <FolderOutlined {...props} sx={{ ...sx, color: '#B7791F' }} />;
  }
  const color = COLOR[extOf(path)];
  switch (categoryOf(path)) {
    case 'code':
      return <CodeOutlined {...props} sx={{ ...sx, color }} />;
    case 'json':
      return <DataObjectOutlined {...props} sx={{ ...sx, color }} />;
    case 'text':
      return <ArticleOutlined {...props} sx={{ ...sx, color: 'text.secondary' }} />;
    case 'image':
      return <ImageOutlined {...props} sx={{ ...sx, color: '#9F7AEA' }} />;
    case 'audio':
      return <AudiotrackOutlined {...props} sx={{ ...sx, color: '#DD6B20' }} />;
    case 'font':
      return <FontDownloadOutlined {...props} sx={{ ...sx, color: '#38A169' }} />;
    default:
      return <DescriptionOutlined {...props} sx={{ ...sx, color: 'text.secondary' }} />;
  }
}
