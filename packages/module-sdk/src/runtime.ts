import type { ComponentType } from 'react';
import type { ModuleSchema } from './meta';

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

export interface ModuleDefinition<Config> extends ModuleSchema<Config> {
  Runtime: ComponentType<RuntimeProps<Config>>;
}

/** Khai báo module; chỉ giúp suy kiểu `Config` từ `defaults`. */
export function defineModule<Config>(def: ModuleDefinition<Config>): ModuleDefinition<Config> {
  return def;
}
