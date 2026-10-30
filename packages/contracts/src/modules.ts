import { z } from 'zod';

export const GameModuleSummarySchema = z.object({
  key: z.string(),
  kind: z.string(),
  name: z.string(),
  description: z.string(),
  latestVersion: z.string().nullable(),
  builtin: z.boolean(),
  versions: z.array(z.object({ version: z.string(), publishedAt: z.string(), notes: z.string().nullable() })),
  /** Cấu hình mặc định và các mẫu của bản phát hành mới nhất (để tạo template). */
  defaults: z.record(z.unknown()),
  presets: z.array(
    z.object({ id: z.string(), name: z.string(), description: z.string().optional(), config: z.record(z.unknown()) }),
  ),
  updatedAt: z.string(),
});
export type GameModuleSummary = z.infer<typeof GameModuleSummarySchema>;

export const GameModuleListResponseSchema = z.object({ items: z.array(GameModuleSummarySchema) });
export type GameModuleListResponse = z.infer<typeof GameModuleListResponseSchema>;

/** Địa chỉ khung chạy game (trang /embed của trang chơi) để CMS nhúng xem trước. */
export const GameHostResponseSchema = z.object({ url: z.string() });
export type GameHostResponse = z.infer<typeof GameHostResponseSchema>;
