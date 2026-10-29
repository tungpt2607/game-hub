'use client';

import TextField from '@mui/material/TextField';
import { PASSWORD_MIN_LENGTH } from '@opes/contracts';
import { t } from '@opes/i18n';

/** Hai ô mật khẩu mới + nhập lại, có gợi ý độ dài và báo khi chưa khớp. */
export function PasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
  serverError,
  label = t('cms.password.new'),
}: {
  password: string;
  confirm: string;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
  serverError?: string;
  label?: string;
}) {
  const tooShort = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <>
      <TextField
        id="new-password"
        label={label}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => onPassword(e.target.value)}
        error={tooShort || Boolean(serverError)}
        helperText={serverError ?? t('cms.password.hint', { min: PASSWORD_MIN_LENGTH })}
        required
        fullWidth
      />
      <TextField
        id="confirm-password"
        label={t('cms.password.confirm')}
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => onConfirm(e.target.value)}
        error={mismatch}
        helperText={mismatch ? t('cms.password.mismatch') : ' '}
        required
        fullWidth
      />
    </>
  );
}

export const passwordReady = (password: string, confirm: string) =>
  password.length >= PASSWORD_MIN_LENGTH && password === confirm;
