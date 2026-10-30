import type { TsRequest, TsResponses } from './protocol';

export type TsStatus = 'loading' | 'ready' | 'error';

/**
 * Cầu nối tới TypeScript chạy trong Web Worker. Mỗi khu sửa code tạo một client; worker chỉ khởi động
 * khi cần và bị tắt khi rời trang. Các yêu cầu được xử lý lần lượt trong worker (đúng thứ tự gửi).
 */
export class TsClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private listeners = new Set<(s: TsStatus) => void>();
  status: TsStatus = 'loading';

  private ensure(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./ts.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
        const { id, ok, result, error } = event.data;
        const waiter = this.pending.get(id);
        if (!waiter) return;
        this.pending.delete(id);
        if (ok) waiter.resolve(result);
        else waiter.reject(new Error(error));
      };
      this.worker.onerror = () => this.setStatus('error');
    }
    return this.worker;
  }

  private setStatus(status: TsStatus) {
    if (this.status === status) return;
    this.status = status;
    for (const l of this.listeners) l(status);
  }

  /** Theo dõi trạng thái (đang tải thư viện / sẵn sàng / lỗi), trả về hàm hủy theo dõi. */
  subscribe(listener: (s: TsStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  request<K extends TsRequest['type']>(req: Extract<TsRequest, { type: K }>): Promise<TsResponses[K]> {
    const worker = this.ensure();
    const id = this.nextId++;
    return new Promise<TsResponses[K]>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (v) => {
          if (req.type !== 'format') this.setStatus('ready');
          resolve(v as TsResponses[K]);
        },
        reject: (e) => {
          if (req.type === 'sync') this.setStatus('error');
          reject(e);
        },
      });
      worker.postMessage({ id, req });
    });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    for (const w of this.pending.values()) w.reject(new Error('Đã đóng trình sửa code.'));
    this.pending.clear();
    this.listeners.clear();
  }
}

/** Mở rộng một hàm bất đồng bộ để chỉ giữ kết quả của lần gọi mới nhất (các lần cũ trả về null). */
export function latestOnly<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R | null> {
  let seq = 0;
  return async (...args: A) => {
    const mine = ++seq;
    const result = await fn(...args);
    return mine === seq ? result : null;
  };
}
