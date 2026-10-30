'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AudiotrackOutlined from '@mui/icons-material/AudiotrackOutlined';
import {
  GOOGLE_FONTS_VI,
  cssFontStack,
  isHexColor,
  loadFont,
  type AudioField,
  type BooleanField,
  type ColorField,
  type EmojiOrImage,
  type FontValue,
  type ImageField,
  type MediaRef,
  type NumberField,
  type SelectField,
  type TextField as TextFieldDef,
} from '@opes/module-sdk';
import { t } from '@opes/i18n';
import { MediaPickerDialog } from './MediaPickerDialog';

interface InputProps<F, V> {
  id: string;
  field: F;
  value: V;
  error?: string;
  onChange: (next: V) => void;
}

const helper = (error: string | undefined, help: string | undefined) => error ?? help;

export function TextInput({ id, field, value, error, onChange }: InputProps<TextFieldDef, unknown>) {
  const text = typeof value === 'string' ? value : '';
  const counter = field.maxLength ? `${text.length}/${field.maxLength}` : undefined;
  return (
    <TextField
      id={id}
      label={field.label}
      value={text}
      required={field.required}
      placeholder={field.placeholder}
      multiline={field.multiline}
      minRows={field.multiline ? 2 : undefined}
      error={Boolean(error)}
      helperText={[helper(error, field.help), counter].filter(Boolean).join(' · ') || undefined}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      size="small"
    />
  );
}

export function NumberInput({ id, field, value, error, onChange }: InputProps<NumberField, unknown>) {
  // Giữ chuỗi đang gõ (ví dụ "-" hoặc "") để không nhảy giá trị khi người dùng đang nhập.
  const [draft, setDraft] = useState(typeof value === 'number' ? String(value) : '');
  useEffect(() => {
    if (typeof value === 'number' && Number(draft) !== value) setDraft(String(value));
  }, [value]);
  const range =
    field.min !== undefined && field.max !== undefined ? `${field.min}–${field.max}` : undefined;
  return (
    <TextField
      id={id}
      label={field.label}
      type="number"
      value={draft}
      error={Boolean(error)}
      helperText={helper(error, field.help ?? (range ? `Từ ${range}` : undefined))}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = e.target.value === '' ? NaN : Number(e.target.value);
        onChange(Number.isFinite(n) ? n : null);
      }}
      fullWidth
      size="small"
      slotProps={{
        htmlInput: { min: field.min, max: field.max, step: field.step ?? (field.integer ? 1 : 'any') },
        input: field.unit ? { endAdornment: <InputAdornment position="end">{field.unit}</InputAdornment> } : undefined,
      }}
    />
  );
}

export function BooleanInput({ id, field, value, error, onChange }: InputProps<BooleanField, unknown>) {
  return (
    <FormControl error={Boolean(error)}>
      <FormControlLabel
        control={<Switch id={id} checked={value === true} onChange={(e) => onChange(e.target.checked)} />}
        label={field.label}
      />
      {helper(error, field.help) && <FormHelperText sx={{ mt: -0.5 }}>{helper(error, field.help)}</FormHelperText>}
    </FormControl>
  );
}

export function SelectInput({ id, field, value, error, onChange }: InputProps<SelectField, unknown>) {
  return (
    <FormControl fullWidth size="small" error={Boolean(error)}>
      <InputLabel id={`${id}-label`}>{field.label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        label={field.label}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </Select>
      {helper(error, field.help) && <FormHelperText>{helper(error, field.help)}</FormHelperText>}
    </FormControl>
  );
}

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
        htmlInput: { spellCheck: false, style: { fontFamily: 'monospace', textTransform: 'uppercase' } },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Box
                component="input"
                type="color"
                aria-label={`${field.label} – bảng màu`}
                value={swatch.toLowerCase()}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value.toUpperCase())}
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
            <img src={value.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
      {value && kind === 'audio' && <audio controls preload="none" src={value.url} style={{ width: '100%', marginTop: 8 }} />}
      {helper(error, field.help ?? hint) && <FormHelperText sx={{ mx: 0 }}>{helper(error, field.help ?? hint)}</FormHelperText>}
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
    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5, textAlign: 'center' }}>
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
        <Typography component="legend" variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ px: 0.5 }}>
          {field.label}
        </Typography>
        <Stack direction="row" alignItems="flex-start" flexWrap="wrap" useFlexGap columnGap={2} rowGap={1.5}>
          <Box>
            <Box
              component="input"
              id={`${id}-emoji`}
              aria-label={`${field.label} – ${t('cms.moduleForm.emoji')}`}
              value={v.emoji}
              maxLength={16}
              disabled={Boolean(v.image)}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...v, emoji: e.target.value })}
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
          <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0, flex: '1 1 180px' }}>
            <Box>
              <Box sx={{ ...tile, position: 'relative', overflow: 'hidden' }}>
                {v.image && (
                  <img
                    src={v.image.url}
                    alt=""
                    style={{ position: 'absolute', inset: 4, width: 'calc(100% - 8px)', height: 'calc(100% - 8px)', objectFit: 'contain' }}
                  />
                )}
              </Box>
              {caption(t('cms.moduleForm.image'))}
            </Box>
            <Box sx={{ minWidth: 0, pt: 0.5 }}>
              <Typography variant="body2" noWrap color={v.image ? 'text.primary' : 'text.secondary'}>
                {v.image ? (v.image.name ?? v.image.id) : t('cms.moduleForm.none')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setOpen(true)} sx={{ ml: -0.75 }}>
                  {v.image ? t('cms.moduleForm.change') : t('cms.moduleForm.choose')}
                </Button>
                {v.image && (
                  <Button size="small" color="inherit" onClick={() => onChange({ ...v, image: null })}>
                    {t('cms.moduleForm.clear')}
                  </Button>
                )}
              </Stack>
            </Box>
          </Stack>
        </Stack>
      </Box>
      <FormHelperText sx={{ mx: 0 }}>{helper(error, field.help) ?? t('cms.moduleForm.emojiOrImageHelp')}</FormHelperText>
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

/** Font: chọn trong danh sách font Google có tiếng Việt, xem chữ mẫu ngay. */
export function FontInput({
  id,
  field,
  value,
  error,
  onChange,
}: InputProps<{ label: string; help?: string }, FontValue>) {
  const v: FontValue = value && typeof value === 'object' ? value : { family: '', media: null };
  useEffect(() => {
    if (v.family) void loadFont(v);
  }, [v.family, v.media?.id]);
  return (
    <FormControl fullWidth size="small" error={Boolean(error)}>
      <InputLabel id={`${id}-label`}>{field.label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        label={field.label}
        value={v.media ? '' : v.family}
        onChange={(e) => onChange({ family: e.target.value, media: null })}
        renderValue={(family) => <span style={{ fontFamily: cssFontStack({ family, media: null }) }}>{family}</span>}
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 360 } } } }}
      >
        <ListSubheader>{t('cms.moduleForm.googleFont')}</ListSubheader>
        {GOOGLE_FONTS_VI.map((f) => (
          <MenuItem key={f.family} value={f.family}>
            {f.family}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{helper(error, field.help) ?? t('cms.moduleForm.customFontSoon')}</FormHelperText>
      {v.family && (
        <Typography sx={{ mt: 0.5, fontFamily: cssFontStack(v), fontSize: 18 }}>{t('cms.moduleForm.fontSample')}</Typography>
      )}
    </FormControl>
  );
}
