import { and, asc, count, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  compareVersions,
  ErrorCode,
  GAME_CODE_EXTENSIONS,
  GAME_LIMITS,
  GAME_PATH,
  GameAssetUploadRequestSchema,
  type GameAssetUploadResponse,
  GameCreateRequestSchema,
  GameDraftSaveRequestSchema,
  type GameHostResponse,
  type GameModuleDetail,
  type GameModuleListResponse,
  GamePublishRequestSchema,
  type GameVersionDetail,
  MEDIA_RULES,
  mediaKindOf,
  SEMVER,
} from '@opes/contracts';
import { schema, type Database, type GameAssets, type GameModuleMeta } from '@opes/db';
import { requireAuth, requireRole } from '../auth/session';
import type { AppDeps, AppEnv } from '../context';
import { audit } from '../lib/audit';
import { AppError, parseInput, readJson } from '../lib/errors';
import { sandbox } from '../lib/module-sandbox';
import { ensureBuiltinModules } from '../lib/modules';
import type { Storage } from '../lib/storage';

type ModuleRow = typeof schema.gameModules.$inferSelect;

const KEY_FORMAT = /^(game|leaderboard|reward)\.[a-z][a-z0-9-]{0,47}$/;

const invalid = (message: string, details?: unknown) =>
  new AppError(422, ErrorCode.MODULE_INVALID, message, details === undefined ? undefined : { details });

const extOf = (path: string) => (path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toLowerCase() : '');

/** Kiểm tra mã nguồn: đường dẫn, loại file, dung lượng; bắt buộc có schema.ts và index.ts. */
function checkFiles(files: Record<string, string>) {
  const paths = Object.keys(files);
  if (paths.length > GAME_LIMITS.maxFiles) throw invalid(`Tối đa ${GAME_LIMITS.maxFiles} file code.`);
  let total = 0;
  for (const path of paths) {
    if (!GAME_PATH.test(path)) {
      throw invalid(`Tên file "${path}" không hợp lệ (chỉ dùng chữ không dấu, số, - _ . /; không có dấu cách).`);
    }
    if (path.startsWith('assets/')) throw invalid(`File "${path}" thuộc thư mục assets/ phải tải lên dạng file kèm.`);
    if (!GAME_CODE_EXTENSIONS.includes(extOf(path))) {
      throw invalid(`File "${path}": chỉ nhận ${GAME_CODE_EXTENSIONS.map((e) => '.' + e).join(', ')} ngoài thư mục assets/.`);
    }
    const size = Buffer.byteLength(files[path]!, 'utf8');
    if (size > GAME_LIMITS.maxFileBytes) throw invalid(`File "${path}" quá lớn (tối đa ${GAME_LIMITS.maxFileBytes / 1024}KB).`);
    total += size;
  }
  if (total > GAME_LIMITS.maxTotalCodeBytes) throw invalid('Tổng dung lượng code quá lớn (tối đa 2MB).');
  for (const required of ['schema', 'index']) {
    if (!['ts', 'tsx', 'js'].some((ext) => files[`${required}.${ext}`] !== undefined)) {
      throw invalid(`Thiếu file ${required}.ts.`);
    }
  }
}

/** Đường dẫn trên kho của một file kèm: theo nội dung (sha256), nên file giống nhau chỉ lưu một lần. */
const assetStorageKey = (moduleKey: string, sha256: string, ext: string) => `game-assets/${moduleKey}/${sha256}.${ext}`;

function assetExt(path: string, mime: string): string {
  const kind = mediaKindOf(mime);
  if (!kind) {
    throw invalid(`File kèm "${path}": loại file không được hỗ trợ (ảnh PNG/JPG/WebP/GIF/SVG, âm thanh MP3/M4A/OGG/WAV, font).`);
  }
  return MEDIA_RULES[kind].mimes[mime]!;
}

