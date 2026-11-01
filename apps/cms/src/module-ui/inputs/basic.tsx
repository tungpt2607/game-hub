'use client';

import { useEffect, useState } from 'react';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import {
  type BooleanField,
  type NumberField,
  type SelectField,
  type TextField as TextFieldDef,
} from '@opes/module-sdk';
import { type InputProps, helper } from './shared';

export function TextInput({
  id,
  field,
  value,
  error,
  onChange,
}: InputProps<TextFieldDef, unknown>) {
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

export function NumberInput({
  id,
  field,
  value,
  error,
  onChange,
}: InputProps<NumberField, unknown>) {
  // Giữ chuỗi đang gõ (ví dụ "-" hoặc "") để không nhảy giá trị khi người dùng đang nhập.
  const [draft, setDraft] = useState(typeof value === 'number' ? String(value) : '');
  useEffect(() => {
    if (typeof value === 'number' && Number(draft) !== value) setDraft(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đồng bộ khi giá trị bên ngoài đổi, không ghi đè chuỗi người dùng đang gõ.
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
        htmlInput: {
          min: field.min,
          max: field.max,
          step: field.step ?? (field.integer ? 1 : 'any'),
        },
        input: field.unit
          ? { endAdornment: <InputAdornment position="end">{field.unit}</InputAdornment> }
          : undefined,
      }}
    />
  );
}

export function BooleanInput({
  id,
  field,
  value,
  error,
  onChange,
}: InputProps<BooleanField, unknown>) {
  return (
    <FormControl error={Boolean(error)}>
      <FormControlLabel
        control={
          <Switch id={id} checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        }
        label={field.label}
      />
      {helper(error, field.help) && (
        <FormHelperText sx={{ mt: -0.5 }}>{helper(error, field.help)}</FormHelperText>
      )}
    </FormControl>
  );
}

export function SelectInput({
  id,
  field,
  value,
  error,
  onChange,
}: InputProps<SelectField, unknown>) {
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
