'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { EmojiOrImage, HostApi, RuntimeProps } from '@opes/module-sdk';
import { useFont, useSound, type Sound } from '@opes/module-sdk/react';
import type { CatchConfig } from './config';
import { CatchEngine, pickEndMessage, type EngineEvent } from './engine';

type Screen = 'intro' | 'guide' | 'play' | 'end';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const CSS = `
@keyframes opes-catch-pop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes opes-catch-banner { 0% { transform: scale(.7); opacity: 0 } 15% { transform: scale(1.05); opacity: 1 } 80% { opacity: 1 } 100% { opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .opes-catch-anim { animation: none !important } }
`;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function readBest(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}
function writeBest(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua.
  }
}

/** Ảnh của vật phẩm/giỏ đã tải xong, để vẽ lên canvas. */
function useImages(urls: string[]) {
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const key = urls.join('|');
  useEffect(() => {
    let alive = true;
    for (const url of new Set(urls)) {
      if (images[url]) continue;
      const img = new Image();
      img.onload = () => alive && setImages((prev) => ({ ...prev, [url]: img }));
      img.src = url;
    }
    return () => {
      alive = false;
    };
    // `images` cố ý không nằm trong danh sách phụ thuộc: chỉ tải khi danh sách link đổi.
  }, [key]);
  return images;
}

function ItemSymbol({ value, size }: { value: EmojiOrImage; size: number }) {
  if (value.image)
    return <img src={value.image.url} alt="" style={{ width: size, height: size, objectFit: 'contain' }} draggable={false} />;
  return <span style={{ fontSize: size * 0.85, lineHeight: 1, fontFamily: EMOJI_FONT }}>{value.emoji}</span>;
}

