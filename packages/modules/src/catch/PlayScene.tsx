'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { HostApi } from '@opes/module-sdk';
import {
  EMOJI_FONT,
  prefersReducedMotion,
  usePreloadImages,
  vibrate,
  type Sound,
} from '@opes/module-sdk/react';
import type { CatchConfig } from './config';
import { CatchEngine, type EngineEvent } from './engine';
import { SpriteLayer } from './SpriteLayer';
import { drawFrame, type Pop } from './draw';

export function PlayScene({
  config,
  host,
  sounds,
  onEnd,
}: {
  config: CatchConfig;
  host: HostApi;
  sounds: { catch: Sound; bad: Sound };
  onEnd: (score: number) => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CatchEngine | null>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const [countdown, setCountdown] = useState(config.rules.countdown ? 3 : 0);
  const [hud, setHud] = useState({
    score: 0,
    lives: config.rules.lives,
    time: config.rules.duration,
    level: 1,
  });
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);

  const imageUrls = useMemo(
    () =>
      [config.basket.symbol.image?.url, ...config.items.map((i) => i.symbol.image?.url)].filter(
        (u): u is string => Boolean(u),
      ),
    [config.basket.symbol.image?.url, config.items],
  );
  usePreloadImages(imageUrls);
  const spriteRoot = useRef<HTMLDivElement>(null);

  // Đếm ngược 3-2-1.
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Tạo lõi game theo kích thước vùng chơi; cập nhật khi đổi kích thước.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const engine = engineRef.current;
      if (engine) engine.resize(width, height);
      else if (width > 0 && height > 0) {
        const c = configRef.current;
        engineRef.current = new CatchEngine({
          width,
          height,
          items: c.items.map((i) => ({
            points: i.points,
            weight: i.weight,
            loseLifeOnCatch: i.loseLifeOnCatch,
            loseLifeOnMiss: i.loseLifeOnMiss,
          })),
          basketSize: c.basket.size,
          endMode: c.rules.endMode,
          duration: c.rules.duration,
          lives: c.rules.lives,
          difficulty: { ...c.difficulty },
        });
      }
      const cv = canvas.current;
      if (cv) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(width * dpr);
        cv.height = Math.round(height * dpr);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Vòng lặp chính: chạy sau khi đếm ngược xong.
  useEffect(() => {
    if (countdown > 0) return;
    let raf = 0;
    let last = performance.now();
    let playId: string | null = null;
    let ended = false;
    let popId = 1;
    const pops: Pop[] = [];
    const keys = { left: false, right: false };
    const startedAt = Date.now();
    const sprites = spriteRoot.current ? new SpriteLayer(spriteRoot.current) : null;
    void host.startPlay().then((r) => {
      playId = r.playId;
    });

    const onKey = (e: KeyboardEvent) => {
      const down = e.type === 'keydown';
      if (e.key === 'ArrowLeft') keys.left = down;
      else if (e.key === 'ArrowRight') keys.right = down;
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    const handle = (events: EngineEvent[], engine: CatchEngine) => {
      for (const ev of events) {
        if (ev.type === 'catch') {
          const bad = ev.points < 0 || ev.lostLife;
          if (ev.points !== 0 || ev.lostLife)
            pops.push({
              id: popId++,
              x: ev.x,
              y: ev.y,
              text:
                ev.lostLife && ev.points === 0 ? '-❤️' : `${ev.points > 0 ? '+' : ''}${ev.points}`,
              good: !bad,
              born: performance.now(),
            });
          (bad ? soundsRef.current.bad : soundsRef.current.catch).play();
          host.track('catch', { points: ev.points });
        }
        if ((ev.type === 'catch' || ev.type === 'miss') && ev.lostLife) {
          if (ev.type === 'miss') soundsRef.current.bad.play();
          if (!prefersReducedMotion())
            area.current?.animate(
              [
                { transform: 'translate(0,0)' },
                { transform: 'translate(-8px,2px)' },
                { transform: 'translate(7px,-3px)' },
                { transform: 'translate(-5px,3px)' },
                { transform: 'translate(4px,-1px)' },
                { transform: 'translate(0,0)' },
              ],
              { duration: 350, easing: 'ease-out' },
            );
          vibrate(160);
        }
        if (ev.type === 'levelUp') setBanner({ id: ev.level, text: `Màn ${ev.level}` });
        if (ev.type === 'end' && !ended) {
          ended = true;
          const score = engine.score;
          const finish = () =>
            playId
              ? host.finishPlay(playId, {
                  score,
                  durationMs: Date.now() - startedAt,
                  data: { caught: engine.caught, missed: engine.missed, level: engine.level },
                })
              : Promise.resolve();
          void finish().finally(() => setTimeout(() => onEndRef.current(score), 400));
        }
      }
    };

    const draw = (engine: CatchEngine, now: number) => {
      if (canvas.current) drawFrame(canvas.current, engine, configRef.current, sprites, pops, now);
    };

    let hudLast = '';
    const loop = (now: number) => {
      const engine = engineRef.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (engine) {
        if (keys.left !== keys.right) engine.nudge(keys.left ? -1 : 1, dt);
        if (!engine.over) handle(engine.step(dt), engine);
        draw(engine, now);
        const time = engine.timeLeft === null ? 0 : Math.ceil(engine.timeLeft);
        const next = `${engine.score}|${engine.lives}|${time}|${engine.level}`;
        if (next !== hudLast) {
          hudLast = next;
          setHud({ score: engine.score, lives: engine.lives, time, level: engine.level });
        }
      }
      if (!ended || pops.length > 0) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      sprites?.clear();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [countdown, host]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 1400);
    return () => clearTimeout(timer);
  }, [banner]);

  const pointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    const el = area.current;
    if (!engine || !el) return;
    if (e.type === 'pointerdown') el.setPointerCapture?.(e.pointerId);
    engine.setTarget(e.clientX - el.getBoundingClientRect().left);
  };

  const usesLives = config.rules.endMode !== 'time';
  const usesTime = config.rules.endMode !== 'lives';
  const hudText: CSSProperties = {
    fontSize: 22,
    fontWeight: 800,
    textShadow: '0 2px 4px rgba(0,0,0,0.35)',
  };

  return (
    <div
      ref={area}
      onPointerDown={pointer}
      onPointerMove={pointer}
      style={{
        position: 'absolute',
        inset: 0,
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      <div
        ref={spriteRoot}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
      />
      <canvas
        ref={canvas}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          pointerEvents: 'none',
        }}
      >
        <span style={hudText}>⭐ {hud.score}</span>
        {config.difficulty.mode === 'levels' && (
          <span style={{ ...hudText, fontSize: 16 }}>Màn {hud.level}</span>
        )}
        <span style={{ ...hudText, display: 'flex', gap: 10 }}>
          {usesTime && <span>⏱ {hud.time}s</span>}
          {usesLives && (
            <span style={{ fontFamily: EMOJI_FONT }}>
              {'❤️'.repeat(Math.max(0, hud.lives)) || '🤍'}
            </span>
          )}
        </span>
      </div>
      {countdown > 0 && (
        <div
          key={countdown}
          className="opes-catch-anim"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: 120,
            fontWeight: 800,
            textShadow: '0 6px 16px rgba(0,0,0,0.35)',
            animation: 'opes-catch-pop 0.35s ease-out',
            pointerEvents: 'none',
          }}
        >
          {countdown}
        </div>
      )}
      {banner && (
        <div
          key={banner.id}
          className="opes-catch-anim"
          style={{
            position: 'absolute',
            top: '35%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 44,
            fontWeight: 800,
            textShadow: '0 4px 12px rgba(0,0,0,0.35)',
            animation: 'opes-catch-banner 1.4s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          {banner.text}
        </div>
      )}
    </div>
  );
}