/** Kiểm tra danh sách file kèm; địa chỉ phải là file của chính game này trên kho. Trả về bản chuẩn hóa. */
function checkAssets(moduleKey: string, assets: GameAssets, storage: Storage | null): GameAssets {
  const paths = Object.keys(assets);
  if (paths.length > GAME_LIMITS.maxAssets) throw invalid(`Tối đa ${GAME_LIMITS.maxAssets} file kèm.`);
  if (paths.length > 0 && !storage) {
    throw new AppError(503, ErrorCode.STORAGE_NOT_CONFIGURED, 'Kho media chưa được cấu hình nên chưa lưu được file kèm.');
  }
  let total = 0;
  const out: GameAssets = {};
  for (const path of paths) {
    const a = assets[path]!;
    if (!GAME_PATH.test(path)) {
      throw invalid(`Tên file kèm "${path}" không hợp lệ (chỉ dùng chữ không dấu, số, - _ . /; không có dấu cách).`);
    }
    const ext = assetExt(path, a.mime);
    const rule = MEDIA_RULES[mediaKindOf(a.mime)!];
    if (a.size > Math.min(rule.maxBytes, GAME_LIMITS.maxAssetBytes)) {
      throw invalid(`File kèm "${path}" quá lớn (tối đa ${Math.min(rule.maxBytes, GAME_LIMITS.maxAssetBytes) / 1024 / 1024}MB).`);
    }
    total += a.size;
    // Địa chỉ luôn tính lại từ nội dung file (CMS có thể gửi dạng /media/... khi bật MEDIA_PROXY).
    const url = storage!.publicUrl(assetStorageKey(moduleKey, a.sha256, ext));
    out[path] = { url, size: a.size, mime: a.mime, sha256: a.sha256 };
  }
  if (total > GAME_LIMITS.maxTotalAssetBytes) throw invalid('Tổng dung lượng file kèm quá lớn (tối đa 60MB).');
  return out;
}

/** Đọc mô tả game trong hộp cách ly; kiểm tra key và loại. */
async function readMeta(schemaJs: string, expectedKey?: string): Promise<GameModuleMeta> {
  const meta = await sandbox.meta(schemaJs);
  if (!meta || typeof meta.key !== 'string' || !KEY_FORMAT.test(meta.key) || !meta.key.startsWith(`${meta.kind}.`)) {
    throw invalid('key trong schema.ts cần có dạng "game.ten-game" (chữ thường, số, dấu -), khớp với kind.');
  }
  if (expectedKey && meta.key !== expectedKey) {
    throw invalid(`key trong schema.ts phải giữ là "${expectedKey}" (đang là "${meta.key}"). Muốn làm game khác thì tải lên dạng game mới.`);
  }
  if (typeof meta.name !== 'string' || !meta.name.trim()) throw invalid('Thiếu name (tên game) trong schema.ts.');
  if (typeof meta.version !== 'string' || !SEMVER.test(meta.version)) {
    throw invalid('version trong schema.ts cần có dạng 1.0.0.');
  }
  if (!Array.isArray(meta.screens) || meta.screens.length === 0) throw invalid('Cần ít nhất một màn hình trong screens.');
  return meta;
}