export function CatchRuntime({ config, host, initialScreen, muted, storageKey }: RuntimeProps<CatchConfig>) {
  const fontFamily = useFont(config.look.font);
  const music = useSound(config.sound.music, { muted, loop: true, volume: 0.45 });
  const catchSound = useSound(config.sound.catch, { muted });
  const badSound = useSound(config.sound.bad, { muted });
  const endSound = useSound(config.sound.end, { muted });

  const firstScreen: Screen =
    initialScreen === 'play' || initialScreen === 'end'
      ? initialScreen
      : initialScreen === 'guide' && config.guide.enabled
        ? 'guide'
        : 'intro';
  const [screen, setScreen] = useState<Screen>(firstScreen);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState({ score: 0, best: null as number | null, newBest: false });
  const bestKey = `opes-catch-best:${storageKey ?? `${host.mode}-preview`}`;

  useEffect(() => {
    setResult((r) => ({ ...r, best: readBest(bestKey) }));
  }, [bestKey]);

  useEffect(() => () => music.stop(), [music]);

  const play = useCallback(() => {
    setScreen('play');
    setRunKey((k) => k + 1);
    music.play();
  }, [music]);

  const finish = useCallback(
    (score: number) => {
      music.stop();
      endSound.play();
      const prev = readBest(bestKey);
      const newBest = prev === null || score > prev;
      if (newBest) writeBest(bestKey, score);
      setResult({ score, best: newBest ? score : prev, newBest: newBest && prev !== null });
      setScreen('end');
    },
    [music, endSound, bestKey],
  );

  const root: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    fontFamily,
    color: config.look.text,
    background: config.look.background,
    backgroundImage: config.look.backgroundImage ? `url(${JSON.stringify(config.look.backgroundImage.url)})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div style={root}>
      <style>{CSS}</style>
      {screen === 'intro' && (
        <Centered>
          {config.content.logo && (
            <img src={config.content.logo.url} alt="" style={{ maxWidth: '62%', maxHeight: 130, objectFit: 'contain' }} />
          )}
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.15 }}>{config.content.title}</h1>
          {config.content.intro && (
            <p style={{ margin: 0, fontSize: 17, opacity: 0.92, whiteSpace: 'pre-line' }}>{config.content.intro}</p>
          )}
          <BigButton config={config} onClick={() => (config.guide.enabled ? setScreen('guide') : play())}>
            {config.content.startLabel}
          </BigButton>
        </Centered>
      )}

      {screen === 'guide' && <GuideScreen config={config} onPlay={play} />}

      {screen === 'play' && (
        <PlayScene key={runKey} config={config} host={host} sounds={{ catch: catchSound, bad: badSound }} onEnd={finish} />
      )}

      {screen === 'end' && <EndScreen config={config} result={result} onReplay={play} />}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

function BigButton({
  config,
  onClick,
  children,
  variant = 'solid',
}: {
  config: CatchConfig;
  onClick: () => void;
  children: ReactNode;
  variant?: 'solid' | 'outline';
}) {
  const solid = variant === 'solid';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 180,
        padding: solid ? '14px 36px' : '10px 24px',
        border: solid ? 'none' : `2px solid ${config.look.text}`,
        borderRadius: 999,
        background: solid ? config.look.primary : 'transparent',
        color: solid ? config.look.buttonText : config.look.text,
        fontFamily: 'inherit',
        fontSize: solid ? 20 : 16,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: solid ? '0 6px 0 rgba(0,0,0,0.25)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function itemNote(item: CatchConfig['items'][number], usesLives: boolean): string {
  const parts: string[] = [];
  if (item.points !== 0) parts.push(`${item.points > 0 ? '+' : ''}${item.points} điểm`);
  if (usesLives && item.loseLifeOnCatch) parts.push('hứng phải mất 1 mạng');
  if (usesLives && item.loseLifeOnMiss) parts.push('để rơi mất 1 mạng');
  return parts.join(' · ') || 'Không tính điểm';
}

function GuideScreen({ config, onPlay }: { config: CatchConfig; onPlay: () => void }) {
  const usesLives = config.rules.endMode !== 'time';
  const usesTime = config.rules.endMode !== 'lives';
  const rules = [usesTime ? `⏱ ${config.rules.duration} giây` : '', usesLives ? `❤️ ${config.rules.lives} mạng` : '']
    .filter(Boolean)
    .join('   ');
  return (
    <Centered>
      <h2 style={{ margin: 0, fontSize: 28 }}>Cách chơi</h2>
      {config.guide.text && <p style={{ margin: 0, fontSize: 16, whiteSpace: 'pre-line' }}>{config.guide.text}</p>}
      {config.guide.image && (
        <img src={config.guide.image.url} alt="" style={{ maxWidth: '80%', maxHeight: 160, objectFit: 'contain' }} />
      )}
      <div
        style={{
          display: 'grid',
          gap: 8,
          width: '100%',
          maxWidth: 320,
          padding: 12,
          borderRadius: 16,
          background: 'rgba(0,0,0,0.18)',
          textAlign: 'left',
        }}
      >
        {config.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
              <ItemSymbol value={item.symbol} size={36} />
            </span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{itemNote(item, usesLives)}</span>
          </div>
        ))}
      </div>
      {rules && <div style={{ fontSize: 16, fontWeight: 600 }}>{rules}</div>}
      <BigButton config={config} onClick={onPlay}>
        {config.guide.playLabel}
      </BigButton>
    </Centered>
  );
}

interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
  good: boolean;
  born: number;
}

function PlayScene({
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
  const [hud, setHud] = useState({ score: 0, lives: config.rules.lives, time: config.rules.duration, level: 1 });
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);

  const imageUrls = useMemo(
    () =>
      [config.basket.symbol.image?.url, ...config.items.map((i) => i.symbol.image?.url)].filter(
        (u): u is string => Boolean(u),
      ),
    [config.basket.symbol.image?.url, config.items],
  );
  const images = useImages(imageUrls);
  const imagesRef = useRef(images);
  imagesRef.current = images;

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
              text: ev.lostLife && ev.points === 0 ? '-❤️' : `${ev.points > 0 ? '+' : ''}${ev.points}`,
              good: !bad,
              born: performance.now(),
            });
          (bad ? soundsRef.current.bad : soundsRef.current.catch).play();
          host.track('catch', { points: ev.points });
        }
        if ((ev.type === 'catch' || ev.type === 'miss') && ev.lostLife) {
          if (ev.type === 'miss') soundsRef.current.bad.play();
          if (!reducedMotion())
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
          try {
            navigator.vibrate?.(160);
          } catch {
            // Một số trình duyệt không cho rung.
          }
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
      const cv = canvas.current;
      const ctx = cv?.getContext('2d');
      if (!cv || !ctx) return;
      const scale = cv.width / engine.width;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, engine.width, engine.height);
      const c = configRef.current;
      const imgs = imagesRef.current;

      const drawSymbol = (symbol: EmojiOrImage | undefined, x: number, y: number, w: number, h: number) => {
        if (!symbol) return;
        const img = symbol.image ? imgs[symbol.image.url] : undefined;
        if (img && img.naturalWidth > 0) {
          const ratio = Math.min(w / img.naturalWidth, h / img.naturalHeight);
          const dw = img.naturalWidth * ratio;
          const dh = img.naturalHeight * ratio;
          ctx.drawImage(img, x - dw / 2, y - dh / 2, dw, dh);
        } else if (!symbol.image) {
          ctx.font = `${Math.min(w, h) * 0.86}px ${EMOJI_FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(symbol.emoji, x, y + Math.min(w, h) * 0.04);
        }
      };

      const size = engine.itemSize;
      for (const f of engine.falling) drawSymbol(c.items[f.itemIndex]?.symbol, f.x, f.y, size, size);

      const bw = engine.basketWidth;
      const bh = engine.basketHeight;
      drawSymbol(c.basket.symbol, engine.basketX, engine.basketTop + bh / 2, bw, c.basket.symbol.image ? bh : bw);

      // Điểm bay lên.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]!;
        const age = (now - p.born) / 800;
        if (age >= 1) {
          pops.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - age;
        ctx.font = `800 ${Math.round(size * 0.62)}px ${c.look.font.family ? `"${c.look.font.family}",` : ''}sans-serif`;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.fillStyle = p.good ? '#FFFFFF' : '#FF4D4F';
        const y = p.y - 20 - age * 60;
        ctx.strokeText(p.text, p.x, y);
        ctx.fillText(p.text, p.x, y);
        ctx.globalAlpha = 1;
      }
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
  const hudText: CSSProperties = { fontSize: 22, fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.35)' };

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
      <canvas ref={canvas} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
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
        {config.difficulty.mode === 'levels' && <span style={{ ...hudText, fontSize: 16 }}>Màn {hud.level}</span>}
        <span style={{ ...hudText, display: 'flex', gap: 10 }}>
          {usesTime && <span>⏱ {hud.time}s</span>}
          {usesLives && <span style={{ fontFamily: EMOJI_FONT }}>{'❤️'.repeat(Math.max(0, hud.lives)) || '🤍'}</span>}
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

