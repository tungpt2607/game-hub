import {
  IMAGE_MAX_DIMENSION,
  MEDIA_RULES,
  type MediaItem,
  type MediaUploadResponse,
  mediaKindOf,
} from '@opes/contracts';
import { api, ApiRequestError } from './api';

/** Các định dạng ảnh được thu nhỏ/nén trước khi tải lên (GIF động và SVG giữ nguyên). */
const OPTIMIZABLE = new Set(['image/png', 'image/jpeg', 'image/webp']);
/** Ảnh nhỏ hơn mức này mà không quá kích thước thì giữ nguyên. */
const OPTIMIZE_ABOVE_BYTES = 600 * 1024;

interface Prepared {
  blob: Blob;
  mime: string;
  fileName: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  optimized: boolean;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh.'));
    };
    img.src = url;
  });
}

function audioDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const renameExt = (name: string, ext: string) => name.replace(/\.[^.]+$/, '') + '.' + ext;

/**
 * Chuẩn bị file trước khi tải lên: đọc kích thước/độ dài; ảnh quá lớn thì thu nhỏ (cạnh dài ≤ 2048px)
 * và nén lại. PNG chuyển sang WebP để vẫn giữ nền trong suốt mà nhẹ hơn nhiều.
 */
async function prepare(file: File): Promise<Prepared> {
  const kind = mediaKindOf(file.type);
  if (kind === 'audio') {
    return {
      blob: file,
      mime: file.type,
      fileName: file.name,
      width: null,
      height: null,
      durationMs: await audioDuration(file),
      optimized: false,
    };
  }

  const img = file.type === 'image/svg+xml' ? null : await loadImage(file).catch(() => null);
  const width = img?.naturalWidth ?? null;
  const height = img?.naturalHeight ?? null;
  const base: Prepared = { blob: file, mime: file.type, fileName: file.name, width, height, durationMs: null, optimized: false };
  if (!img || !width || !height || !OPTIMIZABLE.has(file.type)) return base;

  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(width, height));
  if (scale === 1 && file.size <= OPTIMIZE_ABOVE_BYTES) return base;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return base;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const target = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
  const blob = await canvasToBlob(canvas, target, target === 'image/jpeg' ? 0.85 : 0.9);
  // Trình duyệt không hỗ trợ WebP sẽ trả về PNG; khi đó hoặc khi nén không nhỏ hơn thì giữ file gốc.
  if (!blob || blob.type !== target || (scale === 1 && blob.size >= file.size)) return base;
  return {
    blob,
    mime: target,
    fileName: target === file.type ? file.name : renameExt(file.name, target === 'image/webp' ? 'webp' : 'jpg'),
    width: canvas.width,
    height: canvas.height,
    durationMs: null,
    optimized: true,
  };
}

/** Kiểm tra nhanh trên trình duyệt trước khi gọi API (API vẫn kiểm tra lại). */
export function precheck(file: File): string | null {
  const kind = mediaKindOf(file.type);
  if (!kind) return `"${file.name}": loại file không được hỗ trợ.`;
  return null;
}

/** Tải một file: chuẩn bị → xin link ký trước → PUT thẳng lên kho → báo API ghi vào thư viện. */
export async function uploadFile(file: File): Promise<{ item: MediaItem; optimized: boolean }> {
  const prepared = await prepare(file);
  const kind = mediaKindOf(prepared.mime);
  if (!kind) throw new ApiRequestError(400, 'MEDIA_TYPE_NOT_ALLOWED', `"${file.name}": loại file không được hỗ trợ.`);
  if (prepared.blob.size > MEDIA_RULES[kind].maxBytes) {
    const mb = MEDIA_RULES[kind].maxBytes / 1024 / 1024;
    throw new ApiRequestError(400, 'MEDIA_TOO_LARGE', `"${file.name}" vượt quá ${mb}MB.`);
  }

  const signed = await api<MediaUploadResponse>('/media/upload-url', {
    method: 'POST',
    body: { fileName: prepared.fileName, mime: prepared.mime, sizeBytes: prepared.blob.size },
  });
  const put = await fetch(signed.uploadUrl, { method: 'PUT', headers: signed.headers, body: prepared.blob }).catch(
    () => null,
  );
  if (!put || !put.ok) {
    throw new ApiRequestError(
      502,
      'UPLOAD_FAILED',
      `Không tải được "${file.name}" lên kho media. Kiểm tra cấu hình CORS của kho (docs/huong-dan/r2.md).`,
    );
  }
  const { item } = await api<{ item: MediaItem }>('/media/complete', {
    method: 'POST',
    body: {
      storageKey: signed.storageKey,
      fileName: prepared.fileName,
      mime: prepared.mime,
      sizeBytes: prepared.blob.size,
      width: prepared.width,
      height: prepared.height,
      durationMs: prepared.durationMs,
    },
  });
  return { item, optimized: prepared.optimized };
}