/** Trước khi phát hành: cấu hình mặc định và mọi mẫu phải hợp lệ theo chính game. */
async function checkConfigs(schemaJs: string, meta: GameModuleMeta) {
  const problems: string[] = [];
  const defaults = await sandbox.validate(schemaJs, meta.defaults);
  for (const [path, msg] of Object.entries(defaults)) problems.push(`Cấu hình mặc định › ${path}: ${msg}`);
  for (const preset of meta.presets ?? []) {
    const errors = await sandbox.validate(schemaJs, preset.config);
    for (const [path, msg] of Object.entries(errors)) problems.push(`Mẫu "${preset.name}" › ${path}: ${msg}`);
  }
  if (problems.length) {
    throw invalid(`Còn ${problems.length} lỗi trong cấu hình mặc định hoặc mẫu: ${problems.slice(0, 5).join('; ')}`, { problems });
  }
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

/** /admin/modules: game lưu trong cơ sở dữ liệu; sửa code, bản nháp, phát hành (Bước 7c). */
export function moduleRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  app.use('*', requireAuth(deps), requireRole('admin'));

  async function findModule(db: Database, key: string): Promise<ModuleRow> {
    await ensureBuiltinModules(db);
    const [row] = KEY_FORMAT.test(key)
      ? await db.select().from(schema.gameModules).where(eq(schema.gameModules.key, key)).limit(1)
      : [];
    if (!row) throw new AppError(404, ErrorCode.MODULE_NOT_FOUND, 'Không tìm thấy game.');
    return row;
  }

  async function detail(db: Database, row: ModuleRow): Promise<GameModuleDetail> {
    const versions = await db
      .select({
        version: schema.gameModuleVersions.version,
        notes: schema.gameModuleVersions.notes,
        publishedAt: schema.gameModuleVersions.publishedAt,
        publishedByName: schema.users.name,
      })
      .from(schema.gameModuleVersions)
      .leftJoin(schema.users, eq(schema.users.id, schema.gameModuleVersions.publishedBy))
      .where(eq(schema.gameModuleVersions.moduleKey, row.key))
      .orderBy(desc(schema.gameModuleVersions.publishedAt));
    const [templates] = await db
      .select({ n: count() })
      .from(schema.templates)
      .where(eq(schema.templates.moduleKey, row.key));
    let updatedByName: string | null = null;
    if (row.draftUpdatedBy) {
      const [u] = await db.select({ name: schema.users.name }).from(schema.users).where(eq(schema.users.id, row.draftUpdatedBy));
      updatedByName = u?.name ?? null;
    }
    return {
      key: row.key,
      kind: row.kind,
      name: row.name,
      description: row.description,
      builtin: row.builtin,
      latestVersion: row.latestVersion,
      versions: versions.map((v) => ({
        version: v.version,
        notes: v.notes,
        publishedAt: v.publishedAt.toISOString(),
        publishedByName: v.publishedByName ?? null,
      })),
      templateCount: templates?.n ?? 0,
      draft:
        row.draftFiles && row.draftUpdatedAt
          ? {
              files: row.draftFiles,
              assets: row.draftAssets ?? {},
              version: row.draftMeta?.version ?? null,
              updatedAt: row.draftUpdatedAt.toISOString(),
              updatedByName,
            }
          : null,
    };
  }

  app.get('/', async (c) => {
    const db = c.get('db');
    await ensureBuiltinModules(db);
    const modules = await db.select().from(schema.gameModules).orderBy(asc(schema.gameModules.createdAt), asc(schema.gameModules.key));
    const versions = await db
      .select({
        moduleKey: schema.gameModuleVersions.moduleKey,
        version: schema.gameModuleVersions.version,
        publishedAt: schema.gameModuleVersions.publishedAt,
        notes: schema.gameModuleVersions.notes,
        meta: schema.gameModuleVersions.meta,
      })
      .from(schema.gameModuleVersions)
      .orderBy(desc(schema.gameModuleVersions.publishedAt));
    const body: GameModuleListResponse = {
      items: modules.map((m) => {
        const own = versions.filter((v) => v.moduleKey === m.key);
        const latest = own.find((v) => v.version === m.latestVersion);
        return {
          key: m.key,
          kind: m.kind,
          name: m.name,
          description: m.description,
          latestVersion: m.latestVersion,
          builtin: m.builtin,
          versions: own.map((v) => ({ version: v.version, publishedAt: v.publishedAt.toISOString(), notes: v.notes })),
          defaults: latest?.meta.defaults ?? {},
          presets: (latest?.meta.presets ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            config: p.config,
          })),
          hasDraft: m.draftFiles !== null && m.draftUpdatedAt !== null,
          draftUpdatedAt: iso(m.draftUpdatedAt),
          updatedAt: m.updatedAt.toISOString(),
        };
      }),
    };
    return c.json(body);
  });

  /** Khung chạy game nằm trên tên miền trang chơi (code game không chạy trên tên miền CMS). */
  app.get('/host', (c) => {
    const body: GameHostResponse = { url: `${deps.playPublicUrl()}/embed` };
    return c.json(body);
  });

  /** Tạo game mới từ gói tải lên; key lấy từ schema.ts. Game mới chỉ có bản nháp cho tới khi phát hành. */
  app.post('/', async (c) => {
    const db = c.get('db');
    const input = parseInput(GameCreateRequestSchema, await readJson(c.req));
    checkFiles(input.files);
    const meta = await readMeta(input.schemaJs);
    const assets = checkAssets(meta.key, input.assets, deps.getStorage());
    await ensureBuiltinModules(db);
    const user = c.get('user');
    const now = deps.now();
    const [row] = await db
      .insert(schema.gameModules)
      .values({
        key: meta.key,
        kind: meta.kind,
        name: meta.name,
        description: meta.description ?? '',
        draftFiles: input.files,
        draftAssets: assets,
        draftSchemaJs: input.schemaJs,
        draftRuntimeJs: input.runtimeJs,
        draftMeta: meta,
        draftUpdatedAt: now,
        draftUpdatedBy: user.id,
      })
      .onConflictDoNothing({ target: schema.gameModules.key })
      .returning();
    if (!row) {
      throw new AppError(409, ErrorCode.MODULE_EXISTS, `Đã có game "${meta.key}". Mở game đó để tải bản mới lên, hoặc đổi key trong schema.ts.`);
    }
    await audit(db, { userId: user.id, action: 'module.create', entity: 'module', entityId: row.key, data: { name: row.name } });
    return c.json({ module: await detail(db, row) }, 201);
  });

  app.get('/:key', async (c) => {
    const db = c.get('db');
    return c.json({ module: await detail(db, await findModule(db, c.req.param('key'))) });
  });

  /** Mã nguồn và file kèm của một phiên bản đã phát hành (để tải về hoặc lấy làm bản nháp). */
  app.get('/:key/versions/:version', async (c) => {
    const db = c.get('db');
    const row = await findModule(db, c.req.param('key'));
    const [v] = await db
      .select({
        version: schema.gameModuleVersions.version,
        notes: schema.gameModuleVersions.notes,
        publishedAt: schema.gameModuleVersions.publishedAt,
        files: schema.gameModuleVersions.files,
        assets: schema.gameModuleVersions.assets,
        publishedByName: schema.users.name,
      })
      .from(schema.gameModuleVersions)
      .leftJoin(schema.users, eq(schema.users.id, schema.gameModuleVersions.publishedBy))
      .where(and(eq(schema.gameModuleVersions.moduleKey, row.key), eq(schema.gameModuleVersions.version, c.req.param('version'))))
      .limit(1);
    if (!v) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy phiên bản này.');
    const body: GameVersionDetail = {
      version: v.version,
      notes: v.notes,
      publishedAt: v.publishedAt.toISOString(),
      publishedByName: v.publishedByName ?? null,
      files: v.files,
      assets: v.assets,
    };
    return c.json(body);
  });

  /** Xin link tải một file kèm lên kho (trình duyệt tải thẳng lên, không qua API). */
  app.post('/:key/assets/upload-url', async (c) => {
    const key = c.req.param('key');
    if (!KEY_FORMAT.test(key)) throw invalid('key của game không hợp lệ.');
    const input = parseInput(GameAssetUploadRequestSchema, await readJson(c.req));
    const storage = deps.getStorage();
    if (!storage) {
      throw new AppError(503, ErrorCode.STORAGE_NOT_CONFIGURED, 'Kho media chưa được cấu hình. Xem hướng dẫn trong docs/huong-dan/r2.md.');
    }
    // Kiểm tra như khi lưu nháp (tên, loại, dung lượng).
    checkAssets(key, { [input.path]: { url: '', ...input } }, storage);
    const storageKey = assetStorageKey(key, input.sha256, assetExt(input.path, input.mime));
    const signed = await storage.presignPut(storageKey, input.mime);
    const body: GameAssetUploadResponse = { uploadUrl: signed.url, headers: signed.headers, url: storage.publicUrl(storageKey) };
    return c.json(body);
  });

  /** Lưu bản nháp (được lưu cả khi còn lỗi biên dịch). */
  app.put('/:key/draft', async (c) => {
    const db = c.get('db');
    const input = parseInput(GameDraftSaveRequestSchema, await readJson(c.req));
    const row = await findModule(db, c.req.param('key'));
    if (iso(row.draftUpdatedAt) !== input.baseUpdatedAt) throw conflict();
    checkFiles(input.files);
    const assets = checkAssets(row.key, input.assets, deps.getStorage());
    const compiled = input.schemaJs !== null && input.runtimeJs !== null;
    const meta = compiled ? await readMeta(input.schemaJs!, row.key) : null;
    const user = c.get('user');
    const [saved] = await db
      .update(schema.gameModules)
      .set({
        draftFiles: input.files,
        draftAssets: assets,
        draftSchemaJs: compiled ? input.schemaJs : null,
        draftRuntimeJs: compiled ? input.runtimeJs : null,
        draftMeta: meta,
        draftUpdatedAt: deps.now(),
        draftUpdatedBy: user.id,
        updatedAt: deps.now(),
      })
      .where(eq(schema.gameModules.key, row.key))
      .returning();
    return c.json({ module: await detail(db, saved!) });
  });

  /** Bỏ bản nháp (quay về bản phát hành mới nhất). Game chưa phát hành lần nào thì không bỏ được. */
  app.delete('/:key/draft', async (c) => {
    const db = c.get('db');
    const row = await findModule(db, c.req.param('key'));
    if (!row.latestVersion) throw invalid('Game chưa phát hành lần nào nên không bỏ bản nháp được.');
    const [saved] = await db
      .update(schema.gameModules)
      .set({
        draftFiles: null,
        draftAssets: null,
        draftSchemaJs: null,
        draftRuntimeJs: null,
        draftMeta: null,
        draftUpdatedAt: null,
        draftUpdatedBy: null,
      })
      .where(eq(schema.gameModules.key, row.key))
      .returning();
    return c.json({ module: await detail(db, saved!) });
  });

  /**
   * Phát hành bản nháp thành phiên bản mới (quyết định 138): phiên bản lấy từ `version` trong schema.ts,
   * phải lớn hơn bản mới nhất. Template mới dùng bản này; template cũ giữ bản cũ tới khi "Nâng lên bản mới".
   */
  app.post('/:key/publish', async (c) => {
    const db = c.get('db');
    const input = parseInput(GamePublishRequestSchema, await readJson(c.req));
    const row = await findModule(db, c.req.param('key'));
    if (iso(row.draftUpdatedAt) !== input.baseUpdatedAt) throw conflict();
    if (!row.draftFiles || !row.draftUpdatedAt) throw invalid('Không có bản nháp để phát hành.');
    if (!row.draftSchemaJs || !row.draftRuntimeJs) throw invalid('Bản nháp còn lỗi biên dịch. Sửa lỗi rồi lưu lại trước khi phát hành.');
    const meta = await readMeta(row.draftSchemaJs, row.key);
    if (row.latestVersion && compareVersions(meta.version, row.latestVersion) <= 0) {
      throw invalid(`Phiên bản ${meta.version} không lớn hơn bản mới nhất ${row.latestVersion}. Tăng version trong schema.ts (ví dụ lên ${bump(row.latestVersion)}).`);
    }
    await checkConfigs(row.draftSchemaJs, meta);
    const user = c.get('user');
    const now = deps.now();
    const published = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(schema.gameModules).where(eq(schema.gameModules.key, row.key)).for('update');
      if (!locked || iso(locked.draftUpdatedAt) !== input.baseUpdatedAt) throw conflict();
      const inserted = await tx
        .insert(schema.gameModuleVersions)
        .values({
          moduleKey: row.key,
          version: meta.version,
          files: row.draftFiles!,
          assets: row.draftAssets ?? {},
          schemaJs: row.draftSchemaJs!,
          runtimeJs: row.draftRuntimeJs!,
          meta,
          notes: input.notes || null,
          publishedBy: user.id,
          publishedAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: schema.gameModuleVersions.id });
      if (inserted.length === 0) throw invalid(`Đã có phiên bản ${meta.version}. Tăng version trong schema.ts.`);
      const [saved] = await tx
        .update(schema.gameModules)
        .set({
          kind: meta.kind,
          name: meta.name,
          description: meta.description ?? '',
          latestVersion: meta.version,
          draftFiles: null,
          draftAssets: null,
          draftSchemaJs: null,
          draftRuntimeJs: null,
          draftMeta: null,
          draftUpdatedAt: null,
          draftUpdatedBy: null,
          updatedAt: now,
        })
        .where(eq(schema.gameModules.key, row.key))
        .returning();
      return saved!;
    });
    await audit(db, {
      userId: user.id,
      action: 'module.publish',
      entity: 'module',
      entityId: row.key,
      data: { name: meta.name, version: meta.version },
    });
    return c.json({ module: await detail(db, published) });
  });

  return app;
}

const conflict = () =>
  new AppError(
    409,
    ErrorCode.MODULE_CONFLICT,
    'Bản nháp vừa được lưu ở nơi khác (có thể bởi đồng nghiệp hoặc ở thẻ khác). Tải lại để xem bản mới nhất.',
  );

/** Gợi ý phiên bản tiếp theo: 1.2.3 → 1.2.4. */
function bump(version: string): string {
  const m = SEMVER.exec(version);
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : '1.0.0';
}
