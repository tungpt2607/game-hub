import type { ReactNode } from 'react';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RedoIcon from '@mui/icons-material/Redo';
import SearchIcon from '@mui/icons-material/Search';
import ShortcutIcon from '@mui/icons-material/Shortcut';
import UndoIcon from '@mui/icons-material/Undo';
import { t } from '@opes/i18n';

function ToolButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          aria-label={label}
          disabled={disabled}
          sx={{ color: 'inherit', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

/**
 * Nút bên phải hàng tab: hoàn tác / làm lại, tìm trong file, (trên điện thoại) đi tới định nghĩa và
 * quay lại, bảng lệnh. Nút nào không truyền hàm xử lý thì không hiện.
 */
export function EditorToolbar({
  onUndo,
  onRedo,
  onSearch,
  onDefinition,
  onBack,
  canBack = true,
  onPalette,
}: {
  onUndo?: () => void;
  onRedo?: () => void;
  onSearch?: () => void;
  onDefinition?: () => void;
  onBack?: () => void;
  canBack?: boolean;
  onPalette: () => void;
}) {
  return (
    <Stack direction="row" alignItems="center" sx={{ px: 0.5, color: '#CCC', flexShrink: 0 }}>
      {onUndo && (
        <ToolButton
          label={t('cms.games.undo')}
          icon={<UndoIcon fontSize="small" />}
          onClick={onUndo}
        />
      )}
      {onRedo && (
        <ToolButton
          label={t('cms.games.redo')}
          icon={<RedoIcon fontSize="small" />}
          onClick={onRedo}
        />
      )}
      {onSearch && (
        <ToolButton
          label={t('cms.games.search')}
          icon={<SearchIcon fontSize="small" />}
          onClick={onSearch}
        />
      )}
      {onDefinition && (
        <ToolButton
          label={t('cms.editor.goToDefinition')}
          icon={<ShortcutIcon fontSize="small" />}
          onClick={onDefinition}
        />
      )}
      {onBack && (
        <ToolButton
          label={t('cms.editor.back')}
          icon={<ArrowBackIcon fontSize="small" />}
          onClick={onBack}
          disabled={!canBack}
        />
      )}
      <ToolButton
        label={t('cms.editor.cmdPalette')}
        icon={<MoreVertIcon fontSize="small" />}
        onClick={onPalette}
      />
    </Stack>
  );
}
