/**
 * Chuẩn module (xem docs/02-chuan-module.md).
 * Bước 2 chỉ đặt các kiểu cơ bản; lược đồ cấu hình, phần chạy và SandboxHost làm ở Bước 5.
 */

export type ModuleKind = 'game' | 'leaderboard' | 'reward';

export interface ModuleMeta {
  /** Định danh duy nhất, ví dụ "game.catch". */
  key: string;
  kind: ModuleKind;
  /** Semver, ví dụ "1.0.0". */
  version: string;
  /** Khóa i18n của tên hiển thị. */
  name: string;
  /** Khóa i18n của mô tả. */
  description: string;
}

export interface ModuleDefinition<Config> extends ModuleMeta {
  defaults: Config;
}

const MODULE_KEY = /^(game|leaderboard|reward)\.[a-z][a-z0-9-]*$/;

/** Kiểm tra định danh module có đúng dạng "<loại>.<tên>" và khớp với `kind`. */
export function isValidModuleKey(key: string, kind: ModuleKind): boolean {
  return MODULE_KEY.test(key) && key.startsWith(`${kind}.`);
}
