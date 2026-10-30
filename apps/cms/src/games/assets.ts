import type { GameAssetUploadResponse } from '@opes/contracts';
import { api, ApiRequestError } from '../lib/api';
import type { GameAssets, PendingAsset } from './types';

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Tải các file kèm lên kho (trình duyệt tải thẳng lên, không qua API). Địa chỉ theo nội dung file,
 * nên file đã có từ phiên bản trước không bị trùng.
 */
export async function uploadAssets(
  moduleKey: string,
  pending: Record<string, PendingAsset>,
  onProgress?: (done: number, total: number) => void,
): Promise<GameAssets> {
  const out: GameAssets = {};
  const entries = Object.entries(pending);
  let done = 0;
  onProgress?.(0, entries.length);
  // Tải song song vài file một lúc.
  const queue = [...entries];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [path, a] = next;
      const hash = await sha256(a.blob);
      const signed = await api<GameAssetUploadResponse>(`/modules/${encodeURIComponent(moduleKey)}/assets/upload-url`, {
        method: 'POST',
        body: { path, mime: a.mime, size: a.blob.size, sha256: hash },
      });
      const put = await fetch(signed.uploadUrl, { method: 'PUT', headers: signed.headers, body: a.blob }).catch(() => null);
      if (!put || !put.ok) {
        throw new ApiRequestError(
          502,
          'UPLOAD_FAILED',
          `Không tải được "assets/${path}" lên kho media. Kiểm tra cấu hình CORS của kho (docs/huong-dan/r2.md).`,
        );
      }
      out[path] = { url: signed.url, size: a.blob.size, mime: a.mime, sha256: hash };
      done += 1;
      onProgress?.(done, entries.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, entries.length) }, worker));
  return out;
}

/** Địa chỉ tạm (chưa tải lên) để biên dịch thử, ví dụ khi chưa biết key của game. */
export async function placeholderAssets(pending: Record<string, PendingAsset>): Promise<GameAssets> {
  const out: GameAssets = {};
  for (const [path, a] of Object.entries(pending)) {
    out[path] = { url: `/__chua-tai-len__/${path}`, size: a.blob.size, mime: a.mime, sha256: await sha256(a.blob) };
  }
  return out;
}
