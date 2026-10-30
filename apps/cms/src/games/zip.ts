import JSZip from 'jszip';
import { FONT_MIME_BY_EXT, GAME_CODE_EXTENSIONS, GAME_LIMITS, GAME_PATH, mediaKindOf } from '@opes/contracts';
import type { GameAssets, GameFiles, PendingAsset } from './types';

/**
 * Gói game dạng .zip:
 *   schema.ts, index.ts, ... (code: .ts .tsx .js .jsx .json .md .txt)
 *   assets/...              (ảnh, âm thanh, font dùng qua `import { asset } from 'opes:assets'`)
 * Nếu mọi file nằm chung một thư mục gốc (ví dụ khi nén cả thư mục) thì thư mục đó được bỏ đi.
 */

const IGNORED = /(^|\/)(__MACOSX|node_modules|\.git|\.DS_Store|Thumbs\.db)(\/|$)/;

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  ...FONT_MIME_BY_EXT,
};

export const extOf = (path: string) => (path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toLowerCase() : '');

/** Kiểu MIME của file kèm theo phần mở rộng; null nếu không được phép. */
export function assetMime(path: string): string | null {
  const mime = MIME_BY_EXT[extOf(path)];
  return mime && mediaKindOf(mime) ? mime : null;
}

export const isCodePath = (path: string) => GAME_CODE_EXTENSIONS.includes(extOf(path));

export interface ReadZipResult {
  files: GameFiles;
  assets: Record<string, PendingAsset>;
  /** File bị bỏ qua (kèm lý do), để báo cho người dùng. */
  skipped: string[];
}

export async function readGameZip(blob: Blob): Promise<ReadZipResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(blob);
  } catch {
    throw new Error('Không đọc được file .zip.');
  }
  let entries = Object.values(zip.files).filter((e) => !e.dir && !IGNORED.test(e.name));
  if (entries.length === 0) throw new Error('File .zip không có file nào.');

  // Bỏ thư mục gốc chung.
  const first = entries[0]!.name.split('/')[0]!;
  const common = entries.every((e) => e.name.startsWith(`${first}/`)) ? `${first}/` : '';
  const rel = (name: string) => name.slice(common.length);

  if (entries.length > GAME_LIMITS.maxFiles + GAME_LIMITS.maxAssets) throw new Error('File .zip có quá nhiều file.');
  const files: GameFiles = {};
  const assets: Record<string, PendingAsset> = {};
  const skipped: string[] = [];
  entries = entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = rel(entry.name);
    if (path.startsWith('assets/')) {
      const assetPath = path.slice('assets/'.length);
      const mime = assetMime(assetPath);
      if (!mime) {
        skipped.push(`${path} (loại file không hỗ trợ)`);
        continue;
      }
      if (!GAME_PATH.test(assetPath)) {
        skipped.push(`${path} (tên file chỉ dùng chữ không dấu, số, - _ . /; không có dấu cách)`);
        continue;
      }
      const data = await entry.async('blob');
      assets[assetPath] = { blob: new Blob([data], { type: mime }), mime };
      continue;
    }
    if (!isCodePath(path)) {
      skipped.push(`${path} (ngoài assets/ chỉ nhận file code)`);
      continue;
    }
    if (!GAME_PATH.test(path)) {
      skipped.push(`${path} (tên file chỉ dùng chữ không dấu, số, - _ . /; không có dấu cách)`);
      continue;
    }
    files[path] = await entry.async('string');
  }
  if (!Object.keys(files).some((p) => /^schema\.(ts|tsx|js)$/.test(p))) {
    throw new Error('Không thấy schema.ts ở thư mục gốc của gói game.');
  }
  return { files, assets, skipped };
}

/** Đóng gói mã nguồn và file kèm (tải từ kho) thành .zip. */
export async function writeGameZip(files: GameFiles, assets: GameAssets): Promise<Blob> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  for (const [path, a] of Object.entries(assets)) {
    const res = await fetch(a.url);
    if (!res.ok) throw new Error(`Không tải được file kèm "${path}".`);
    zip.file(`assets/${path}`, await res.blob());
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Gói game mẫu (packages/modules/examples/game-mau) dạng .zip để tải về làm điểm bắt đầu. */
export async function exampleZip(): Promise<{ key: string; blob: Blob }> {
  const example = (await import('@opes/modules/example')).default as {
    key: string;
    files: Record<string, string>;
    assets: Record<string, { mime: string; text: string }>;
  };
  const zip = new JSZip();
  for (const [path, content] of Object.entries(example.files)) zip.file(path, content);
  for (const [path, a] of Object.entries(example.assets)) zip.file(`assets/${path}`, a.text);
  return { key: example.key, blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }) };
}
