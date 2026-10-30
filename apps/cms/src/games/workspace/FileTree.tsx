'use client';

import { useState, type DragEvent, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { t } from '@opes/i18n';
import { FileIcon } from './FileIcon';
import { dirName, type TreeNode } from './vfs';

/** Kiểu dữ liệu kéo thả một mục trong cây (phân biệt với file kéo từ máy tính vào). */
export const DRAG_TYPE = 'application/x-opes-path';

export interface FileTreeProps {
  nodes: TreeNode[];
  selected: string | null;
  expanded: Set<string>;
  /** Số lỗi biên dịch theo đường dẫn (thư mục cộng dồn lỗi của mọi file bên trong). */
  errorCount: (path: string) => number;
  onToggle: (path: string) => void;
  /** Bấm vào file: `pin` = bấm đúp (giữ tab). */
  onOpen: (path: string, pin: boolean) => void;
  onSelect: (path: string) => void;
  /** Mở menu của một mục (chuột phải hoặc nút ⋯). Đường dẫn rỗng = thư mục gốc. */
  onMenu: (path: string, position: { top: number; left: number }) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  /** Kéo một mục vào thư mục `folder` (rỗng = gốc). */
  onMove: (from: string, folder: string) => void;
  /** Kéo file từ máy tính vào thư mục `folder`. */
  onDropFiles: (files: File[], folder: string) => void;
}

interface DragHandlers {
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

const ROW_HEIGHT = 28;
const INDENT = 12;

/** Thư mục nhận khi thả vào một dòng: thư mục thì là chính nó, file thì là thư mục chứa file. */
const dropFolder = (node: TreeNode) => (node.type === 'folder' ? node.path : dirName(node.path));

/**
 * Cây thư mục giống VS Code: bấm để mở, bấm đúp để giữ tab, chuột phải hoặc ⋯ để mở menu, F2 đổi tên,
 * Delete để xóa, kéo thả để di chuyển hoặc tải file lên. Trên màn hình cảm ứng nút ⋯ luôn hiện.
 */
export function FileTree(props: FileTreeProps) {
  const { nodes, onMenu, onDropFiles, onMove } = props;
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const dragHandlers = (folder: string): DragHandlers => ({
    onDragOver: (e: DragEvent) => {
      const types = e.dataTransfer.types;
      if (!types.includes(DRAG_TYPE) && !types.includes('Files')) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = types.includes('Files') ? 'copy' : 'move';
      setDropTarget(folder);
    },
    onDragLeave: (e: DragEvent) => {
      e.stopPropagation();
      setDropTarget((d) => (d === folder ? null : d));
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTarget(null);
      const from = e.dataTransfer.getData(DRAG_TYPE);
      if (from) onMove(from, folder);
      else if (e.dataTransfer.files.length) onDropFiles(Array.from(e.dataTransfer.files), folder);
    },
  });

  return (
    <Box
      role="tree"
      aria-label={t('cms.workspace.explorer')}
      {...dragHandlers('')}
      onContextMenu={(e: MouseEvent) => {
        e.preventDefault();
        onMenu('', { top: e.clientY, left: e.clientX });
      }}
      sx={{
        minHeight: '100%',
        py: 0.5,
        outline: dropTarget === '' ? '1px dashed #3794FF' : 'none',
        outlineOffset: -2,
      }}
    >
      {nodes.map((node) => (
        <TreeRow key={node.path} node={node} depth={0} dropTarget={dropTarget} dragHandlers={dragHandlers} {...props} />
      ))}
    </Box>
  );
}

function TreeRow({
  node,
  depth,
  dropTarget,
  dragHandlers,
  ...props
}: FileTreeProps & {
  node: TreeNode;
  depth: number;
  dropTarget: string | null;
  dragHandlers: (folder: string) => DragHandlers;
}) {
  const { selected, expanded, errorCount, onToggle, onOpen, onSelect, onMenu, onRename, onDelete } = props;
  const isFolder = node.type === 'folder';
  const open = isFolder && expanded.has(node.path);
  const errors = errorCount(node.path);
  const highlighted = dropTarget !== null && dropTarget === node.path && isFolder;

  const openMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(node.path);
    onMenu(node.path, { top: e.clientY, left: e.clientX });
  };

  return (
    <>
      <Box
        role="treeitem"
        aria-expanded={isFolder ? open : undefined}
        aria-selected={selected === node.path}
        tabIndex={0}
        draggable
        onDragStart={(e: DragEvent) => {
          e.dataTransfer.setData(DRAG_TYPE, node.path);
          e.dataTransfer.effectAllowed = 'move';
        }}
        {...dragHandlers(dropFolder(node))}
        onClick={() => {
          onSelect(node.path);
          if (isFolder) onToggle(node.path);
          else onOpen(node.path, false);
        }}
        onDoubleClick={() => !isFolder && onOpen(node.path, true)}
        onContextMenu={openMenu}
        onKeyDown={(e) => {
          if (e.key === 'F2') {
            e.preventDefault();
            onRename(node.path);
          } else if (e.key === 'Delete') {
            e.preventDefault();
            onDelete(node.path);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (isFolder) onToggle(node.path);
            else onOpen(node.path, true);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: ROW_HEIGHT,
          pl: `${4 + depth * INDENT}px`,
          pr: 0.5,
          gap: 0.5,
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: 13,
          whiteSpace: 'nowrap',
          color: errors ? 'error.main' : 'text.primary',
          bgcolor: highlighted ? 'action.focus' : selected === node.path ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: highlighted ? 'action.focus' : selected === node.path ? 'action.selected' : 'action.hover' },
          '&:focus-visible': { outline: '1px solid', outlineColor: 'primary.main', outlineOffset: -1 },
          '&:hover .row-more, &:focus-within .row-more, &[aria-selected="true"] .row-more': { opacity: 1 },
        }}
      >
        <Box sx={{ width: 16, display: 'flex', flexShrink: 0, color: 'text.secondary' }}>
          {isFolder && (open ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />)}
        </Box>
        <FileIcon path={node.path} folder={isFolder} open={open} />
        <Box component="span" sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.name}
        </Box>
        {errors > 0 && (
          <Box component="span" sx={{ fontSize: 11, fontWeight: 700, color: 'error.main', px: 0.5 }}>
            {errors}
          </Box>
        )}
        <IconButton
          size="small"
          className="row-more"
          aria-label={t('cms.workspace.more', { name: node.name })}
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            e.stopPropagation();
            onSelect(node.path);
            onMenu(node.path, { top: r.bottom, left: r.left });
          }}
          sx={{ p: 0.25, opacity: 0, '@media (hover: none)': { opacity: 1 } }}
        >
          <MoreHorizIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      {open &&
        node.children.map((child) => (
          <TreeRow key={child.path} node={child} depth={depth + 1} dropTarget={dropTarget} dragHandlers={dragHandlers} {...props} />
        ))}
    </>
  );
}
