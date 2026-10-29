'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { RuntimeProps } from '@opes/module-sdk';
import { useFont, useSound } from '@opes/module-sdk/react';
import type { SampleConfig, SampleItem } from './config';

type Screen = 'intro' | 'play' | 'end';

interface Spawned {
  id: number;
  item: SampleItem;
  x: number;
  y: number;
  bornAt: number;
}

const LIFETIME: Record<SampleConfig['rules']['difficulty'], number> = { easy: 1800, normal: 1300, hard: 900 };
const SPAWN_EVERY: Record<SampleConfig['rules']['difficulty'], number> = { easy: 700, normal: 550, hard: 420 };

function ItemSymbol({ item, size }: { item: SampleItem; size: number }) {
  if (item.symbol.image) {
    return (
      <img src={item.symbol.image.url} alt="" style={{ width: size, height: size, objectFit: 'contain' }} draggable={false} />
    );
  }
  return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{item.symbol.emoji}</span>;
}

export function SampleRuntime({ config, host, initialScreen, muted }: RuntimeProps<SampleConfig>) {
  const fontFamily = useFont(config.look.font);
  const music = useSound(config.sound.music, { muted, loop: true, volume: 0.5 });
  const tap = useSound(config.sound.tap, { muted });

  const [screen, setScreen] = useState<Screen>(
    initialScreen === 'play' || initialScreen === 'end' ? initialScreen : 'intro',
  );
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.rules.duration);
  const [spawned, setSpawned] = useState<Spawned[]>([]);
  const playId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const scoreRef = useRef(0);
  const nextId = useRef(1);

  const start = useCallback(async () => {
    setScore(0);
    scoreRef.current = 0;
    setSpawned([]);
    setTimeLeft(config.rules.duration);
    startedAt.current = Date.now();
    setScreen('play');
    music.play();
    const res = await host.startPlay();
    playId.current = res.playId;
  }, [config.rules.duration, host, music]);

  // Nhảy thẳng vào màn "Đang chơi" từ khung xem trước.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (initialScreen === 'play' && !autoStarted.current) {
      autoStarted.current = true;
      void start();
    }
  }, [initialScreen, start]);

  // Đếm ngược và sinh vật phẩm.
  useEffect(() => {
    if (screen !== 'play') return;
    const { difficulty, duration } = config.rules;
    const items = config.items;
    const tick = setInterval(() => {
      const left = Math.max(0, duration - Math.floor((Date.now() - startedAt.current) / 1000));
      setTimeLeft(left);
      const now = Date.now();
      setSpawned((list) => list.filter((s) => now - s.bornAt < LIFETIME[difficulty]));
      if (left === 0) {
        clearInterval(tick);
        clearInterval(spawn);
        music.stop();
        setScreen('end');
        const id = playId.current;
        if (id) void host.finishPlay(id, { score: scoreRef.current, durationMs: now - startedAt.current });
      }
    }, 100);
    const spawn = setInterval(() => {
      const item = items[Math.floor(Math.random() * items.length)];
      if (!item) return;
      setSpawned((list) => [
        ...list,
        { id: nextId.current++, item, x: 8 + Math.random() * 76, y: 18 + Math.random() * 66, bornAt: Date.now() },
      ]);
    }, SPAWN_EVERY[difficulty]);
    return () => {
      clearInterval(tick);
      clearInterval(spawn);
    };
  }, [screen, config.rules, config.items, host, music]);

  useEffect(() => () => music.stop(), [music]);

  const hit = (s: Spawned) => {
    setSpawned((list) => list.filter((x) => x.id !== s.id));
    scoreRef.current += s.item.points;
    setScore(scoreRef.current);
    tap.play();
    host.track('item_tap', { points: s.item.points });
  };

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
    WebkitTapHighlightColor: 'transparent',
  };
  const center: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    textAlign: 'center',
  };
  const button: CSSProperties = {
    marginTop: 8,
    padding: '14px 36px',
    border: 'none',
    borderRadius: 999,
    background: config.look.primary,
    color: '#fff',
    fontFamily,
    fontSize: 20,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 6px 0 rgba(0,0,0,0.25)',
  };

  return (
    <div style={root}>
      {screen === 'intro' && (
        <div style={center}>
          {config.content.logo && (
                  <img src={config.content.logo.url} alt="" style={{ maxWidth: '60%', maxHeight: 120, objectFit: 'contain' }} />
          )}
          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.15 }}>{config.content.title}</h1>
          {config.content.intro && <p style={{ margin: 0, fontSize: 16, opacity: 0.9, whiteSpace: 'pre-line' }}>{config.content.intro}</p>}
          <button type="button" style={button} onClick={() => void start()}>
            {config.content.startLabel}
          </button>
        </div>
      )}

      {screen === 'play' && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              padding: '14px 18px',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            <span>⭐ {score}</span>
            {config.rules.showTimer && <span>⏱ {timeLeft}s</span>}
          </div>
          {spawned.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${s.item.points} điểm`}
              onPointerDown={() => hit(s)}
              style={{
                position: 'absolute',
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: 64,
                height: 64,
                marginLeft: -32,
                marginTop: -32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              <ItemSymbol item={s.item} size={56} />
            </button>
          ))}
        </>
      )}

      {screen === 'end' && (
        <div style={center}>
          <h1 style={{ margin: 0, fontSize: 32 }}>{config.end.title}</h1>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{score}</div>
          {config.end.message && (
            <p style={{ margin: 0, fontSize: 18, whiteSpace: 'pre-line' }}>
              {config.end.message.replaceAll('{score}', String(score))}
            </p>
          )}
          <button type="button" style={button} onClick={() => void start()}>
            {config.end.replayLabel}
          </button>
        </div>
      )}
    </div>
  );
}
