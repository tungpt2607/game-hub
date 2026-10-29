import { z } from 'zod';

/** Kết quả của GET /api/health. Các bước sau sẽ thêm trạng thái cơ sở dữ liệu và kho media. */
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('api'),
  version: z.string(),
  time: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
