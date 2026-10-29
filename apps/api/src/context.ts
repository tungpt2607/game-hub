import type { Database } from '@opes/db';
import type { Storage } from './lib/storage';

/** Tài khoản đang đăng nhập, gắn vào request sau khi kiểm tra phiên. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'redeemer' | 'viewer';
  mustChangePassword: boolean;
  sessionId: string;
}

/** Những thứ API phụ thuộc vào; kiểm thử thay bằng bản giả hoặc DB kiểm thử. */
export interface AppDeps {
  getDb: () => Database | null;
  ping: (db: Database) => Promise<boolean>;
  getStorage: () => Storage | null;
  /** Khóa ký phiên. */
  sessionSecret: () => string;
  /** Đặt cờ Secure cho cookie (bắt buộc khi chạy HTTPS). */
  secureCookies: () => boolean;
  now: () => Date;
}

export type AppEnv = {
  Variables: {
    db: Database;
    user: AuthUser;
  };
};
