import type { Extension } from '@codemirror/state';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { t } from '@opes/i18n';
import type { GameAsset } from '@opes/contracts';
import { AssetPreview } from './AssetPreview';
import { CodeEditor, type CursorInfo, type EditorApi } from './CodeEditor';

/**
 * Vùng chính của khu sửa code: trình sửa của file code (giữ nguyên khi chuyển sang tab file kèm để
 * không mất lịch sử hoàn tác), xem trước file kèm, hoặc hướng dẫn khi chưa mở file nào.
 */
export function EditorArea({
  codePath,
  active,
  activeAsset,
  value,
  shared,
  onEdit,
  onCursor,
  onMount,
  onCopyUsage,
}: {
  /** File code gần nhất (vẫn giữ trình sửa khi đang xem file kèm). */
  codePath: string | null;
  /** Tab đang hiện. */
  active: string | null;
  activeAsset: GameAsset | undefined;
  value: string;
  shared: Extension;
  onEdit: (text: string) => void;
  onCursor: (cursor: CursorInfo) => void;
  onMount: (api: EditorApi) => void;
  onCopyUsage: () => void;
}) {
  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
      {codePath && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: active === codePath ? 'block' : 'none',
          }}
        >
          <CodeEditor
            path={codePath}
            value={value}
            shared={shared}
            height="100%"
            onChange={onEdit}
            onCursor={onCursor}
            onMount={onMount}
          />
        </Box>
      )}
      {active && activeAsset && (
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <AssetPreview path={active} asset={activeAsset} onCopyUsage={onCopyUsage} />
        </Box>
      )}
      {!active && (
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1}
          sx={{
            position: 'absolute',
            inset: 0,
            color: 'rgba(255,255,255,0.5)',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2">{t('cms.workspace.empty')}</Typography>
          <Typography variant="caption">{t('cms.workspace.shortcuts')}</Typography>
        </Stack>
      )}
    </Box>
  );
}
