import { describe, expect, it } from 'vitest';
import { ApiErrorSchema, HealthResponseSchema } from '@opes/contracts';
import type { Database } from '@opes/db';
import { API_VERSION, createApp } from './app';

const fakeDb = {} as Database;

async function health(app: ReturnType<typeof createApp>) {
  const res = await app.request('/api/health');
  return { res, body: HealthResponseSchema.parse(await res.json()) };
}

describe('GET /api/health', () => {
  it('chưa cấu hình cơ sở dữ liệu: vẫn hoạt động, báo not_configured', async () => {
    const { res, body } = await health(createApp({ getDb: () => null }));
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', database: 'not_configured', version: API_VERSION });
  });

  it('cơ sở dữ liệu kết nối được: báo ok', async () => {
    const { res, body } = await health(
      createApp({ getDb: () => fakeDb, ping: async () => true }),
    );
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('cơ sở dữ liệu lỗi: báo degraded với mã 503', async () => {
    const { res, body } = await health(
      createApp({ getDb: () => fakeDb, ping: async () => false }),
    );
    expect(res.status).toBe(503);
    expect(body).toMatchObject({ status: 'degraded', database: 'down' });
  });
});

describe('đường dẫn khác', () => {
  const app = createApp({ getDb: () => null });

  it('không tồn tại thì trả về lỗi 404 đúng dạng', async () => {
    const res = await app.request('/api/khong-co');
    expect(res.status).toBe(404);
    expect(ApiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND');
  });

  it('chỉ phục vụ dưới /api', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(404);
  });
});
