import type { ComponentType } from 'react';
import type { Fields } from './fields';

export type ModuleKind = 'game' | 'leaderboard' | 'reward';

/** Chế độ chạy: `preview` = chơi thử, không kết nối gì; `live` = chiến dịch thật (Giai đoạn 2). */
export type RunMode = 'preview' | 'live';

export interface PlayResult {
  score: number;
  durationMs: number;
  /** Dữ liệu thêm module muốn gửi kèm (ví dụ số vật phẩm đã hứng). */
  data?: Record<string, unknown>;
}

/**
 * Cổng giao tiếp giữa module và nơi chạy nó. Module KHÔNG tự gọi mạng;
 * mọi thứ đi qua HostApi. Ở chế độ chơi thử, SandboxHost trả kết quả giả ngay lập tức.
 */
export interface HostApi {
  readonly mode: RunMode;
  startPlay(): Promise<{ playId: string }>;
  finishPlay(playId: string, result: PlayResult): Promise<{ accepted: boolean }>;
  track(event: string, data?: Record<string, unknown>): void;
}

export interface RuntimeProps<Config> {
  config: Config;
  host: HostApi;
  /** Màn hình mở đầu (dùng cho nút "nhảy tới màn hình" trong khung xem trước). */
  initialScreen?: string;
  muted: boolean;
  /** Khóa để module lưu dữ liệu riêng trên máy người chơi (ví dụ điểm cao nhất), khác nhau theo từng link. */
  storageKey?: string;
}

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

export interface ModuleDefinition<Config> {
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
  Runtime: ComponentType<RuntimeProps<Config>>;
  /** Các mẫu có sẵn để tạo template nhanh. */
  presets?: ModulePreset<Config>[];
  /** Mô tả cách tính điểm (module game). */
  scoring?: { unit: string; higherIsBetter: boolean };
}

/** Khai báo module; chỉ giúp suy kiểu `Config` từ `defaults`. */
export function defineModule<Config>(def: ModuleDefinition<Config>): ModuleDefinition<Config> {
  return def;
}

const MODULE_KEY = /^(game|leaderboard|reward)\.[a-z][a-z0-9-]*$/;

/** Kiểm tra định danh module có đúng dạng "<loại>.<tên>" và khớp với `kind`. */
export function isValidModuleKey(key: string, kind: ModuleKind): boolean {
  return MODULE_KEY.test(key) && key.startsWith(`${kind}.`);
}
