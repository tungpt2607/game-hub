import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GameSource, SerializedSchema } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { PreviewFrame } from '../module-ui/PreviewFrame';

/** Khung chạy thử game đang sửa: chọn cấu hình (mặc định hoặc một mẫu), xem trước, tên và phiên bản. */
export function GamePreviewPanel({
  schema,
  presetId,
  onPresetChange,
  source,
  config,
  onSchema,
}: {
  schema: SerializedSchema | null;
  /** Mẫu đang chọn; chuỗi rỗng = cấu hình mặc định. */
  presetId: string;
  onPresetChange: (presetId: string) => void;
  /** null khi chưa biên dịch thành công lần nào. */
  source: GameSource | null;
  config: unknown;
  onSchema: (schema: SerializedSchema | null, error: string | null) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <TextField
        select
        size="small"
        label={t('cms.games.previewConfig')}
        value={presetId}
        onChange={(e) => onPresetChange(e.target.value)}
        disabled={!schema}
      >
        <MenuItem value="">{t('cms.games.defaults')}</MenuItem>
        {(schema?.presets ?? []).map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </TextField>
      {source ? (
        <PreviewFrame source={source} config={config} onSchema={onSchema} />
      ) : (
        <Alert severity="info">{t('cms.games.previewWaiting')}</Alert>
      )}
      {schema && (
        <Typography variant="body2" color="text.secondary">
          {schema.name} · v{schema.version}
        </Typography>
      )}
    </Stack>
  );
}
