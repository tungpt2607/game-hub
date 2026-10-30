import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createMiddleware } from 'hono/factory';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import {
  type ApiError,
  type DatabaseStatus,
  ErrorCode,
  type HealthResponse,
  HealthResponseSchema,
} from '@opes/contracts';
import { pingDb } from '@opes/db';
import type { AppDeps, AppEnv } from './context';
import { getDb } from './db';
import { AppError } from './lib/errors';
import { createS3Storage, s3ConfigFromEnv, type Storage } from './lib/storage';
import { authRoutes } from './routes/auth';
import { mediaRoutes } from './routes/media';
import { templateRoutes } from './routes/templates';
import { userRoutes } from './routes/users';

export type { AppDeps } from './context';

export const API_VERSION = '0.4.0';

let storageCache: Storage | null | undefined;

const defaultDeps: AppDeps = {
  getDb,
  ping: pingDb,
  getStorage: () => {
    if (storageCache === undefined) {
      const config = s3ConfigFromEnv();
      storageCache = config ? createS3Storage(config) : null;
    }
    return storageCache;
  },
  sessionSecret: () => {
    const secret = process.env.SESSION_SECRET;
    if (secret && secret.length >= 32) return secret;
    if (process.env.NODE_ENV !== 'production') return 'chi-dung-khi-phat-trien-tren-may-ca-nhan';
    throw new AppError(
      503,
      'SESSION_SECRET_NOT_CONFIGURED',
      'Máy chủ chưa cấu hình SESSION_SECRET (tối thiểu 32 ký tự).',
    );
  },
  secureCookies: () =>
    process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  now: () => new Date(),
};

/** Tạo ứng dụng API. Mọi đường dẫn nằm dưới /api. */
export function createApp(overrides: Partial<AppDeps> = {}) {
  const deps: AppDeps = { ...defaultDeps, ...overrides };
  const app = new Hono<AppEnv>().basePath('/api');

  app.get('/health', async (c) => {
    const db = deps.getDb();
    let database: DatabaseStatus = 'not_configured';
    if (db) database = (await deps.ping(db)) ? 'ok' : 'down';

    const body: HealthResponse = HealthResponseSchema.parse({
      status: database === 'down' ? 'degraded' : 'ok',
      service: 'api',
      version: API_VERSION,
      time: new Date().toISOString(),
      database,
    });
    return c.json(body, database === 'down' ? 503 : 200);
  });

  /** Mọi đường dẫn quản trị cần cơ sở dữ liệu. */
  const withDb = createMiddleware<AppEnv>(async (c, next) => {
    const db = deps.getDb();
    if (!db) {
      throw new AppError(503, ErrorCode.DB_NOT_CONFIGURED, 'Máy chủ chưa kết nối cơ sở dữ liệu.');
    }
    c.set('db', db);
    c.header('Cache-Control', 'no-store');
    await next();
  });
  app.use('/admin/*', withDb);

  app.route('/admin/auth', authRoutes(deps));
  app.route('/admin/users', userRoutes(deps));
  app.route('/admin/media', mediaRoutes(deps));
  app.route('/admin/templates', templateRoutes(deps));

  app.notFound((c) => {
    const body: ApiError = {
      error: { code: ErrorCode.NOT_FOUND, message: 'Không tìm thấy đường dẫn.' },
    };
    return c.json(body, 404);
  });

  app.onError((err, c) => {
    if (err instanceof AppError) {
      const body: ApiError = { error: { code: err.code, message: err.message, ...err.extra } };
      return c.json(body, err.status);
    }
    if (err instanceof HTTPException) {
      const body: ApiError = { error: { code: 'HTTP_ERROR', message: err.message } };
      return c.json(body, err.status as ContentfulStatusCode);
    }
    console.error(err);
    const body: ApiError = {
      error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' },
    };
    return c.json(body, 500);
  });

  return app;
}
