/* eslint-disable @typescript-eslint/no-explicit-any -- dữ liệu JSON trả về trong kiểm thử */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb, runMigrations, schema, type Database } from '@opes/db';
import { createApp } from './app';
import { resetModuleRegistry } from './lib/modules';
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
      sql`truncate table ${schema.rateLimits}, ${schema.previewLinks}, ${schema.templates}, ${schema.gameModuleVersions}, ${schema.gameModules}, ${schema.media}, ${schema.auditLogs}, ${schema.adminSessions}, ${schema.users} cascade`,
    );
    resetModuleRegistry();
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

  describe('thư viện template', () => {
    async function create(cookie: string, body: Record<string, unknown>) {
      return call('POST', '/templates', body, cookie);
    }

    it('tạo từ mặc định, mẫu có sẵn, cấu hình gửi lên và nhân bản', async () => {
      const admin = await setupAdmin();
      const a = await create(admin, { name: 'Mặc định', moduleKey: 'game.catch', source: { type: 'defaults' } });
      expect(a.status).toBe(201);
      expect(a.json.template.moduleName).toBe('Hứng quà');
      expect(a.json.template.publishedVersion).toBe(0);
      expect(a.json.template.hasUnpublishedChanges).toBe(true);
      expect(a.json.template.errors).toEqual({});

      const tet = await create(admin, {
        name: 'Tết Sen',
        brandName: 'Sữa Sen',
        moduleKey: 'game.catch',
        source: { type: 'preset', presetId: 'tet' },
      });
      expect(tet.json.template.config.content.title).toBe('Hứng lộc đầu xuân');

      // Cấu hình thiếu trường được điền từ mặc định, khóa thừa bị bỏ.
      const partial = await create(admin, {
        name: 'Từ phòng thử',
        moduleKey: 'game.catch',
        source: { type: 'config', config: { content: { title: 'Thử' }, khongCo: 1 } },
      });
      expect(partial.json.template.config.content.title).toBe('Thử');
      expect(partial.json.template.config.rules.lives).toBe(3);
      expect(partial.json.template.config).not.toHaveProperty('khongCo');

      const copy = await create(admin, { name: 'Bản sao', source: { type: 'duplicate', templateId: tet.json.template.id } });
      expect(copy.json.template.config.content.title).toBe('Hứng lộc đầu xuân');
      expect(copy.json.template.moduleKey).toBe('game.catch');

      const bad = await create(admin, { name: 'X', moduleKey: 'game.khong-co', source: { type: 'defaults' } });
      expect(bad.json.error.code).toBe('MODULE_NOT_FOUND');

      const list = await call('GET', '/templates?q=sen', undefined, admin);
      expect(list.json.items.map((i: any) => i.name).sort()).toEqual(['Tết Sen']);
    });

    it('lưu nháp được cả khi còn lỗi, nhưng công bố bị chặn cho tới khi sửa xong', async () => {
      const admin = await setupAdmin();
      const t = (await create(admin, { name: 'Game', moduleKey: 'game.catch', source: { type: 'defaults' } })).json.template;
      const broken = structuredClone(t.config);
      broken.content.title = '';
      const saved = await call(
        'PUT',
        `/templates/${t.id}`,
        { name: 'Game', config: broken, baseRevision: t.revision },
        admin,
      );
      expect(saved.status).toBe(200);
      expect(saved.json.template.errors['content.title']).toBe('Không được để trống');

      const blocked = await call('POST', `/templates/${t.id}/publish`, { baseRevision: saved.json.template.revision }, admin);
      expect(blocked.status).toBe(422);
      expect(blocked.json.error.fields['content.title']).toBeTruthy();

      broken.content.title = 'Đã sửa';
      const fixed = await call(
        'PUT',
        `/templates/${t.id}`,
        { name: 'Game', config: broken, baseRevision: saved.json.template.revision },
        admin,
      );
      const published = await call('POST', `/templates/${t.id}/publish`, { baseRevision: fixed.json.template.revision }, admin);
      expect(published.status).toBe(200);
      expect(published.json.template.publishedVersion).toBe(1);
      expect(published.json.template.hasUnpublishedChanges).toBe(false);
      expect(published.json.template.publishedConfig.content.title).toBe('Đã sửa');
      expect(published.json.template.versions[0].publishedByName).toBe('Quản trị 1');
    });

    it('lưu nháp không đổi bản đã công bố; khôi phục lịch sử vào bản nháp', async () => {
      const admin = await setupAdmin();
      const t = (await create(admin, { name: 'Game', moduleKey: 'game.catch', source: { type: 'defaults' } })).json.template;
      const v1 = (await call('POST', `/templates/${t.id}/publish`, { baseRevision: t.revision }, admin)).json.template;

      const draft = structuredClone(v1.config);
      draft.content.title = 'Bản nháp mới';
      const saved = (await call('PUT', `/templates/${t.id}`, { name: 'Game', config: draft, baseRevision: v1.revision }, admin)).json.template;
      expect(saved.hasUnpublishedChanges).toBe(true);
      expect(saved.publishedConfig.content.title).toBe('Hứng quà rinh điểm');

      const v2 = (await call('POST', `/templates/${t.id}/publish`, { baseRevision: saved.revision }, admin)).json.template;
      expect(v2.versions.map((v: any) => v.version)).toEqual([2, 1]);

      const old = await call('GET', `/templates/${t.id}/versions/1`, undefined, admin);
      expect(old.json.config.content.title).toBe('Hứng quà rinh điểm');

      const restored = (await call('POST', `/templates/${t.id}/versions/1/restore`, { baseRevision: v2.revision }, admin)).json.template;
      expect(restored.config.content.title).toBe('Hứng quà rinh điểm');
      expect(restored.publishedConfig.content.title).toBe('Bản nháp mới');
      expect(restored.hasUnpublishedChanges).toBe(true);
    });

    it('hai người cùng sửa: người lưu sau được báo xung đột thay vì ghi đè', async () => {
      const admin = await setupAdmin();
      const t = (await create(admin, { name: 'Game', moduleKey: 'game.catch', source: { type: 'defaults' } })).json.template;
      const first = await call('PUT', `/templates/${t.id}`, { name: 'A', config: t.config, baseRevision: t.revision }, admin);
      expect(first.status).toBe(200);
      const second = await call('PUT', `/templates/${t.id}`, { name: 'B', config: t.config, baseRevision: t.revision }, admin);
      expect(second.status).toBe(409);
      expect(second.json.error.code).toBe('TEMPLATE_CONFLICT');
    });

    it('lưu trữ, khôi phục, và chỉ xóa hẳn được khi đã lưu trữ', async () => {
      const admin = await setupAdmin();
      const t = (await create(admin, { name: 'Game', moduleKey: 'game.catch', source: { type: 'defaults' } })).json.template;
      expect((await call('DELETE', `/templates/${t.id}`, undefined, admin)).json.error.code).toBe('TEMPLATE_NOT_ARCHIVED');

      await call('POST', `/templates/${t.id}/archive`, undefined, admin);
      expect((await call('GET', '/templates', undefined, admin)).json.items).toHaveLength(0);
      expect((await call('GET', '/templates?status=archived', undefined, admin)).json.items).toHaveLength(1);
      const edit = await call('PUT', `/templates/${t.id}`, { name: 'X', config: t.config, baseRevision: t.revision }, admin);
      expect(edit.json.error.code).toBe('TEMPLATE_ARCHIVED');

      await call('POST', `/templates/${t.id}/unarchive`, undefined, admin);
      expect((await call('GET', '/templates', undefined, admin)).json.items).toHaveLength(1);

      await call('POST', `/templates/${t.id}/archive`, undefined, admin);
      expect((await call('DELETE', `/templates/${t.id}`, undefined, admin)).status).toBe(204);
      expect((await call('GET', `/templates/${t.id}`, undefined, admin)).status).toBe(404);
    });
  });

  describe('link chơi thử', () => {
    async function publishedTemplate(cookie: string) {
      const t = (await call('POST', '/templates', { name: 'Tết', moduleKey: 'game.catch', source: { type: 'preset', presetId: 'tet' } }, cookie)).json.template;
      const p = await call('POST', `/templates/${t.id}/publish`, { baseRevision: t.revision }, cookie);
      return p.json.template;
    }
    /** Gọi API công khai của trang chơi. */
    async function play(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
      const headers: Record<string, string> = { 'x-forwarded-for': '198.51.100.9' };
      if (init.body !== undefined) headers['content-type'] = 'application/json';
      if (init.cookie) headers.cookie = init.cookie;
      const res = await app.request(`/api/public${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
      return { status: res.status, json: (await res.json()) as Record<string, any>, cookie: res.headers.get('set-cookie')?.split(';')[0] };
    }

    it('link "luôn mới nhất" đọc bản công bố mới nhất và đếm lượt mở', async () => {
      const admin = await setupAdmin();
      const tpl = await publishedTemplate(admin);
      const created = await call('POST', `/preview-links?templateId=${tpl.id}`, { label: 'Gửi chị Lan', mode: 'live' }, admin);
      expect(created.status).toBe(201);
      const link = created.json.link;
      expect(link.token).toHaveLength(22);
      expect(link.url).toBe(`https://opes-gamehub-play.vercel.app/try/${link.token}`);

      const first = await play(`/try/${link.token}`);
      expect(first.status).toBe(200);
      expect(first.json.status).toBe('ok');
      expect(first.json.moduleKey).toBe('game.catch');
      expect(first.json.title).toBe('Hứng lộc đầu xuân');

      // Sửa nháp: link chưa đổi; công bố: link đổi.
      const detail = (await call('GET', `/templates/${tpl.id}`, undefined, admin)).json.template;
      const draft = structuredClone(detail.config);
      draft.content.title = 'Tiêu đề mới';
      const saved = (await call('PUT', `/templates/${tpl.id}`, { name: 'Tết', config: draft, baseRevision: detail.revision }, admin)).json.template;
      expect((await play(`/try/${link.token}`)).json.title).toBe('Hứng lộc đầu xuân');
      await call('POST', `/templates/${tpl.id}/publish`, { baseRevision: saved.revision }, admin);
      expect((await play(`/try/${link.token}`)).json.title).toBe('Tiêu đề mới');

      const list = await call('GET', `/preview-links?templateId=${tpl.id}`, undefined, admin);
      expect(list.json.items[0].viewCount).toBe(3);
      expect(list.json.items[0].lastViewedAt).toBeTruthy();
    });

    it('bản chụp giữ nguyên khi template đổi; chụp từ nháp được khi nháp không lỗi', async () => {
      const admin = await setupAdmin();
      const tpl = await publishedTemplate(admin);
      const snap = (await call('POST', `/preview-links?templateId=${tpl.id}`, { mode: 'snapshot', snapshotSource: 'published' }, admin)).json.link;
      expect(snap.snapshotVersion).toBe(1);

      const draft = structuredClone(tpl.config);
      draft.content.title = 'Bản nháp';
      const saved = (await call('PUT', `/templates/${tpl.id}`, { name: 'Tết', config: draft, baseRevision: tpl.revision }, admin)).json.template;
      await call('POST', `/templates/${tpl.id}/publish`, { baseRevision: saved.revision }, admin);
      expect((await play(`/try/${snap.token}`)).json.title).toBe('Hứng lộc đầu xuân');

      const fromDraft = (await call('POST', `/preview-links?templateId=${tpl.id}`, { mode: 'snapshot', snapshotSource: 'draft' }, admin)).json.link;
      expect(fromDraft.snapshotVersion).toBeNull();
      expect((await play(`/try/${fromDraft.token}`)).json.title).toBe('Bản nháp');
    });

    it('chưa công bố thì link "luôn mới nhất" báo chưa sẵn sàng', async () => {
      const admin = await setupAdmin();
      const tpl = (await call('POST', '/templates', { name: 'Mới', moduleKey: 'game.catch', source: { type: 'defaults' } }, admin)).json.template;
      const link = (await call('POST', `/preview-links?templateId=${tpl.id}`, { mode: 'live' }, admin)).json.link;
      expect((await play(`/try/${link.token}`)).json.status).toBe('not_published');
      const bad = await call('POST', `/preview-links?templateId=${tpl.id}`, { mode: 'snapshot', snapshotSource: 'published' }, admin);
      expect(bad.status).toBe(400);
    });

    it('mật khẩu: phải nhập đúng mới chơi được; đổi mật khẩu thì phải nhập lại', async () => {
      const admin = await setupAdmin();
      const tpl = await publishedTemplate(admin);
      const link = (await call('POST', `/preview-links?templateId=${tpl.id}`, { mode: 'live', password: 'sen2027' }, admin)).json.link;
      expect(link.hasPassword).toBe(true);

      const locked = await play(`/try/${link.token}`);
      expect(locked.status).toBe(401);
      expect(locked.json).toEqual({ status: 'password_required', title: 'Hứng lộc đầu xuân' });

      const wrong = await play(`/try/${link.token}/unlock`, { method: 'POST', body: { password: 'sai' } });
      expect(wrong.json.error.code).toBe('WRONG_PASSWORD');
      const right = await play(`/try/${link.token}/unlock`, { method: 'POST', body: { password: 'sen2027' } });
      expect(right.status).toBe(200);
      expect((await play(`/try/${link.token}`, { cookie: right.cookie })).json.status).toBe('ok');

      await call('PATCH', `/preview-links/${link.id}`, { password: 'mat-khau-moi' }, admin);
      expect((await play(`/try/${link.token}`, { cookie: right.cookie })).json.status).toBe('password_required');
    });

    it('tắt, hết hạn, lưu trữ template, mã tự đặt và mã không tồn tại', async () => {
      const admin = await setupAdmin();
      const tpl = await publishedTemplate(admin);
      const custom = await call('POST', `/preview-links?templateId=${tpl.id}`, { mode: 'live', slug: 'Tet-2027-Sen' }, admin);
      expect(custom.json.link.token).toBe('tet-2027-sen');
      const dup = await call('POST', `/preview-links?templateId=${tpl.id}`, { mode: 'live', slug: 'tet-2027-sen' }, admin);
      expect(dup.json.error.code).toBe('SLUG_TAKEN');
      const reserved = await call('POST', `/preview-links?templateId=${tpl.id}`, { mode: 'live', slug: 'media' }, admin);
      expect(reserved.json.error.code).toBe('SLUG_TAKEN'); // trùng đường dẫn có sẵn của trang chơi

      const link = custom.json.link;
      await call('PATCH', `/preview-links/${link.id}`, { disabled: true }, admin);
      expect((await play(`/try/${link.token}`)).json.status).toBe('disabled');
      await call('PATCH', `/preview-links/${link.id}`, { disabled: false, expiresAt: '2026-10-31T00:00:00Z' }, admin);
      expect((await play(`/try/${link.token}`)).json.status).toBe('expired');
      await call('PATCH', `/preview-links/${link.id}`, { expiresAt: null }, admin);
      expect((await play(`/try/${link.token}`)).json.status).toBe('ok');

      await call('POST', `/templates/${tpl.id}/archive`, undefined, admin);
      expect((await play(`/try/${link.token}`)).json.status).toBe('disabled');

      expect((await play('/try/khong-co-ma-nay')).json.status).toBe('not_found');
    });
  });

  describe('game trong cơ sở dữ liệu', () => {
    it('nạp sẵn các game có trong code, kèm mẫu', async () => {
      const admin = await setupAdmin();
      const res = await call('GET', '/modules', undefined, admin);
      expect(res.status).toBe(200);
      const keys = res.json.items.map((m: any) => m.key);
      expect(keys).toEqual(expect.arrayContaining(['game.catch', 'game.catch-quiz', 'game.sample']));
      const quiz = res.json.items.find((m: any) => m.key === 'game.catch-quiz');
      expect(quiz.builtin).toBe(true);
      expect(quiz.latestVersion).toBe('1.0.0');
      expect(quiz.presets.map((p: any) => p.id)).toContain('ome-catch');
      // Gọi lại không nạp trùng.
      resetModuleRegistry();
      const again = await call('GET', '/modules', undefined, admin);
      expect(again.json.items).toHaveLength(res.json.items.length);
      expect(again.json.items.find((m: any) => m.key === 'game.catch-quiz').versions).toHaveLength(1);
    });

    it('kiểm tra cấu hình chạy trong hộp cách ly, kể cả kiểm tra riêng của game', async () => {
      const admin = await setupAdmin();
      const t = (
        await call('POST', '/templates', { name: 'OME', moduleKey: 'game.catch-quiz', source: { type: 'preset', presetId: 'ome-catch' } }, admin)
      ).json.template;
      expect(t.errors).toEqual({});
      expect(t.config.quiz.questions).toHaveLength(6);
      const broken = structuredClone(t.config);
      broken.quiz.questions[0].answers.forEach((a: any) => (a.correct = true));
      broken.rules.lives = 99;
      const saved = await call('PUT', `/templates/${t.id}`, { name: 'OME', config: broken, baseRevision: t.revision }, admin);
      expect(saved.json.template.errors['quiz.questions.0.answers']).toBe('Đánh dấu đúng một đáp án đúng');
      expect(saved.json.template.errors['rules.lives']).toBe('Tối đa là 10');
    });

    it('trả gói chạy của từng phiên bản cho trang chơi, lưu đệm lâu', async () => {
      await setupAdmin();
      const ok = await app.request('/api/public/modules/game.catch-quiz/1.0.0/runtime.js');
      expect(ok.status).toBe(200);
      expect(ok.headers.get('content-type')).toContain('text/javascript');
      expect(ok.headers.get('cache-control')).toContain('immutable');
      expect(await ok.text()).toContain('require("react")');
      expect((await app.request('/api/public/modules/game.catch-quiz/9.9.9/runtime.js')).status).toBe(404);
      expect((await app.request('/api/public/modules/..%2Fx/1.0.0/runtime.js')).status).toBe(404);
    });

    it('cho CMS biết địa chỉ khung chạy game', async () => {
      const admin = await setupAdmin();
      const res = await call('GET', '/modules/host', undefined, admin);
      expect(res.status).toBe(200);
      expect(res.json.url).toMatch(/\/embed$/);
      expect((await call('GET', '/modules/host')).status).toBe(401);
    });

    it('template giữ phiên bản game cũ cho tới khi "Nâng lên bản mới"', async () => {
      const admin = await setupAdmin();
      const t = (
        await call('POST', '/templates', { name: 'OME', moduleKey: 'game.catch-quiz', source: { type: 'preset', presetId: 'ome-catch' } }, admin)
      ).json.template;
      expect(t.moduleVersion).toBe('1.0.0');
      expect(t.latestModuleVersion).toBe('1.0.0');

      // Phát hành giả một bản mới (Bước 7c sẽ làm việc này từ CMS).
      await db.execute(sql`
        insert into ${schema.gameModuleVersions} (module_key, version, files, schema_js, runtime_js, meta)
        select module_key, '1.1.0', files, schema_js, runtime_js, jsonb_set(meta, '{version}', '"1.1.0"')
        from ${schema.gameModuleVersions} where module_key = 'game.catch-quiz' and version = '1.0.0'`);
      await db.execute(sql`update ${schema.gameModules} set latest_version = '1.1.0' where key = 'game.catch-quiz'`);

      const before = (await call('GET', `/templates/${t.id}`, undefined, admin)).json.template;
      expect(before.moduleVersion).toBe('1.0.0');
      expect(before.latestModuleVersion).toBe('1.1.0');

      const stale = await call('POST', `/templates/${t.id}/upgrade`, { baseRevision: t.revision - 1 }, admin);
      expect(stale.status).toBe(409);
      const up = await call('POST', `/templates/${t.id}/upgrade`, { baseRevision: t.revision }, admin);
      expect(up.status).toBe(200);
      expect(up.json.template.moduleVersion).toBe('1.1.0');
      expect(up.json.template.revision).toBe(t.revision + 1);
      expect(up.json.template.config.quiz.questions).toHaveLength(6);
    });
  });
});
