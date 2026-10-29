import type { HostApi, PlayResult } from './runtime';

export interface SandboxEvent {
  at: number;
  event: string;
  data?: Record<string, unknown>;
}

export interface SandboxHost extends HostApi {
  /** Các sự kiện đã ghi (để khung xem trước hiển thị nếu cần). */
  readonly events: readonly SandboxEvent[];
  readonly lastResult: PlayResult | null;
}

/** HostApi cho chế độ chơi thử: không gọi mạng, mọi lượt chơi đều được chấp nhận. */
export function createSandboxHost(onEvent?: (e: SandboxEvent) => void): SandboxHost {
  const events: SandboxEvent[] = [];
  let lastResult: PlayResult | null = null;
  let counter = 0;
  const record = (event: string, data?: Record<string, unknown>) => {
    const e: SandboxEvent = { at: Date.now(), event, data };
    events.push(e);
    if (events.length > 200) events.shift();
    onEvent?.(e);
  };
  return {
    mode: 'preview',
    get events() {
      return events;
    },
    get lastResult() {
      return lastResult;
    },
    async startPlay() {
      counter += 1;
      const playId = `preview-${counter}`;
      record('play_start', { playId });
      return { playId };
    },
    async finishPlay(playId, result) {
      lastResult = result;
      record('play_finish', { playId, score: result.score, durationMs: result.durationMs });
      return { accepted: true };
    },
    track(event, data) {
      record(event, data);
    },
  };
}
