import { Hono } from 'hono';
import { type ApiError, type HealthResponse, HealthResponseSchema } from '@opes/contracts';

export const API_VERSION = '0.1.0';

/** Tạo ứng dụng API. Mọi đường dẫn nằm dưới /api. */
export function createApp() {
  const app = new Hono().basePath('/api');

  app.get('/health', (c) => {
    const body: HealthResponse = HealthResponseSchema.parse({
      status: 'ok',
      service: 'api',
      version: API_VERSION,
      time: new Date().toISOString(),
    });
    return c.json(body);
  });

  app.notFound((c) => {
    const body: ApiError = {
      error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn.' },
    };
    return c.json(body, 404);
  });

  app.onError((err, c) => {
    console.error(err);
    const body: ApiError = {
      error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' },
    };
    return c.json(body, 500);
  });

  return app;
}
