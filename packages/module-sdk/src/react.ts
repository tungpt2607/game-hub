'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FontValue, MediaRef } from './fields';
import { cssFontStack, loadFont } from './fonts';

/** Tải font và trả về chuỗi `font-family` để gắn vào style. */
export function useFont(font: FontValue): string {
  const [, setReady] = useState(0);
  const key = font.media ? font.media.id : font.family;
  const latest = useRef(font);
  latest.current = font;
  useEffect(() => {
    let alive = true;
    void loadFont(latest.current).then(() => alive && setReady((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [key]);
  return cssFontStack(font);
}

export interface Sound {
  play(): void;
  stop(): void;
}

export interface SoundOptions {
  muted: boolean;
  loop?: boolean;
  volume?: number;
}

/**
 * Âm thanh của module. Trả về hàm `play()`; với nhạc nền (`loop`), gọi `play()` một lần sau
 * thao tác đầu tiên của người chơi (trình duyệt chặn tự phát trước đó), và `stop()` khi kết thúc.
 */
export function useSound(ref: MediaRef | null, { muted, loop = false, volume = 1 }: SoundOptions): Sound {
  const audio = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const url = ref?.url ?? null;

  useEffect(() => {
    if (!url) {
      audio.current = null;
      return;
    }
    const a = new Audio(url);
    a.loop = loop;
    a.preload = 'auto';
    a.muted = mutedRef.current;
    audio.current = a;
    return () => {
      a.pause();
      audio.current = null;
    };
  }, [url, loop]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.muted = muted;
    a.volume = volume;
  }, [muted, volume, url]);

  // Đối tượng ổn định giữa các lần render, an toàn khi đặt vào danh sách phụ thuộc của effect.
  return useMemo<Sound>(
    () => ({
      play() {
        const a = audio.current;
        if (!a) return;
        a.muted = mutedRef.current;
        if (!a.loop) a.currentTime = 0;
        void a.play().catch(() => undefined);
      },
      stop() {
        const a = audio.current;
        if (!a) return;
        a.pause();
        a.currentTime = 0;
      },
    }),
    [],
  );
}
