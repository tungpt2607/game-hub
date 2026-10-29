import { Hono } from 'hono';
import {
  type ApiError,
  type DatabaseStatus,
  type HealthResponse,
  HealthResponseSchema,
} from '@opes/contracts';
import { pingDb, type Database } from '@opes/db';
import { getDb } from './db';

export const API_VERSION = '0.2.0';

export interface AppDeps {
  /** Lấy kết nối cơ sở dữ liệu; null khi chưa cấu hình. Kiểm thử truyền hàm giả vào đây. */
  getDb: () => Database | null;
  /** Kiểm tra kết nối; mặc định chạy `select 1`. */
  ping: (db: Database) => Promise<boolean>;
}

const defaultDeps: AppDeps = { getDb, ping: pingDb };

/** Tạo ứng dụng API. Mọi đường dẫn nằm dưới /api. */
export function createApp(deps: Partial<AppDeps> = {}) {
  const { getDb: resolveDb, ping } = { ...defaultDeps, ...deps };
  const app = new Hono().basePath('/api');

  app.get('/health', async (c) => {
    const db = resolveDb();
    let database: DatabaseStatus = 'not_configured';
    if (db) database = (await ping(db)) ? 'ok' : 'down';

    const body: HealthResponse = HealthResponseSchema.parse({
      status: database === 'down' ? 'degraded' : 'ok',
      service: 'api',
      version: API_VERSION,
      time: new Date().toISOString(),
      database,
    });
    return c.json(body, database === 'down' ? 503 : 200);
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
