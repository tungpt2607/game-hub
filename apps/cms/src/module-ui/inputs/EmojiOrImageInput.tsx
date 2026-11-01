'use client';

import { useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type EmojiOrImage } from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { MediaPickerDialog } from '../MediaPickerDialog';
import { type InputProps, helper } from './shared';

/** Emoji hoặc ảnh: một khung chung, ô emoji và ô ảnh nằm thẳng hàng (có ảnh thì ảnh được dùng). */
export function EmojiOrImageInput({
  id,
  field,
  value,
  error,
  onChange,
}: InputProps<{ label: string; help?: string }, EmojiOrImage>) {
  const v: EmojiOrImage = value && typeof value === 'object' ? value : { emoji: '', image: null };
  const [open, setOpen] = useState(false);
  const tile = {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: 1,
    border: 1,
    borderColor: 'divider',
    bgcolor: 'action.hover',
  } as const;
  const caption = (text: string) => (
    <Typography
      variant="caption"
      color="text.secondary"
      component="div"
      sx={{ mt: 0.5, textAlign: 'center' }}
    >
      {text}
    </Typography>
  );
  return (
    <FormControl fullWidth error={Boolean(error)} id={id}>
      <Box
        component="fieldset"
        sx={{
          m: 0,
          px: 2,
          pt: 1,
          pb: 1.5,
          border: 1,
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          minWidth: 0,
        }}
      >
        <Typography
          component="legend"
          variant="caption"
          color={error ? 'error' : 'text.secondary'}
          sx={{ px: 0.5 }}
        >
          {field.label}
        </Typography>
        <Stack
          direction="row"
          alignItems="flex-start"
          flexWrap="wrap"
          useFlexGap
          columnGap={2}
          rowGap={1.5}
        >
          <Box>
            <Box
              component="input"
              id={`${id}-emoji`}
              aria-label={`${field.label} – ${t('cms.moduleForm.emoji')}`}
              value={v.emoji}
              maxLength={16}
              disabled={Boolean(v.image)}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChange({ ...v, emoji: e.target.value })
              }
              sx={{
                ...tile,
                display: 'block',
                p: 0,
                fontSize: 28,
                lineHeight: '56px',
                textAlign: 'center',
                color: 'text.primary',
                opacity: v.image ? 0.4 : 1,
                outline: 'none',
                '&:focus': { borderColor: 'primary.main', borderWidth: 2 },
              }}
            />
            {caption(t('cms.moduleForm.emoji'))}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: '56px' }}>
            {t('cms.moduleForm.or')}
          </Typography>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="flex-start"
            sx={{ minWidth: 0, flex: '1 1 180px' }}
          >
            <Box>
              <Box sx={{ ...tile, position: 'relative', overflow: 'hidden' }}>
                {v.image && (
                  <img
                    src={v.image.url}
                    alt=""
                    style={{
                      position: 'absolute',
                      inset: 4,
                      width: 'calc(100% - 8px)',
                      height: 'calc(100% - 8px)',
                      objectFit: 'contain',
                    }}
                  />
                )}
              </Box>
              {caption(t('cms.moduleForm.image'))}
            </Box>
            <Box sx={{ minWidth: 0, pt: 0.5 }}>
              <Typography
                variant="body2"
                noWrap
                color={v.image ? 'text.primary' : 'text.secondary'}
              >
                {v.image ? (v.image.name ?? v.image.id) : t('cms.moduleForm.none')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setOpen(true)} sx={{ ml: -0.75 }}>
                  {v.image ? t('cms.moduleForm.change') : t('cms.moduleForm.choose')}
                </Button>
                {v.image && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => onChange({ ...v, image: null })}
                  >
                    {t('cms.moduleForm.clear')}
                  </Button>
                )}
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Box>
      <FormHelperText sx={{ mx: 0 }}>
        {helper(error, field.help) ?? t('cms.moduleForm.emojiOrImageHelp')}
      </FormHelperText>
      <MediaPickerDialog
        open={open}
        kind="image"
        onClose={() => setOpen(false)}
        onPick={(image) => {
          setOpen(false);
          onChange({ ...v, image });
        }}
      />
    </FormControl>
  );
}
