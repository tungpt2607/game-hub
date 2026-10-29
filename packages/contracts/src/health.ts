import { z } from 'zod';

/** Trạng thái kết nối cơ sở dữ liệu: chưa cấu hình, hoạt động, hoặc không kết nối được. */
export const DatabaseStatusSchema = z.enum(['not_configured', 'ok', 'down']);
export type DatabaseStatus = z.infer<typeof DatabaseStatusSchema>;

/**
 * Kết quả của GET /api/health.
 * `status` là "ok" khi mọi thành phần đã cấu hình đều hoạt động, "degraded" khi có thành phần lỗi.
 */
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('api'),
  version: z.string(),
  time: z.string().datetime(),
  database: DatabaseStatusSchema,
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
