import type { SerializedSchema } from './form';
import type { ConfigErrors } from './validation';

/**
 * Giao thức giữa CMS và khung chạy game (trang /embed của trang chơi, nhúng bằng iframe).
 * Code game chạy trên tên miền trang chơi, tách khỏi CMS: game lỗi hay có code xấu cũng không đọc
 * được phiên đăng nhập CMS. Mọi tin nhắn có `opes: 1`.
 */

/** Game cần chạy: một phiên bản đã phát hành, hoặc code vừa biên dịch (bản nháp, Bước 7c). */
export type GameSource =
  | { kind: 'version'; key: string; version: string }
  | { kind: 'code'; code: string; label?: string };

export interface RenderState {
  config: unknown;
  screen?: string;
  muted: boolean;
  /** Tăng lên để chơi lại từ đầu. */
  run: number;
}

export type HostRequest =
  | { opes: 1; type: 'load'; id: number; source: GameSource }
  | { opes: 1; type: 'check'; id: number; config: unknown }
  | { opes: 1; type: 'normalize'; id: number; config: unknown }
  | { opes: 1; type: 'render'; state: RenderState };

export type HostReply =
  | { opes: 1; type: 'ready' }
  | { opes: 1; type: 'reply'; id: number; ok: true; result: unknown }
  | { opes: 1; type: 'reply'; id: number; ok: false; error: string }
  /** Game bị lỗi khi chạy (hiện ngay trong khung; CMS có thể báo thêm). */
  | { opes: 1; type: 'crash'; message: string };

export interface CheckResult {
  errors: ConfigErrors;
  hidden: string[];
  labels: Record<string, string[]>;
}

export type LoadResult = SerializedSchema;

export function isHostMessage(data: unknown): data is { opes: 1; type: string } {
  return typeof data === 'object' && data !== null && (data as { opes?: unknown }).opes === 1;
}
