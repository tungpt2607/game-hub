import type { Fields } from './fields';

/**
 * Phần mô tả module không phụ thuộc React hay trình duyệt, để API (máy chủ) dùng được:
 * định danh, lược đồ trường, mặc định, mẫu có sẵn.
 */

export type ModuleKind = 'game' | 'leaderboard' | 'reward';

export interface ModuleScreen {
  id: string;
  label: string;
}

/** Bộ cấu hình mẫu có sẵn của module (ví dụ giao diện Tết, Trung thu). */
export interface ModulePreset<Config> {
  id: string;
  name: string;
  description?: string;
  config: Config;
}

export interface ModuleSchema<Config> {
  /** Định danh duy nhất, ví dụ "game.catch". */
  key: string;
  kind: ModuleKind;
  /** Semver, ví dụ "1.0.0". */
  version: string;
  /** Tên hiển thị (tiếng Việt). */
  name: string;
  description: string;
  fields: Fields;
  defaults: Config;
  /** Các màn hình để nhảy tới khi xem trước; màn hình đầu tiên là màn hình mở đầu. */
  screens: ModuleScreen[];
  /** Các mẫu có sẵn để tạo template nhanh. */
  presets?: ModulePreset<Config>[];
  /** Mô tả cách tính điểm (module game). */
  scoring?: { unit: string; higherIsBetter: boolean };
}

const MODULE_KEY = /^(game|leaderboard|reward)\.[a-z][a-z0-9-]*$/;

/** Kiểm tra định danh module có đúng dạng "<loại>.<tên>" và khớp với `kind`. */
export function isValidModuleKey(key: string, kind: ModuleKind): boolean {
  return MODULE_KEY.test(key) && key.startsWith(`${kind}.`);
}
