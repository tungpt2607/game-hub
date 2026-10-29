import { z } from 'zod';

/** Dạng lỗi chung của API: `code` cố định để giao diện xử lý, `message` là câu tiếng Việt hiển thị được. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
