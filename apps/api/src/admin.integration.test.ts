/* eslint-disable @typescript-eslint/no-explicit-any -- dữ liệu JSON trả về trong kiểm thử */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, runMigrations, schema, type Database } from '@opes/db';
import { createApp } from './app';
import type { Storage } from './lib/storage';

/**
 * Kiểm thử API quản trị với PostgreSQL thật (TEST_DATABASE_URL). GitHub Actions luôn có biến này.
 */
const url = process.env.TEST_DATABASE_URL;

it.runIf(process.env.CI)('CI có cấu hình TEST_DATABASE_URL', () => {
  expect(url).toBeTruthy();
});

/** Kho media giả, lưu trong bộ nhớ. */
function fakeStorage() {
  const files = new Map<string, { size: number; contentType: string }>();
  const storage: Storage = {
    async presignPut(key, contentType) {
      return { url: `https://kho.example/${key}?sig=1`, headers: { 'Content-Type': contentType } };
    },
    async head(key) {
      return files.get(key) ?? null;
    },
    async delete(key) {
      files.delete(key);
    },
    publicUrl: (key) => `https://media.example/${key}`,
  };
  return { storage, files };
}

describe.skipIf(!url)('API quản trị (PostgreSQL thật)', () => {
  let db: Database;
  let close: () => Promise<void>;
  let clock = new Date('2026-11-01T03:00:00Z');
  const { storage, files } = fakeStorage();
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await runMigrations(url!);
    ({ db, close } = createDb(url!));
    app = createApp({
      getDb: () => db,
      getStorage: () => storage,
      sessionSecret: () => 'khoa-kiem-thu-dai-hon-ba-muoi-hai-ky-tu',
      secureCookies: () => false,
      now: () => clock,
    });
  });

  beforeEach(async () => {
    clock = new Date('2026-11-01T03:00:00Z');
    files.clear();
    await db.execute(
      sql`truncate table ${schema.rateLimits}, ${schema.previewLinks}, ${schema.templates}, ${schema.media}, ${schema.auditLogs}, ${schema.adminSessions}, ${schema.users} cascade`,
    );
  });

  afterAll(async () => {
    await close?.();
  });

  /** Gửi yêu cầu JSON, kèm cookie nếu có. */
  async function call(method: string, path: string, body?: unknown, cookie?: string) {
    const headers: Record<string, string> = { 'x-forwarded-for': '203.0.113.7' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = cookie;
    const res = await app.request(`/api/admin${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const setCookie = res.headers.get('set-cookie');
    return {
      status: res.status,
      json: (text ? JSON.parse(text) : null) as Record<string, any>,
      cookie: setCookie?.split(';')[0],
    };
  }

  async function setupAdmin() {
    const res = await call('POST', '/auth/setup', {
      name: 'Quản trị 1',
      email: 'Admin@Opes.vn',
      password: 'mat-khau-dai-du',
    });
    expect(res.status).toBe(201);
    return res.cookie!;
  }

  describe('thiết lập lần đầu', () => {
    it('chỉ chạy được khi chưa có tài khoản, sau đó tự khóa', async () => {
      expect((await call('GET', '/auth/setup-status')).json).toEqual({ needsSetup: true });
      const cookie = await setupAdmin();
      expect(cookie).toMatch(/^opes_session=/);
      expect((await call('GET', '/auth/setup-status')).json).toEqual({ needsSetup: false });

      const again = await call('POST', '/auth/setup', {
        name: 'Người lạ',
        email: 'la@example.com',
        password: 'mat-khau-dai-du',
      });
      expect(again.status).toBe(409);
      expect(again.json.error.code).toBe('SETUP_ALREADY_DONE');
    });

    it('hai yêu cầu thiết lập đồng thời chỉ một cái thành công', async () => {
      const body = (n: number) => ({ name: `A${n}`, email: `a${n}@opes.vn`, password: 'mat-khau-dai-du' });
      const results = await Promise.all([call('POST', '/auth/setup', body(1)), call('POST', '/auth/setup', body(2))]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    });

    it('từ chối mật khẩu ngắn hơn 10 ký tự', async () => {
      const res = await call('POST', '/auth/setup', { name: 'A', email: 'a@opes.vn', password: 'ngan' });
      expect(res.status).toBe(400);
      expect(res.json.error.fields.password).toBeTruthy();
    });
  });

  describe('đăng nhập và phiên', () => {
    it('đăng nhập đúng thì vào được; email không phân biệt hoa thường', async () => {
      await setupAdmin();
      const login = await call('POST', '/auth/login', { email: 'ADMIN@opes.vn', password: 'mat-khau-dai-du' });
      expect(login.status).toBe(200);
      expect(login.json.user.email).toBe('admin@opes.vn');
      const me = await call('GET', '/auth/me', undefined, login.cookie);
      expect(me.status).toBe(200);
      expect(me.json.user.name).toBe('Quản trị 1');
    });

    it('chưa đăng nhập thì bị từ chối', async () => {
      await setupAdmin();
      expect((await call('GET', '/auth/me')).status).toBe(401);
      expect((await call('GET', '/users')).status).toBe(401);
    });

    it('sai 5 lần thì khóa 15 phút, kể cả khi nhập đúng; hết 15 phút thì mở', async () => {
      await setupAdmin();
      for (let i = 0; i < 4; i++) {
        const res = await call('POST', '/auth/login', { email: 'admin@opes.vn', password: 'sai-mat-khau' });
        expect(res.status).toBe(401);
      }
      const fifth = await call('POST', '/auth/login', { email: 'admin@opes.vn', password: 'sai-mat-khau' });
      expect(fifth.status).toBe(423);
      const correct = await call('POST', '/auth/login', { email: 'admin@opes.vn', password: 'mat-khau-dai-du' });
      expect(correct.status).toBe(423);

      clock = new Date(clock.getTime() + 16 * 60 * 1000);
      const later = await call('POST', '/auth/login', { email: 'admin@opes.vn', password: 'mat-khau-dai-du' });
      expect(later.status).toBe(200);
    });

    it('email không tồn tại trả về cùng thông báo với sai mật khẩu', async () => {
      await setupAdmin();
      const res = await call('POST', '/auth/login', { email: 'khong-co@opes.vn', password: 'bat-ky-gi-do' });
      expect(res.status).toBe(401);
      expect(res.json.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('phiên hết hạn sau 7 ngày không dùng, và tự gia hạn khi được dùng', async () => {
      const cookie = await setupAdmin();
      clock = new Date(clock.getTime() + 6 * 24 * 3600 * 1000);
      expect((await call('GET', '/auth/me', undefined, cookie)).status).toBe(200);
      // 6 ngày sau lần dùng trước (tổng 12 ngày từ lúc đăng nhập) vẫn còn hiệu lực nhờ gia hạn.
      clock = new Date(clock.getTime() + 6 * 24 * 3600 * 1000);
      expect((await call('GET', '/auth/me', undefined, cookie)).status).toBe(200);
      clock = new Date(clock.getTime() + 8 * 24 * 3600 * 1000);
      expect((await call('GET', '/auth/me', undefined, cookie)).status).toBe(401);
    });

    it('đăng xuất thì phiên không dùng được nữa', async () => {
      const cookie = await setupAdmin();
      expect((await call('POST', '/auth/logout', undefined, cookie)).status).toBe(204);
      expect((await call('GET', '/auth/me', undefined, cookie)).status).toBe(401);
    });
  });

  describe('tài khoản', () => {
    it('tạo tài khoản: có mật khẩu tạm, buộc đổi mật khẩu, đổi xong mới dùng được', async () => {
      const admin = await setupAdmin();
      const created = await call('POST', '/users', { name: 'Lan', email: 'lan@opes.vn' }, admin);
      expect(created.status).toBe(201);
      const temp = created.json.temporaryPassword as string;
      expect(temp).toMatch(/^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}$/);

      const login = await call('POST', '/auth/login', { email: 'lan@opes.vn', password: temp });
      expect(login.json.user.mustChangePassword).toBe(true);
      const blocked = await call('GET', '/users', undefined, login.cookie);
      expect(blocked.status).toBe(403);
      expect(blocked.json.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

      const changed = await call(
        'POST',
        '/auth/password',
        { currentPassword: temp, newPassword: 'mat-khau-moi-cua-lan' },
        login.cookie,
      );
      expect(changed.status).toBe(200);
      expect((await call('GET', '/users', undefined, login.cookie)).status).toBe(200);
    });

    it('email trùng thì báo lỗi rõ ràng', async () => {
      const admin = await setupAdmin();
      const dup = await call('POST', '/users', { name: 'Trùng', email: 'admin@opes.vn' }, admin);
      expect(dup.status).toBe(409);
      expect(dup.json.error.code).toBe('EMAIL_TAKEN');
    });

    it('không vô hiệu hóa được quản trị viên cuối cùng', async () => {
      const admin = await setupAdmin();
      const me = await call('GET', '/auth/me', undefined, admin);
      const res = await call('PATCH', `/users/${me.json.user.id}`, { status: 'disabled' }, admin);
      expect(res.status).toBe(409);
      expect(res.json.error.code).toBe('LAST_ACTIVE_ADMIN');
    });

    it('vô hiệu hóa tài khoản thì đăng xuất người đó và chặn đăng nhập', async () => {
      const admin = await setupAdmin();
      const created = await call('POST', '/users', { name: 'Minh', email: 'minh@opes.vn' }, admin);
      const login = await call('POST', '/auth/login', {
        email: 'minh@opes.vn',
        password: created.json.temporaryPassword,
      });
      const disabled = await call('PATCH', `/users/${created.json.user.id}`, { status: 'disabled' }, admin);
      expect(disabled.status).toBe(200);
      expect((await call('GET', '/auth/me', undefined, login.cookie)).status).toBe(401);
      const again = await call('POST', '/auth/login', {
        email: 'minh@opes.vn',
        password: created.json.temporaryPassword,
      });
      expect(again.status).toBe(403);
    });

    it('đặt lại mật khẩu: mật khẩu cũ hết tác dụng, mật khẩu tạm dùng được', async () => {
      const admin = await setupAdmin();
      const created = await call('POST', '/users', { name: 'Hoa', email: 'hoa@opes.vn' }, admin);
      const reset = await call('POST', `/users/${created.json.user.id}/reset-password`, undefined, admin);
      expect(reset.status).toBe(200);
      const oldLogin = await call('POST', '/auth/login', {
        email: 'hoa@opes.vn',
        password: created.json.temporaryPassword,
      });
      expect(oldLogin.status).toBe(401);
      const newLogin = await call('POST', '/auth/login', {
        email: 'hoa@opes.vn',
        password: reset.json.temporaryPassword,
      });
      expect(newLogin.status).toBe(200);
    });
  });

  describe('media', () => {
    async function upload(cookie: string, name: string, mime: string, size: number) {
      const signed = await call('POST', '/media/upload-url', { fileName: name, mime, sizeBytes: size }, cookie);
      expect(signed.status).toBe(200);
      files.set(signed.json.storageKey, { size, contentType: mime });
      return call(
        'POST',
        '/media/complete',
        { storageKey: signed.json.storageKey, fileName: name, mime, sizeBytes: size, width: 400, height: 300 },
        cookie,
      );
    }

    it('tải lên, liệt kê, lọc và tìm kiếm', async () => {
      const admin = await setupAdmin();
      expect((await upload(admin, 'sen.png', 'image/png', 1000)).status).toBe(201);
      expect((await upload(admin, 'nhac-nen.mp3', 'audio/mpeg', 2000)).status).toBe(201);

      const all = await call('GET', '/media', undefined, admin);
      expect(all.json.items).toHaveLength(2);
      expect(all.json.items[0].url).toMatch(/^https:\/\/media\.example\/media\//);

      const images = await call('GET', '/media?kind=image', undefined, admin);
      expect(images.json.items.map((i: { originalName: string }) => i.originalName)).toEqual(['sen.png']);
      const search = await call('GET', `/media?q=${encodeURIComponent('nhạc')}`, undefined, admin);
      expect(search.json.items).toHaveLength(0);
      const search2 = await call('GET', '/media?q=nhac', undefined, admin);
      expect(search2.json.items).toHaveLength(1);
    });

    it('từ chối loại file lạ, file quá lớn, và file chưa thật sự tải lên', async () => {
      const admin = await setupAdmin();
      const exe = await call('POST', '/media/upload-url', { fileName: 'x.exe', mime: 'application/x-msdownload', sizeBytes: 10 }, admin);
      expect(exe.json.error.code).toBe('MEDIA_TYPE_NOT_ALLOWED');
      const big = await call('POST', '/media/upload-url', { fileName: 'to.png', mime: 'image/png', sizeBytes: 6 * 1024 * 1024 }, admin);
      expect(big.json.error.code).toBe('MEDIA_TOO_LARGE');

      const signed = await call('POST', '/media/upload-url', { fileName: 'a.png', mime: 'image/png', sizeBytes: 100 }, admin);
      const notUploaded = await call(
        'POST',
        '/media/complete',
        { storageKey: signed.json.storageKey, fileName: 'a.png', mime: 'image/png', sizeBytes: 100 },
        admin,
      );
      expect(notUploaded.json.error.code).toBe('MEDIA_NOT_UPLOADED');
    });

    it('chặn xóa file đang được template dùng; file không ai dùng thì xóa được', async () => {
      const admin = await setupAdmin();
      const used = await upload(admin, 'gio.png', 'image/png', 500);
      const free = await upload(admin, 'thua.png', 'image/png', 500);
      await db.insert(schema.templates).values({
        name: 'Hứng Sen',
        moduleKey: 'game.catch',
        moduleVersion: '1.0.0',
        config: { basket: { image: used.json.item.id } },
      });

      const blocked = await call('DELETE', `/media/${used.json.item.id}`, undefined, admin);
      expect(blocked.status).toBe(409);
      expect(blocked.json.error.details.templates[0].name).toBe('Hứng Sen');

      const ok = await call('DELETE', `/media/${free.json.item.id}`, undefined, admin);
      expect(ok.status).toBe(204);
      expect(files.size).toBe(1);
    });
  });
});
