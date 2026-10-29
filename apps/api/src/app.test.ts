import { describe, expect, it } from 'vitest';
import { ApiErrorSchema, HealthResponseSchema } from '@opes/contracts';
import { API_VERSION, createApp } from './app';

describe('API', () => {
  const app = createApp();

  it('GET /api/health trả về trạng thái hoạt động', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = HealthResponseSchema.parse(await res.json());
    expect(body.version).toBe(API_VERSION);
  });

  it('đường dẫn không tồn tại trả về lỗi 404 đúng dạng', async () => {
    const res = await app.request('/api/khong-co');
    expect(res.status).toBe(404);
    const body = ApiErrorSchema.parse(await res.json());
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('chỉ phục vụ dưới /api', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(404);
  });
});
