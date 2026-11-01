import {
  ErrorCode,
  GAME_CODE_EXTENSIONS,
  GAME_LIMITS,
  GAME_PATH,
  MEDIA_RULES,
  mediaKindOf,
  SEMVER,
} from '@opes/contracts';
import type { GameAssets, GameModuleMeta } from '@opes/db';
import { AppError } from './errors';
import { sandbox } from './module-sandbox';
import type { Storage } from './storage';

/**
 * Kiểm tra gói game gửi lên (mã nguồn, file kèm, mô tả trong schema.ts, cấu hình mặc định và mẫu)
 * trước khi lưu nháp hoặc phát hành. Không phụ thuộc HTTP hay cơ sở dữ liệu.
 */

export const KEY_FORMAT = /^(game|leaderboard|reward)\.[a-z][a-z0-9-]{0,47}$/;

export const invalid = (message: string, details?: unknown) =>
  new AppError(
    422,
    ErrorCode.MODULE_INVALID,
    message,
    details === undefined ? undefined : { details },
  );

export const extOf = (path: string) =>
  path.includes('.') ? path.slice(path.lastIndexOf('.') + 1).toLowerCase() : '';

/** Kiểm tra mã nguồn: đường dẫn, loại file, dung lượng; bắt buộc có schema.ts và index.ts. */
export function checkFiles(files: Record<string, string>) {
  const paths = Object.keys(files);
  if (paths.length > GAME_LIMITS.maxFiles)
    throw invalid(`Tối đa ${GAME_LIMITS.maxFiles} file code.`);
  let total = 0;
  for (const path of paths) {
    if (!GAME_PATH.test(path)) {
      throw invalid(
        `Tên file "${path}" không hợp lệ (chỉ dùng chữ không dấu, số, - _ . /; không có dấu cách).`,
      );
    }
    if (path.startsWith('assets/'))
      throw invalid(`File "${path}" thuộc thư mục assets/ phải tải lên dạng file kèm.`);
    if (!GAME_CODE_EXTENSIONS.includes(extOf(path))) {
      throw invalid(
        `File "${path}": chỉ nhận ${GAME_CODE_EXTENSIONS.map((e) => '.' + e).join(', ')} ngoài thư mục assets/.`,
      );
    }
    const size = Buffer.byteLength(files[path]!, 'utf8');
    if (size > GAME_LIMITS.maxFileBytes)
      throw invalid(`File "${path}" quá lớn (tối đa ${GAME_LIMITS.maxFileBytes / 1024}KB).`);
    total += size;
  }
  if (total > GAME_LIMITS.maxTotalCodeBytes)
    throw invalid('Tổng dung lượng code quá lớn (tối đa 2MB).');
  for (const required of ['schema', 'index']) {
    if (!['ts', 'tsx', 'js'].some((ext) => files[`${required}.${ext}`] !== undefined)) {
      throw invalid(`Thiếu file ${required}.ts.`);
    }
  }
}

/** Đường dẫn trên kho của một file kèm: theo nội dung (sha256), nên file giống nhau chỉ lưu một lần. */
export const assetStorageKey = (moduleKey: string, sha256: string, ext: string) =>
  `game-assets/${moduleKey}/${sha256}.${ext}`;

export function assetExt(path: string, mime: string): string {
  const kind = mediaKindOf(mime);
  if (!kind) {
    throw invalid(
      `File kèm "${path}": loại file không được hỗ trợ (ảnh PNG/JPG/WebP/GIF/SVG, âm thanh MP3/M4A/OGG/WAV, font).`,
    );
  }
  return MEDIA_RULES[kind].mimes[mime]!;
}

