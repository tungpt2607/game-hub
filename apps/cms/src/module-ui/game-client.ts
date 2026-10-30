import {
  isHostMessage,
  type CheckResult,
  type GameSource,
  type HostReply,
  type HostRequest,
  type RenderState,
  type SerializedSchema,
} from '@opes/module-sdk';
import type { GameHostResponse } from '@opes/contracts';
import { api } from '../lib/api';

/**
 * Điều khiển khung chạy game (trang /embed của trang chơi, nhúng bằng iframe). Code game chạy trên
 * tên miền trang chơi nên không đọc được phiên đăng nhập CMS; CMS chỉ trao đổi qua postMessage.
 */

let hostUrl: Promise<string> | null = null;

/** Địa chỉ khung chạy game, hỏi API một lần. */
export function gameHostUrl(): Promise<string> {
  hostUrl ??= api<GameHostResponse>('/modules/host').then(
    (r) => r.url,
    (e: unknown) => {
      hostUrl = null;
      throw e;
    },
  );
  return hostUrl;
}

/** Quyền của iframe: chạy script, gọi API cùng tên miền trang chơi, mở link ở thẻ mới; không điều hướng trang CMS. */
export const FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
export const FRAME_ALLOW = 'autoplay; fullscreen';

const READY_TIMEOUT_MS = 20_000;
const REQUEST_TIMEOUT_MS = 30_000;

/** Khóa so sánh nguồn game (đổi khóa = tải lại game). */
export const sourceKey = (source: GameSource) =>
  source.kind === 'version' ? `v:${source.key}@${source.version}` : `c:${source.code.length}:${source.code}`;

export class GameClient {
  private readonly origin: string;
  private readonly ready: Promise<void>;
  private markReady!: () => void;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: number }>();
  private closed = false;

  constructor(
    private readonly frame: HTMLIFrameElement,
    url: string,
  ) {
    this.origin = new URL(url).origin;
    window.addEventListener('message', this.onMessage);
    this.ready = new Promise<void>((resolve, reject) => {
      this.markReady = resolve;
      window.setTimeout(() => reject(new Error('Không mở được khung chạy game (trang chơi không phản hồi).')), READY_TIMEOUT_MS);
    });
    // Tránh cảnh báo "lỗi không được xử lý" khi chưa ai chờ.
    this.ready.catch(() => {});
    frame.src = url;
  }

  private onMessage = (event: MessageEvent) => {
    if (event.origin !== this.origin || event.source !== this.frame.contentWindow || !isHostMessage(event.data)) return;
    const msg = event.data as HostReply;
    if (msg.type === 'ready') {
      this.markReady();
      return;
    }
    if (msg.type !== 'reply') return;
    const waiter = this.pending.get(msg.id);
    if (!waiter) return;
    this.pending.delete(msg.id);
    window.clearTimeout(waiter.timer);
    if (msg.ok) waiter.resolve(msg.result);
    else waiter.reject(new Error(msg.error));
  };

  private post(msg: HostRequest) {
    this.frame.contentWindow?.postMessage(msg, this.origin);
  }

  private async request<T>(make: (id: number) => HostRequest): Promise<T> {
    await this.ready;
    if (this.closed) throw new Error('Khung đã đóng.');
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Khung chạy game không phản hồi.'));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.post(make(id));
    });
  }

  load(source: GameSource) {
    return this.request<SerializedSchema>((id) => ({ opes: 1, type: 'load', id, source }));
  }

  check(config: unknown) {
    return this.request<CheckResult>((id) => ({ opes: 1, type: 'check', id, config }));
  }

  normalize(config: unknown) {
    return this.request<Record<string, unknown>>((id) => ({ opes: 1, type: 'normalize', id, config }));
  }

  render(state: RenderState) {
    void this.ready.then(() => this.post({ opes: 1, type: 'render', state }), () => {});
  }

  destroy() {
    this.closed = true;
    window.removeEventListener('message', this.onMessage);
    for (const w of this.pending.values()) {
      window.clearTimeout(w.timer);
      w.reject(new Error('Khung đã đóng.'));
    }
    this.pending.clear();
  }
}
