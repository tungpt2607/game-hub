'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AudiotrackOutlined from '@mui/icons-material/AudiotrackOutlined';
import { type AudioField, type ImageField, type MediaRef } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { MediaPickerDialog } from '../MediaPickerDialog';
import { type InputProps, helper } from './shared';

/** Ô chọn một file media (ảnh hoặc âm thanh) từ thư viện. */
export function MediaInput({
  id,
  field,
  value,
  error,
  onChange,
}: InputProps<ImageField | AudioField, MediaRef | null>) {
  const [open, setOpen] = useState(false);
  const kind = field.type;
  const hint = field.type === 'image' ? field.hint : undefined;
  return (
    <FormControl fullWidth error={Boolean(error)} id={id}>
      <Typography variant="body2" color={error ? 'error' : 'text.secondary'} sx={{ mb: 0.5 }}>
        {field.label}
        {field.required ? ' *' : ''}
      </Typography>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 56,
            height: 56,
            flexShrink: 0,
            borderRadius: 1,
            border: 1,
            borderColor: error ? 'error.main' : 'divider',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            bgcolor: 'action.hover',
            backgroundImage:
              kind === 'image' && value
                ? 'repeating-conic-gradient(rgba(0,0,0,.06) 0% 25%, transparent 0% 50%)'
                : undefined,
            backgroundSize: '10px 10px',
          }}
        >
          {value && kind === 'image' && (
            <img
              src={value.url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
          {value && kind === 'audio' && <AudiotrackOutlined color="action" />}
        </Box>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" noWrap color={value ? 'text.primary' : 'text.secondary'}>
            {value ? (value.name ?? value.id) : t('cms.moduleForm.none')}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setOpen(true)}>
              {value ? t('cms.moduleForm.change') : t('cms.moduleForm.choose')}
            </Button>
            {value && (
              <Button size="small" color="inherit" onClick={() => onChange(null)}>
                {t('cms.moduleForm.clear')}
              </Button>
            )}
          </Stack>
        </Box>
      </Stack>
      {value && kind === 'audio' && (
        <audio controls preload="none" src={value.url} style={{ width: '100%', marginTop: 8 }} />
      )}
      {helper(error, field.help ?? hint) && (
        <FormHelperText sx={{ mx: 0 }}>{helper(error, field.help ?? hint)}</FormHelperText>
      )}
      <MediaPickerDialog
        open={open}
        kind={kind}
        onClose={() => setOpen(false)}
        onPick={(ref) => {
          setOpen(false);
          onChange(ref);
        }}
      />
    </FormControl>
  );
}
