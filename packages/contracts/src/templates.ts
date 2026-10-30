import { z } from 'zod';

const configSchema = z.record(z.unknown());
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const TemplateStatusSchema = z.enum(['active', 'archived']);
export type TemplateStatus = z.infer<typeof TemplateStatusSchema>;

export const TemplateSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  brandName: z.string().nullable(),
  note: z.string().nullable(),
  moduleKey: z.string(),
  moduleName: z.string(),
  status: TemplateStatusSchema,
  /** Số lần đã công bố; 0 = chưa công bố. */
  publishedVersion: z.number().int(),
  publishedAt: z.string().nullable(),
  /** Bản nháp có thay đổi chưa công bố. */
  hasUnpublishedChanges: z.boolean(),
  updatedAt: z.string(),
  /** Cấu hình bản nháp, để CMS vẽ ảnh nhỏ. */
  config: configSchema,
});
export type TemplateSummary = z.infer<typeof TemplateSummarySchema>;

export const TemplateListResponseSchema = z.object({ items: z.array(TemplateSummarySchema) });
export type TemplateListResponse = z.infer<typeof TemplateListResponseSchema>;

export const TemplateVersionInfoSchema = z.object({
  version: z.number().int(),
  moduleVersion: z.string(),
  publishedAt: z.string(),
  publishedByName: z.string().nullable(),
});
export type TemplateVersionInfo = z.infer<typeof TemplateVersionInfoSchema>;

export const TemplateDetailSchema = TemplateSummarySchema.extend({
  /** Phiên bản game bản nháp đang dùng (bản nháp và lần công bố tiếp theo chạy bằng bản này). */
  moduleVersion: z.string(),
  /** Phiên bản game mới nhất; khác moduleVersion thì có thể "Nâng lên bản mới". */
  latestModuleVersion: z.string().nullable(),
  revision: z.number().int(),
  publishedConfig: configSchema.nullable(),
  /** Lỗi của bản nháp theo đường dẫn trường; rỗng = công bố được. */
  errors: z.record(z.string()),
  versions: z.array(TemplateVersionInfoSchema),
});
export type TemplateDetail = z.infer<typeof TemplateDetailSchema>;

export const TemplateSourceSchema = z.discriminatedUnion('type', [
  /** Cấu hình mặc định của module. */
  z.object({ type: z.literal('defaults') }),
  /** Một mẫu có sẵn của module. */
  z.object({ type: z.literal('preset'), presetId: z.string() }),
  /** Cấu hình gửi lên, ví dụ từ Phòng thử module. */
  z.object({ type: z.literal('config'), config: configSchema }),
  /** Nhân bản bản nháp của template khác. */
  z.object({ type: z.literal('duplicate'), templateId: z.string().uuid() }),
]);
export type TemplateSource = z.infer<typeof TemplateSourceSchema>;

export const TemplateCreateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên template').max(120),
  brandName: nullableText(120),
  note: nullableText(1000),
  moduleKey: z.string().optional(),
  source: TemplateSourceSchema,
});
export type TemplateCreateRequest = z.input<typeof TemplateCreateRequestSchema>;

export const TemplateSaveRequestSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên template').max(120),
  brandName: nullableText(120),
  note: nullableText(1000),
  config: configSchema,
  /** Revision của bản nháp lúc mở; khác revision hiện tại nghĩa là đã có người lưu chen. */
  baseRevision: z.number().int(),
});
export type TemplateSaveRequest = z.input<typeof TemplateSaveRequestSchema>;

export const TemplatePublishRequestSchema = z.object({ baseRevision: z.number().int() });
export type TemplatePublishRequest = z.infer<typeof TemplatePublishRequestSchema>;

export const TemplateVersionResponseSchema = TemplateVersionInfoSchema.extend({ config: configSchema });
export type TemplateVersionResponse = z.infer<typeof TemplateVersionResponseSchema>;
