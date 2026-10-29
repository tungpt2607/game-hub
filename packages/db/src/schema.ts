/**
 * Lược đồ dữ liệu giai đoạn 1 (xem docs/03-du-lieu.md).
 * Sửa file này rồi để CI (hoặc `pnpm db:generate`) sinh file migration trong ../migrations.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

// ---------- Tài khoản CMS ----------

/** Giai đoạn 1 chỉ dùng `admin`; các vai trò khác có sẵn cho giai đoạn 2. */
export const userRole = pgEnum('user_role', ['admin', 'operator', 'redeemer', 'viewer']);
export const userStatus = pgEnum('user_status', ['active', 'disabled']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Luôn lưu chữ thường. */
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /** Băm bằng Argon2id. */
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('admin'),
  status: userStatus('status').notNull().default('active'),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  failedLoginCount: integer('failed_login_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Chỉ lưu bản băm của mã phiên; mã gốc nằm trong cookie. */
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [index('admin_sessions_user_id_idx').on(t.userId)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    data: jsonb('data').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_logs_created_at_idx').on(t.createdAt),
    index('audit_logs_entity_idx').on(t.entity, t.entityId),
  ],
);

// ---------- Media ----------

export const mediaKind = pgEnum('media_kind', ['image', 'audio']);

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Đường dẫn trong kho S3. */
  storageKey: text('storage_key').notNull().unique(),
  kind: mediaKind('kind').notNull(),
  mime: text('mime').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  durationMs: integer('duration_ms'),
  originalName: text('original_name'),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

// ---------- Template ----------

export const templates = pgTable(
  'templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    /** Ví dụ "game.catch". */
    moduleKey: text('module_key').notNull(),
    moduleVersion: text('module_version').notNull(),
    /** Đã kiểm tra theo lược đồ của module trước khi lưu. */
    config: jsonb('config').$type<Record<string, unknown>>().notNull(),
    /** Tăng mỗi lần lưu; link chơi thử "luôn mới nhất" luôn đọc bản mới nhất. */
    revision: integer('revision').notNull().default(1),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [index('templates_module_key_idx').on(t.moduleKey)],
);

// ---------- Link chơi thử ----------

export const previewLinkMode = pgEnum('preview_link_mode', ['live', 'snapshot']);

export interface PreviewSnapshot {
  moduleKey: string;
  moduleVersion: string;
  templateRevision: number;
  config: Record<string, unknown>;
}

export const previewLinks = pgTable(
  'preview_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 22 ký tự ngẫu nhiên trong địa chỉ /try/<token>. */
    token: text('token').notNull().unique(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    label: text('label'),
    mode: previewLinkMode('mode').notNull(),
    snapshot: jsonb('snapshot').$type<PreviewSnapshot>(),
    /** [GĐ2] Hồ sơ nhãn hàng áp giao diện; giai đoạn 1 luôn để trống. */
    brandId: uuid('brand_id'),
    passwordHash: text('password_hash'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    viewCount: integer('view_count').notNull().default(0),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('preview_links_template_id_idx').on(t.templateId)],
);

// ---------- Giới hạn truy cập ----------

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
