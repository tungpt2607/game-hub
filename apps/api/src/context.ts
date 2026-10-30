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
  /** Địa chỉ trang chơi, để tạo link chơi thử đầy đủ. */
  playPublicUrl: () => string;
  /**
   * CMS và trang chơi có chuyển tiếp /media/* tới kho media không. Bật thì API trả đường dẫn media
   * dạng "/media/..." (cùng tên miền với trang đang mở), tránh mạng chặn tên miền của kho (ví dụ r2.dev).
   */
  mediaProxy: () => boolean;
}

export type AppEnv = {
  Variables: {
    db: Database;
    user: AuthUser;
  };
};
