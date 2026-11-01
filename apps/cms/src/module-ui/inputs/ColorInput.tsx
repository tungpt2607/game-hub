'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { isHexColor, type ColorField } from '@opes/module-sdk';
import { type InputProps, helper } from './shared';

/** Màu: ô chọn màu của trình duyệt + ô nhập mã hex. */
export function ColorInput({ id, field, value, error, onChange }: InputProps<ColorField, unknown>) {
  const hex = typeof value === 'string' ? value : '';
  const [draft, setDraft] = useState(hex);
  useEffect(() => setDraft(hex), [hex]);
  // <input type="color"> chỉ nhận dạng #rrggbb.
  const swatch = /^#[0-9a-fA-F]{6}$/.test(hex)
    ? hex
    : /^#[0-9a-fA-F]{3}$/.test(hex)
      ? '#' + [...hex.slice(1)].map((c) => c + c).join('')
      : /^#[0-9a-fA-F]{8}$/.test(hex)
        ? hex.slice(0, 7)
        : '#000000';
  return (
    <TextField
      id={id}
      label={field.label}
      value={draft}
      error={Boolean(error)}
      helperText={helper(error, field.help)}
      onChange={(e) => {
        const next = e.target.value.trim();
        setDraft(next);
        onChange(next);
      }}
      fullWidth
      size="small"
      slotProps={{
        htmlInput: {
          spellCheck: false,
          style: { fontFamily: 'monospace', textTransform: 'uppercase' },
        },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Box
                component="input"
                type="color"
                aria-label={`${field.label} – bảng màu`}
                value={swatch.toLowerCase()}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onChange(e.target.value.toUpperCase())
                }
                sx={{
                  width: 28,
                  height: 28,
                  p: 0,
                  border: 1,
                  borderColor: isHexColor(hex) ? 'divider' : 'error.main',
                  borderRadius: 1,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  '&::-webkit-color-swatch-wrapper': { p: 0 },
                  '&::-webkit-color-swatch': { border: 'none', borderRadius: '3px' },
                }}
              />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
