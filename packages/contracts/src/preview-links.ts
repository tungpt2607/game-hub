import { z } from 'zod';

export const PreviewLinkModeSchema = z.enum(['live', 'snapshot']);
export type PreviewLinkMode = z.infer<typeof PreviewLinkModeSchema>;

/** Mã tự đặt: chữ thường không dấu, số, gạch ngang; 4–60 ký tự. */
export const PREVIEW_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{2,58})[a-z0-9]$/;

export const PreviewLinkSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  label: z.string().nullable(),
  token: z.string(),
  /** Địa chỉ đầy đủ để gửi đi. */
  url: z.string(),
  mode: PreviewLinkModeSchema,
  /** Với bản chụp: chụp từ lần công bố nào (null = chụp từ bản nháp). */
  snapshotVersion: z.number().int().nullable(),
  hasPassword: z.boolean(),
  expiresAt: z.string().nullable(),
  disabled: z.boolean(),
  viewCount: z.number().int(),
  lastViewedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PreviewLink = z.infer<typeof PreviewLinkSchema>;

export const PreviewLinkListResponseSchema = z.object({ items: z.array(PreviewLinkSchema) });
export type PreviewLinkListResponse = z.infer<typeof PreviewLinkListResponseSchema>;

const label = z
  .string()
  .trim()
  .max(120)
  .nullish()
  .transform((v) => (v ? v : null));
const password = z.string().min(4, 'Mật khẩu tối thiểu 4 ký tự').max(100);
const expiresAt = z.string().datetime({ offset: true }).nullish();

export const PreviewLinkCreateRequestSchema = z.object({
  label,
  mode: PreviewLinkModeSchema,
  /** Với bản chụp: chụp từ bản đã công bố hay bản nháp hiện tại (quyết định 77). */
  snapshotSource: z.enum(['published', 'draft']).optional(),
  /** Để trống = mã ngẫu nhiên. */
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(PREVIEW_SLUG_PATTERN, 'Mã link chỉ gồm chữ thường không dấu, số và dấu gạch ngang (4–60 ký tự)')
    .nullish(),
  password: password.nullish(),
  expiresAt,
});
export type PreviewLinkCreateRequest = z.input<typeof PreviewLinkCreateRequestSchema>;

export const PreviewLinkUpdateRequestSchema = z.object({
  label: label.optional(),
  /** Chuỗi = đặt mật khẩu mới; null = bỏ mật khẩu; không gửi = giữ nguyên. */
  password: password.nullable().optional(),
  expiresAt,
  disabled: z.boolean().optional(),
});
export type PreviewLinkUpdateRequest = z.input<typeof PreviewLinkUpdateRequestSchema>;

/** Trang chơi thử gọi: GET /api/public/try/:token */
export const TryResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    moduleKey: z.string(),
    moduleVersion: z.string(),
    title: z.string(),
    config: z.record(z.unknown()),
  }),
  z.object({ status: z.literal('password_required'), title: z.string() }),
  z.object({
    status: z.enum(['not_found', 'disabled', 'expired', 'not_published']),
  }),
]);
export type TryResponse = z.infer<typeof TryResponseSchema>;

export const TryUnlockRequestSchema = z.object({ password: z.string().min(1).max(100) });
