'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@opes/module-sdk/react';

export function Confetti({ colors }: { colors: string[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || prefersReducedMotion()) return;
    const w = (cv.width = cv.offsetWidth);
    const h = (cv.height = cv.offsetHeight);
    const parts = Array.from({ length: 110 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 11 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      s: 6 + Math.random() * 6,
      c: colors[Math.floor(Math.random() * colors.length)] ?? '#fff',
    }));
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 2) / 1.2);
      for (const p of parts) {
        p.vy += 0.32;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (t < 3.2) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy một lần khi mở màn kết thúc.
  }, []);
  return (
    <canvas
      ref={canvas}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