/** Kiểm tra danh sách file kèm; địa chỉ phải là file của chính game này trên kho. Trả về bản chuẩn hóa. */
export function checkAssets(
  moduleKey: string,
  assets: GameAssets,
  storage: Storage | null,
): GameAssets {
  const paths = Object.keys(assets);
  if (paths.length > GAME_LIMITS.maxAssets)
    throw invalid(`Tối đa ${GAME_LIMITS.maxAssets} file kèm.`);
  if (paths.length > 0 && !storage) {
    throw new AppError(
      503,
      ErrorCode.STORAGE_NOT_CONFIGURED,
      'Kho media chưa được cấu hình nên chưa lưu được file kèm.',
    );
  }
  let total = 0;
  const out: GameAssets = {};
  for (const path of paths) {
    const a = assets[path]!;
    if (!GAME_PATH.test(path)) {
      throw invalid(
        `Tên file kèm "${path}" không hợp lệ (chỉ dùng chữ không dấu, số, - _ . /; không có dấu cách).`,
      );
    }
    const ext = assetExt(path, a.mime);
    const rule = MEDIA_RULES[mediaKindOf(a.mime)!];
    if (a.size > Math.min(rule.maxBytes, GAME_LIMITS.maxAssetBytes)) {
      throw invalid(
        `File kèm "${path}" quá lớn (tối đa ${Math.min(rule.maxBytes, GAME_LIMITS.maxAssetBytes) / 1024 / 1024}MB).`,
      );
    }
    total += a.size;
    // Địa chỉ luôn tính lại từ nội dung file (CMS có thể gửi dạng /media/... khi bật MEDIA_PROXY).
    const url = storage!.publicUrl(assetStorageKey(moduleKey, a.sha256, ext));
    out[path] = { url, size: a.size, mime: a.mime, sha256: a.sha256 };
  }
  if (total > GAME_LIMITS.maxTotalAssetBytes)
    throw invalid('Tổng dung lượng file kèm quá lớn (tối đa 60MB).');
  return out;
}

/** Đọc mô tả game trong hộp cách ly; kiểm tra key và loại. */
export async function readMeta(schemaJs: string, expectedKey?: string): Promise<GameModuleMeta> {
  const meta = await sandbox.meta(schemaJs);
  if (
    !meta ||
    typeof meta.key !== 'string' ||
    !KEY_FORMAT.test(meta.key) ||
    !meta.key.startsWith(`${meta.kind}.`)
  ) {
    throw invalid(
      'key trong schema.ts cần có dạng "game.ten-game" (chữ thường, số, dấu -), khớp với kind.',
    );
  }
  if (expectedKey && meta.key !== expectedKey) {
    throw invalid(
      `key trong schema.ts phải giữ là "${expectedKey}" (đang là "${meta.key}"). Muốn làm game khác thì tải lên dạng game mới.`,
    );
  }
  if (typeof meta.name !== 'string' || !meta.name.trim())
    throw invalid('Thiếu name (tên game) trong schema.ts.');
  if (typeof meta.version !== 'string' || !SEMVER.test(meta.version)) {
    throw invalid('version trong schema.ts cần có dạng 1.0.0.');
  }
  if (!Array.isArray(meta.screens) || meta.screens.length === 0)
    throw invalid('Cần ít nhất một màn hình trong screens.');
  return meta;
}

/** Trước khi phát hành: cấu hình mặc định và mọi mẫu phải hợp lệ theo chính game. */
export async function checkConfigs(schemaJs: string, meta: GameModuleMeta) {
  const problems: string[] = [];
  const defaults = await sandbox.validate(schemaJs, meta.defaults);
  for (const [path, msg] of Object.entries(defaults))
    problems.push(`Cấu hình mặc định › ${path}: ${msg}`);
  for (const preset of meta.presets ?? []) {
    const errors = await sandbox.validate(schemaJs, preset.config);
    for (const [path, msg] of Object.entries(errors))
      problems.push(`Mẫu "${preset.name}" › ${path}: ${msg}`);
  }
  if (problems.length) {
    throw invalid(
      `Còn ${problems.length} lỗi trong cấu hình mặc định hoặc mẫu: ${problems.slice(0, 5).join('; ')}`,
      { problems },
    );
  }
}

/** Gợi ý phiên bản tiếp theo: 1.2.3 → 1.2.4. */
export function nextPatchVersion(version: string): string {
  const m = SEMVER.exec(version);
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : '1.0.0';
}
