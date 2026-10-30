import { randomUUID } from 'node:crypto';
import { and, desc, eq, ilike, lt, or, type SQL, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import {
  ErrorCode,
  MEDIA_RULES,
  MediaCompleteRequestSchema,
  type MediaItem,
  MediaKindSchema,
  type MediaListResponse,
  type MediaUploadResponse,
  MediaUploadRequestSchema,
  mediaKindOf,
} from '@opes/contracts';
import { schema } from '@opes/db';
import { requireAuth, requireRole } from '../auth/session';
import type { AppDeps, AppEnv } from '../context';
import { audit } from '../lib/audit';
import { AppError, parseInput, readJson } from '../lib/errors';
import type { Storage } from '../lib/storage';

const PAGE_SIZE = 40;
const KEY_PATTERN = /^media\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]+$/;

type MediaRow = typeof schema.media.$inferSelect;

const KIND_LABEL = { image: 'Ảnh', audio: 'Âm thanh', font: 'Font' } as const;

/** Kiểm tra loại và dung lượng file; trả về loại media và phần mở rộng. */
function checkFile(mime: string, sizeBytes: number) {
  const kind = mediaKindOf(mime);
  if (!kind) {
    throw new AppError(
      400,
      ErrorCode.MEDIA_TYPE,
      'Loại file không được hỗ trợ. Ảnh: PNG, JPG, WebP, GIF, SVG. Âm thanh: MP3, M4A, OGG, WAV. Font: WOFF2, WOFF, TTF, OTF.',
    );
  }
  const rule = MEDIA_RULES[kind];
  if (sizeBytes > rule.maxBytes) {
    const mb = rule.maxBytes / 1024 / 1024;
    throw new AppError(
      400,
      ErrorCode.MEDIA_TOO_LARGE,
      `${KIND_LABEL[kind]} tối đa ${mb}MB.`,
    );
  }
  return { kind, ext: rule.mimes[mime]! };
}

