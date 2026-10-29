import { z } from 'zod';

/**
 * Dạng lỗi chung của API: `code` cố định để giao diện xử lý, `message` là câu tiếng Việt hiển thị được.
 * `fields` (lỗi theo từng ô nhập) và `details` (dữ liệu thêm) là tùy chọn.
 */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string()).optional(),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Các mã lỗi giao diện cần xử lý riêng. */
export const ErrorCode = {
  VALIDATION: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  RATE_LIMITED: 'RATE_LIMITED',
  SETUP_DONE: 'SETUP_ALREADY_DONE',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  LAST_ADMIN: 'LAST_ACTIVE_ADMIN',
  NOT_FOUND: 'NOT_FOUND',
  MEDIA_NOT_UPLOADED: 'MEDIA_NOT_UPLOADED',
  MEDIA_IN_USE: 'MEDIA_IN_USE',
  MEDIA_TYPE: 'MEDIA_TYPE_NOT_ALLOWED',
  MEDIA_TOO_LARGE: 'MEDIA_TOO_LARGE',
  STORAGE_NOT_CONFIGURED: 'STORAGE_NOT_CONFIGURED',
  DB_NOT_CONFIGURED: 'DATABASE_NOT_CONFIGURED',
} as const;
