import { z } from 'zod';

export const GameModuleSummarySchema = z.object({
  key: z.string(),
  kind: z.string(),
  name: z.string(),
  description: z.string(),
  latestVersion: z.string().nullable(),
  builtin: z.boolean(),
  versions: z.array(z.object({ version: z.string(), publishedAt: z.string(), notes: z.string().nullable() })),
  /** Cấu hình mặc định và các mẫu của bản phát hành mới nhất (để tạo template). */
  defaults: z.record(z.unknown()),
  presets: z.array(
    z.object({ id: z.string(), name: z.string(), description: z.string().optional(), config: z.record(z.unknown()) }),
  ),
  /** Có bản nháp code chưa phát hành. */
  hasDraft: z.boolean(),
  draftUpdatedAt: z.string().nullable(),
  updatedAt: z.string(),
});
export type GameModuleSummary = z.infer<typeof GameModuleSummarySchema>;

export const GameModuleListResponseSchema = z.object({ items: z.array(GameModuleSummarySchema) });
export type GameModuleListResponse = z.infer<typeof GameModuleListResponseSchema>;

/** Địa chỉ khung chạy game (trang /embed của trang chơi) để CMS nhúng xem trước. */
export const GameHostResponseSchema = z.object({ url: z.string() });
export type GameHostResponse = z.infer<typeof GameHostResponseSchema>;

// ---------- Sửa code game trong CMS (Bước 7c) ----------

/** Giới hạn gói game. */
export const GAME_LIMITS = {
  maxFiles: 200,
  maxFileBytes: 300 * 1024,
  maxTotalCodeBytes: 2 * 1024 * 1024,
  maxAssets: 300,
  maxAssetBytes: 10 * 1024 * 1024,
  maxTotalAssetBytes: 60 * 1024 * 1024,
} as const;

/** File code được phép (ngoài thư mục assets/). */
export const GAME_CODE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'json', 'md', 'txt'];

/** Đường dẫn file trong gói: chữ, số, - _ . / ; không có "..", không bắt đầu bằng "/". */
export const GAME_PATH = /^(?!\/)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9_\-./]{1,200}$/;

/** Phiên bản dạng semver: 1.2.3 (có thể thêm -beta.1). */
export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

/** So sánh 2 phiên bản semver: <0, 0, >0. Bản có hậu tố (-beta) nhỏ hơn bản không có. */
export function compareVersions(a: string, b: string): number {
  const pa = SEMVER.exec(a);
  const pb = SEMVER.exec(b);
  if (!pa || !pb) return a.localeCompare(b);
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d !== 0) return d;
  }
  const sa = a.includes('-') ? a.slice(a.indexOf('-') + 1) : null;
  const sb = b.includes('-') ? b.slice(b.indexOf('-') + 1) : null;
  if (sa === sb) return 0;
  if (sa === null) return 1;
  if (sb === null) return -1;
  return sa.localeCompare(sb, undefined, { numeric: true });
}

export const GameAssetSchema = z.object({
  url: z.string().min(1).max(1000),
  size: z.number().int().positive(),
  mime: z.string().min(1).max(100),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});
export type GameAsset = z.infer<typeof GameAssetSchema>;

export const GameFilesSchema = z.record(z.string());
export const GameAssetsSchema = z.record(GameAssetSchema);

/** Bản nháp gửi lên: mã nguồn, file kèm, và gói đã biên dịch trong trình duyệt (null nếu còn lỗi biên dịch). */
export const GameDraftSaveRequestSchema = z.object({
  files: GameFilesSchema,
  assets: GameAssetsSchema,
  schemaJs: z.string().nullable(),
  runtimeJs: z.string().nullable(),
  /** Thời điểm lưu nháp lúc mở (null = chưa có nháp); khác hiện tại nghĩa là có người vừa lưu chen. */
  baseUpdatedAt: z.string().nullable(),
});
export type GameDraftSaveRequest = z.infer<typeof GameDraftSaveRequestSchema>;

/** Tạo game mới từ gói tải lên (key lấy từ schema.ts). */
export const GameCreateRequestSchema = z.object({
  files: GameFilesSchema,
  assets: GameAssetsSchema,
  schemaJs: z.string().min(1),
  runtimeJs: z.string().min(1),
});
export type GameCreateRequest = z.infer<typeof GameCreateRequestSchema>;

export const GamePublishRequestSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
  baseUpdatedAt: z.string().nullable(),
});
export type GamePublishRequest = z.infer<typeof GamePublishRequestSchema>;

export const GameAssetUploadRequestSchema = z.object({
  path: z.string(),
  mime: z.string(),
  size: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});
export type GameAssetUploadRequest = z.infer<typeof GameAssetUploadRequestSchema>;

export const GameAssetUploadResponseSchema = z.object({
  uploadUrl: z.string(),
  headers: z.record(z.string()),
  /** Địa chỉ file sau khi tải lên (ghi vào danh sách file kèm của bản nháp). */
  url: z.string(),
});
export type GameAssetUploadResponse = z.infer<typeof GameAssetUploadResponseSchema>;

export const GameVersionInfoSchema = z.object({
  version: z.string(),
  notes: z.string().nullable(),
  publishedAt: z.string(),
  publishedByName: z.string().nullable(),
});
export type GameVersionInfo = z.infer<typeof GameVersionInfoSchema>;

export const GameModuleDetailSchema = z.object({
  key: z.string(),
  kind: z.string(),
  name: z.string(),
  description: z.string(),
  builtin: z.boolean(),
  latestVersion: z.string().nullable(),
  versions: z.array(GameVersionInfoSchema),
  /** Số template đang dùng game này. */
  templateCount: z.number().int(),
  draft: z
    .object({
      files: GameFilesSchema,
      assets: GameAssetsSchema,
      /** Phiên bản ghi trong schema.ts của bản nháp (null nếu chưa biên dịch được). */
      version: z.string().nullable(),
      updatedAt: z.string(),
      updatedByName: z.string().nullable(),
    })
    .nullable(),
});
export type GameModuleDetail = z.infer<typeof GameModuleDetailSchema>;

export const GameVersionDetailSchema = GameVersionInfoSchema.extend({
  files: GameFilesSchema,
  assets: GameAssetsSchema,
});
export type GameVersionDetail = z.infer<typeof GameVersionDetailSchema>;
