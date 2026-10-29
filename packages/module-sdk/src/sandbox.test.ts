import { describe, expect, it } from 'vitest';
import { createSandboxHost } from './sandbox';
import { GOOGLE_FONTS_VI, googleFontHref } from './fonts';

describe('createSandboxHost', () => {
  it('ghi lại lượt chơi mà không gọi mạng', async () => {
    const host = createSandboxHost();
    expect(host.mode).toBe('preview');
    const { playId } = await host.startPlay();
    const res = await host.finishPlay(playId, { score: 12, durationMs: 1000 });
    expect(res.accepted).toBe(true);
    expect(host.lastResult?.score).toBe(12);
    expect(host.events.map((e) => e.event)).toEqual(['play_start', 'play_finish']);
  });
});

describe('fonts', () => {
  it('địa chỉ Google Fonts có bộ ký tự tiếng Việt', () => {
    const href = googleFontHref(GOOGLE_FONTS_VI[0]!);
    expect(href).toContain('family=Be+Vietnam+Pro');
    expect(href).toContain('subset=vietnamese');
  });
});
