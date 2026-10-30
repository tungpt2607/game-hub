import { z } from 'zod';

export const MediaKindSchema = z.enum(['image', 'audio', 'font']);
export type MediaKind = z.infer<typeof MediaKindSchema>;

/** Loại file và dung lượng tối đa được phép tải lên. */
export const MEDIA_RULES: Record<MediaKind, { maxBytes: number; mimes: Record<string, string> }> = {
  image: {
    maxBytes: 5 * 1024 * 1024,
    mimes: {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
    },
  },
  audio: {
    maxBytes: 10 * 1024 * 1024,
    mimes: {
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/wave': 'wav',
    },
  },
  font: {
    maxBytes: 2 * 1024 * 1024,
    mimes: {
      'font/woff2': 'woff2',
      'font/woff': 'woff',
      'font/ttf': 'ttf',
      'font/otf': 'otf',
    },
  },
};

/** Trình duyệt thường không biết kiểu MIME của file font; đoán theo phần mở rộng. */
export const FONT_MIME_BY_EXT: Record<string, string> = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

/** Ảnh có cạnh dài hơn mức này được CMS thu nhỏ trước khi tải lên. */
export const IMAGE_MAX_DIMENSION = 2048;

/** Xác định loại media từ kiểu MIME; null nếu không được phép. */
export function mediaKindOf(mime: string): MediaKind | null {
  for (const kind of MediaKindSchema.options) {
    if (mime in MEDIA_RULES[kind].mimes) return kind;
  }
  return null;
}

const dimension = z.number().int().positive().max(20000).nullable().optional();

export const MediaUploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mime: z.string(),
  sizeBytes: z.number().int().positive(),
});
export type MediaUploadRequest = z.infer<typeof MediaUploadRequestSchema>;

export const MediaUploadResponseSchema = z.object({
  storageKey: z.string(),
  uploadUrl: z.string().url(),
  /** Tiêu đề phải gửi kèm khi PUT file lên uploadUrl. */
  headers: z.record(z.string()),
});
export type MediaUploadResponse = z.infer<typeof MediaUploadResponseSchema>;

export const MediaCompleteRequestSchema = z.object({
  storageKey: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  mime: z.string(),
  sizeBytes: z.number().int().positive(),
  width: dimension,
  height: dimension,
  durationMs: z.number().int().nonnegative().max(24 * 3600 * 1000).nullable().optional(),
});
export type MediaCompleteRequest = z.infer<typeof MediaCompleteRequestSchema>;

export const MediaItemSchema = z.object({
  id: z.string().uuid(),
  kind: MediaKindSchema,
  mime: z.string(),
  url: z.string(),
  originalName: z.string().nullable(),
  sizeBytes: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;

export const MediaListResponseSchema = z.object({
  items: z.array(MediaItemSchema),
  /** Có giá trị thì còn trang sau; gửi lại trong tham số `cursor`. */
  nextCursor: z.string().nullable(),
});
export type MediaListResponse = z.infer<typeof MediaListResponseSchema>;

/** Lỗi khi xóa file đang được template dùng. */
export const MediaInUseDetailsSchema = z.object({
  templates: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
});