function toItem(row: MediaRow, storage: Storage): MediaItem {
  return {
    id: row.id,
    kind: row.kind,
    mime: row.mime,
    url: storage.publicUrl(row.storageKey),
    originalName: row.originalName,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Mã trang sau: thời điểm tạo + id của phần tử cuối, để phân trang ổn định. */
const encodeCursor = (row: MediaRow) =>
  Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const createdAt = iso ? new Date(iso) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}

export function mediaRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  app.use('*', requireAuth(deps), requireRole('admin'));

  const storage = (): Storage => {
    const s = deps.getStorage();
    if (!s) {
      throw new AppError(
        503,
        ErrorCode.STORAGE_NOT_CONFIGURED,
        'Kho media chưa được cấu hình. Xem hướng dẫn trong docs/huong-dan/r2.md.',
      );
    }
    return s;
  };

  app.get('/', async (c) => {
    const db = c.get('db');
    const filters: SQL[] = [];
    const kind = c.req.query('kind');
    if (kind) {
      const parsed = MediaKindSchema.safeParse(kind);
      if (!parsed.success) throw new AppError(400, ErrorCode.VALIDATION, 'Loại media không hợp lệ.');
      filters.push(eq(schema.media.kind, parsed.data));
    }
    const q = c.req.query('q')?.trim();
    if (q) filters.push(ilike(schema.media.originalName, `%${q.replace(/[%_\\]/g, '\\$&')}%`));
    const cursor = c.req.query('cursor');
    const after = cursor ? decodeCursor(cursor) : null;
    if (after) {
      filters.push(
        or(
          lt(schema.media.createdAt, after.createdAt),
          and(eq(schema.media.createdAt, after.createdAt), lt(schema.media.id, after.id)),
        )!,
      );
    }
    const rows = await db
      .select()
      .from(schema.media)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(schema.media.createdAt), desc(schema.media.id))
      .limit(PAGE_SIZE + 1);
    const page = rows.slice(0, PAGE_SIZE);
    const s = storage();
    const body: MediaListResponse = {
      items: page.map((row) => toItem(row, s)),
      nextCursor: rows.length > PAGE_SIZE ? encodeCursor(page[page.length - 1]!) : null,
    };
    return c.json(body);
  });

  /** Bước 1 của tải lên: kiểm tra file và cấp link ký trước để trình duyệt PUT thẳng lên kho. */
  app.post('/upload-url', async (c) => {
    const input = parseInput(MediaUploadRequestSchema, await readJson(c.req));
    const { ext } = checkFile(input.mime, input.sizeBytes);
    const now = deps.now();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const storageKey = `media/${now.getUTCFullYear()}/${month}/${randomUUID()}.${ext}`;
    const signed = await storage().presignPut(storageKey, input.mime);
    const body: MediaUploadResponse = { storageKey, uploadUrl: signed.url, headers: signed.headers };
    return c.json(body);
  });

  /** Bước 2: trình duyệt đã tải xong; API kiểm tra file thật trên kho rồi mới ghi vào thư viện. */
  app.post('/complete', async (c) => {
    const input = parseInput(MediaCompleteRequestSchema, await readJson(c.req));
    if (!KEY_PATTERN.test(input.storageKey)) {
      throw new AppError(400, ErrorCode.VALIDATION, 'Đường dẫn file không hợp lệ.');
    }
    const { kind } = checkFile(input.mime, input.sizeBytes);
    const s = storage();
    const stored = await s.head(input.storageKey);
    if (!stored) {
      throw new AppError(400, ErrorCode.MEDIA_NOT_UPLOADED, 'Chưa thấy file trên kho media. Vui lòng tải lại.');
    }
    if (stored.size !== input.sizeBytes) {
      await s.delete(input.storageKey);
      throw new AppError(400, ErrorCode.MEDIA_NOT_UPLOADED, 'File tải lên không khớp. Vui lòng tải lại.');
    }
    checkFile(stored.contentType?.split(';')[0]?.trim() || input.mime, stored.size);

    const db = c.get('db');
    const [row] = await db
      .insert(schema.media)
      .values({
        storageKey: input.storageKey,
        kind,
        mime: input.mime,
        sizeBytes: stored.size,
        width: kind === 'image' ? (input.width ?? null) : null,
        height: kind === 'image' ? (input.height ?? null) : null,
        durationMs: kind === 'audio' ? (input.durationMs ?? null) : null,
        originalName: input.fileName,
        uploadedBy: c.get('user').id,
      })
      .onConflictDoNothing({ target: schema.media.storageKey })
      .returning();
    const saved =
      row ??
      (await db.select().from(schema.media).where(eq(schema.media.storageKey, input.storageKey)).limit(1))[0]!;
    return c.json({ item: toItem(saved, s) }, row ? 201 : 200);
  });

  /** Xóa file; bị chặn nếu đang được template dùng. */
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.get('db');
    const [row] = /^[0-9a-f-]{36}$/i.test(id)
      ? await db.select().from(schema.media).where(eq(schema.media.id, id)).limit(1)
      : [];
    if (!row) throw new AppError(404, ErrorCode.NOT_FOUND, 'Không tìm thấy file.');

    // Cấu hình template lưu id của media; tìm id này trong bản nháp, bản công bố và lịch sử công bố.
    const pattern = `%${row.id}%`;
    const usedBy = await db
      .select({ id: schema.templates.id, name: schema.templates.name })
      .from(schema.templates)
      .where(
        sql`(${schema.templates.config}::text like ${pattern}
          or coalesce(${schema.templates.publishedConfig}::text, '') like ${pattern}
          or exists (select 1 from ${schema.templateVersions}
            where ${schema.templateVersions.templateId} = ${schema.templates.id}
            and ${schema.templateVersions.config}::text like ${pattern}))`,
      );
    if (usedBy.length > 0) {
      throw new AppError(
        409,
        ErrorCode.MEDIA_IN_USE,
        `File đang được dùng trong ${usedBy.length} template nên không thể xóa.`,
        { details: { templates: usedBy } },
      );
    }

    await storage().delete(row.storageKey);
    await db.delete(schema.media).where(eq(schema.media.id, row.id));
    await audit(db, {
      userId: c.get('user').id,
      action: 'media.delete',
      entity: 'media',
      entityId: row.id,
      data: { name: row.originalName },
    });
    return c.body(null, 204);
  });

  return app;
}
