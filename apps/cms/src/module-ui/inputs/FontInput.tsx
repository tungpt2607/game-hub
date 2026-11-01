'use client';

import { useEffect, useState } from 'react';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import {
  GOOGLE_FONTS_VI,
  cssFontStack,
  loadFont,
  type FontValue,
  type MediaRef,
} from '@opes/module-sdk';
import { t } from '@opes/i18n';
import type { MediaListResponse } from '@opes/contracts';
import { api } from '../../lib/api';
import { MediaPickerDialog, toMediaRef } from '../MediaPickerDialog';
import { type InputProps, helper } from './shared';

/** Font: chọn trong danh sách font Google có tiếng Việt, xem chữ mẫu ngay. */
export function FontInput({
  id,
  field,
  value,
  error,
  onChange,
}: InputProps<{ label: string; help?: string }, FontValue>) {
  const v: FontValue = value && typeof value === 'object' ? value : { family: '', media: null };
  const [pickerOpen, setPickerOpen] = useState(false);
  // Font riêng đã tải lên thư viện; tải khi mở danh sách lần đầu.
  const [custom, setCustom] = useState<MediaRef[] | null>(null);
  useEffect(() => {
    if (v.family) void loadFont(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `v` là object mới ở mỗi lần render; font chỉ đổi khi family hoặc file đổi.
  }, [v.family, v.media?.id]);

  const loadCustom = () => {
    if (custom) return;
    api<MediaListResponse>('/media?kind=font')
      .then((res) => setCustom(res.items.map(toMediaRef)))
      .catch(() => setCustom([]));
  };
  const fontOf = (ref: MediaRef): FontValue => ({
    family: (ref.name ?? 'Font riêng').replace(/\.[^.]+$/, ''),
    media: ref,
  });
  const customList = [
    ...(v.media ? [v.media] : []),
    ...(custom ?? []).filter((r) => r.id !== v.media?.id),
  ];
  const selected = v.media ? `media:${v.media.id}` : v.family;

  return (
    <FormControl fullWidth size="small" error={Boolean(error)}>
      <InputLabel id={`${id}-label`}>{field.label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        label={field.label}
        value={selected}
        onOpen={loadCustom}
        onChange={(e) => {
          const next = e.target.value;
          if (next === '__upload') {
            setPickerOpen(true);
            return;
          }
          if (next.startsWith('media:')) {
            const ref = customList.find((r) => `media:${r.id}` === next);
            if (ref) onChange(fontOf(ref));
            return;
          }
          onChange({ family: next, media: null });
        }}
        renderValue={() => <span style={{ fontFamily: cssFontStack(v) }}>{v.family}</span>}
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 400 } } } }}
      >
        <ListSubheader>{t('cms.moduleForm.customFont')}</ListSubheader>
        {customList.map((ref) => (
          <MenuItem key={ref.id} value={`media:${ref.id}`}>
            {fontOf(ref).family}
          </MenuItem>
        ))}
        {custom === null && !v.media && (
          <MenuItem disabled value="__loading">
            {t('common.loading')}
          </MenuItem>
        )}
        <MenuItem value="__upload" sx={{ color: 'primary.main' }}>
          {t('cms.moduleForm.uploadFont')}
        </MenuItem>
        <ListSubheader>{t('cms.moduleForm.googleFont')}</ListSubheader>
        {GOOGLE_FONTS_VI.map((f) => (
          <MenuItem key={f.family} value={f.family}>
            {f.family}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{helper(error, field.help) ?? t('cms.moduleForm.fontHelp')}</FormHelperText>
      {v.family && (
        <Typography sx={{ mt: 0.5, fontFamily: cssFontStack(v), fontSize: 18 }}>
          {t('cms.moduleForm.fontSample')}
        </Typography>
      )}
      <MediaPickerDialog
        open={pickerOpen}
        kind="font"
        onClose={() => setPickerOpen(false)}
        onPick={(ref) => {
          setPickerOpen(false);
          setCustom((prev) => (prev ? [ref, ...prev.filter((r) => r.id !== ref.id)] : prev));
          onChange(fontOf(ref));
        }}
      />
    </FormControl>
  );
}