function Confetti({ colors }: { colors: string[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || reducedMotion()) return;
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
    // Chỉ chạy một lần khi mở màn kết thúc.
  }, []);
  return <canvas ref={canvas} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

function EndScreen({
  config,
  result,
  onReplay,
}: {
  config: CatchConfig;
  result: { score: number; best: number | null; newBest: boolean };
  onReplay: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const message = pickEndMessage(config.end.messages, result.score);

  const share = async () => {
    const text = config.end.shareText.replaceAll('{score}', String(result.score));
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: config.content.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`.trim());
      setNote('Đã sao chép link, dán vào Zalo/Facebook để chia sẻ.');
    } catch {
      // Người chơi đóng bảng chia sẻ: không cần báo gì.
    }
  };

  return (
    <>
      <Confetti colors={[config.look.primary, config.look.text, '#FACC15', '#22C55E', '#EC4899']} />
      <Centered>
        <h1 style={{ margin: 0, fontSize: 32 }}>{config.end.title}</h1>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1, textShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
          {result.score}
        </div>
        {config.end.showBest && result.best !== null && (
          <div style={{ fontSize: 16, fontWeight: 600, opacity: 0.95 }}>
            {result.newBest ? '🏆 Kỷ lục mới!' : `🏆 Cao nhất: ${result.best}`}
          </div>
        )}
        {message && <p style={{ margin: 0, fontSize: 18, whiteSpace: 'pre-line' }}>{message}</p>}
        <BigButton config={config} onClick={onReplay}>
          {config.end.replayLabel}
        </BigButton>
        {config.end.ctaEnabled && config.end.ctaUrl && (
          <BigButton
            config={config}
            variant="outline"
            onClick={() => window.open(config.end.ctaUrl, '_blank', 'noopener,noreferrer')}
          >
            {config.end.ctaLabel}
          </BigButton>
        )}
        {config.end.shareEnabled && (
          <BigButton config={config} variant="outline" onClick={() => void share()}>
            Chia sẻ
          </BigButton>
        )}
        {note && <div style={{ fontSize: 14 }}>{note}</div>}
      </Centered>
    </>
  );
}
