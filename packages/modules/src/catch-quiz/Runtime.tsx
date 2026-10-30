'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import type { EmojiOrImage, MediaRef, RuntimeProps } from '@opes/module-sdk';
import { useFont, useSound, type Sound } from '@opes/module-sdk/react';
import { DESIGN_H, DESIGN_W, type CatchQuizConfig, type Question } from './config';
import { CatchQuizEngine, pickQuestionIndex, shuffled } from './engine';

type Screen = 'start' | 'countdown' | 'play' | 'hurt' | 'question' | 'continue' | 'end';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const CSS = `
.ocq-item { position:absolute; left:0; top:0; display:flex; align-items:center; justify-content:center;
  border-radius:50%; background:#FFFFFF1A; pointer-events:none; will-change:transform; }
.ocq-item > .ocq-pulse { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
.ocq-item.pulse > .ocq-pulse { animation: ocq-pulse 1.1s ease-in-out infinite; }
.ocq-item img { width:100%; height:100%; object-fit:contain; display:block; pointer-events:none; }
@keyframes ocq-pulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.09) } }
@keyframes ocq-hit { 0%,100% { transform:rotate(0) } 25% { transform:rotate(-8deg) translateY(2px) } 75% { transform:rotate(8deg) translateY(2px) } }
@keyframes ocq-blink { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.45; transform:scale(1.12) } }
@keyframes ocq-pop { from { transform:scale(1.25); opacity:.4 } to { transform:scale(1); opacity:1 } }
@keyframes ocq-fade { from { opacity:0 } to { opacity:1 } }
@media (prefers-reduced-motion: reduce) { .ocq-item > .ocq-pulse, .ocq-anim { animation:none !important } }
`;

function Sym({ value, size, style }: { value: EmojiOrImage; size: number | string; style?: CSSProperties }) {
  if (value.image)
    return (
      <img
        src={value.image.url}
        alt=""
        draggable={false}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block', ...style }}
      />
    );
  return (
    <span style={{ fontSize: typeof size === 'number' ? size * 0.8 : size, lineHeight: 1, fontFamily: EMOJI_FONT, ...style }}>
      {value.emoji}
    </span>
  );
}

/** Ô có ảnh khung (nếu có), nội dung đặt trong vùng `inset` (%). Không có ảnh thì dùng khung bo tròn. */
function Board({
  image,
  width,
  height,
  inset,
  children,
  style,
}: {
  image: MediaRef | null;
  width: number;
  height: number;
  inset: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: 'relative', width, height, ...style }}>
      {image ? (
        <img src={image.url} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: '6%',
            borderRadius: 999,
            background: 'rgba(8,16,38,0.75)',
            border: '6px solid rgba(255,255,255,0.85)',
          }}
        />
      )}
      <div style={{ position: 'absolute', inset, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 15 }}>
        {children}
      </div>
    </div>
  );
}

/** Lớp vật phẩm: phần tử DOM cập nhật trực tiếp mỗi khung hình (không qua React cho nhẹ). */
class ItemLayer {
  private nodes = new Map<number, HTMLDivElement>();
  constructor(private root: HTMLDivElement) {}

  sync(engine: CatchQuizEngine, config: CatchQuizConfig) {
    const size = engine.itemSize;
    const alive = new Set<number>();
    for (const it of engine.items) {
      alive.add(it.id);
      let node = this.nodes.get(it.id);
      if (!node) {
        const group = config.groups[it.group];
        const symbol = group?.symbols[it.symbol]?.symbol ?? group?.symbols[0]?.symbol;
        node = document.createElement('div');
        node.className = `ocq-item${group?.pulse ? ' pulse' : ''}`;
        node.style.width = `${size}px`;
        node.style.height = `${size}px`;
        const glow = group?.glow ?? '#FFFFFF00';
        node.style.boxShadow = `0 2px 24px 0 ${glow} inset, 0 0 18px 0 ${glow}`;
        const inner = document.createElement('div');
        inner.className = 'ocq-pulse';
        if (symbol?.image) {
          const img = document.createElement('img');
          img.src = symbol.image.url;
          img.alt = '';
          img.draggable = false;
          inner.appendChild(img);
        } else {
          const span = document.createElement('span');
          span.textContent = symbol?.emoji ?? '⭐';
          span.style.fontSize = `${size * 0.7}px`;
          span.style.lineHeight = '1';
          span.style.fontFamily = EMOJI_FONT;
          inner.appendChild(span);
        }
        node.appendChild(inner);
        this.root.appendChild(node);
        this.nodes.set(it.id, node);
      }
      node.style.transform = `translate(${it.x}px, ${it.y}px)`;
    }
    for (const [id, node] of this.nodes) {
      if (!alive.has(id)) {
        node.remove();
        this.nodes.delete(id);
      }
    }
  }

  clear() {
    for (const node of this.nodes.values()) node.remove();
    this.nodes.clear();
  }
}

function useStageScale(ref: RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setScale(Math.min(width / DESIGN_W, height / DESIGN_H));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return scale;
}

interface Sounds {
  music: Sound;
  catch: Sound;
  bad: Sound;
  correct: Sound;
  wrong: Sound;
  end: Sound;
}

export function CatchQuizRuntime({ config, host, initialScreen, muted }: RuntimeProps<CatchQuizConfig>) {
  const font = useFont(config.look.font);
  const numberFont = useFont(config.look.numberFont);
  const sounds: Sounds = {
    music: useSound(config.sound.music, { muted, loop: true, volume: 0.45 }),
    catch: useSound(config.sound.catch, { muted }),
    bad: useSound(config.sound.bad, { muted }),
    correct: useSound(config.sound.correct, { muted }),
    wrong: useSound(config.sound.wrong, { muted }),
    end: useSound(config.sound.end, { muted }),
  };
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const configRef = useRef(config);
  configRef.current = config;

  const outer = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const catcherEl = useRef<HTMLDivElement>(null);
  const scale = useStageScale(outer);

  const engineRef = useRef<CatchQuizEngine | null>(null);
  const layerRef = useRef<ItemLayer | null>(null);
  const [screen, setScreen] = useState<Screen>('start');
  const screenRef = useRef<Screen>('start');
  screenRef.current = screen;
  const [hud, setHud] = useState({ score: 0, time: config.rules.duration, lives: config.rules.lives });
  const [count, setCount] = useState<string>('');
  const [hit, setHit] = useState(0);
  const [question, setQuestion] = useState<{ q: Question; order: number[] } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const usedQuestions = useRef<number[]>([]);
  const playId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const syncHud = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    setHud((prev) => {
      const next = { score: e.score, time: Math.ceil(e.timeLeft), lives: e.lives };
      return prev.score === next.score && prev.time === next.time && prev.lives === next.lives ? prev : next;
    });
  }, []);

  const newEngine = useCallback(() => {
    const c = configRef.current;
    const engine = new CatchQuizEngine({
      groups: c.groups,
      rules: c.rules,
      phases: c.phases,
      catcher: c.catcher,
      quiz: c.quiz,
    });
    engineRef.current = engine;
    layerRef.current?.clear();
    usedQuestions.current = [];
    syncHud();
    return engine;
  }, [syncHud]);

  /** Đếm ngược trên bảng rồi gọi `done`. */
  const countdown = useCallback((from: number, endText: string, done: () => void) => {
    const step = (n: number) => {
      if (n > 0) {
        setCount(String(n));
        later(() => step(n - 1), 1000);
        return;
      }
      if (endText) {
        setCount(endText);
        later(() => {
          setCount('');
          done();
        }, 600);
      } else {
        setCount('');
        done();
      }
    };
    step(from);
  }, []);

  const finish = useCallback(() => {
    const e = engineRef.current;
    clearTimers();
    soundsRef.current.music.stop();
    soundsRef.current.end.play();
    setScreen('end');
    if (e && playId.current) {
      void host.finishPlay(playId.current, {
        score: e.score,
        durationMs: Date.now() - startedAt.current,
        data: { caught: e.caught, questions: e.questionsAsked, lives: e.lives },
      });
    }
  }, [host]);

  const begin = useCallback(() => {
    clearTimers();
    const c = configRef.current;
    newEngine();
    setQuestion(null);
    setPicked(null);
    startedAt.current = Date.now();
    soundsRef.current.music.play();
    void host.startPlay().then((r) => {
      playId.current = r.playId;
    });
    if (c.rules.countdown) {
      setScreen('countdown');
      countdown(c.rules.countdownFrom, c.rules.startText, () => {
        engineRef.current?.start(true);
        setScreen('play');
      });
    } else {
      engineRef.current?.start(true);
      setScreen('play');
    }
  }, [countdown, host, newEngine]);

  const showQuestion = useCallback(() => {
    const qs = configRef.current.quiz.questions;
    const idx = pickQuestionIndex(qs.length, usedQuestions.current);
    if (usedQuestions.current.length >= qs.length) usedQuestions.current = [];
    usedQuestions.current.push(idx);
    const q = qs[idx]!;
    const order = q.answers.map((_, i) => i);
    setQuestion({ q, order: configRef.current.quiz.shuffleAnswers ? shuffled(order) : order });
    setPicked(null);
    setScreen('question');
  }, []);

  // Màn mở đầu và nhảy màn hình từ khung xem trước.
  useEffect(() => {
    const c = configRef.current;
    if (initialScreen === 'play') {
      begin();
    } else if (initialScreen === 'question') {
      newEngine().start(true);
      engineRef.current!.paused = true;
      if (c.quiz.questions.length) showQuestion();
    } else if (initialScreen === 'end') {
      newEngine();
      setScreen('end');
    } else if (c.start.enabled) {
      newEngine();
      setScreen('start');
    } else {
      begin();
    }
    return () => {
      clearTimers();
      soundsRef.current.music.stop();
    };
    // Chỉ chạy khi mở module (đổi màn hình thì khung xem trước tạo lại module).
  }, []);

  // Vòng lặp chính.
  useEffect(() => {
    if (screen !== 'play') return;
    const root = field.current;
    if (root && !layerRef.current) layerRef.current = new ItemLayer(root);
    let raf = 0;
    let last = performance.now();
    const keys = { left: false, right: false };
    const onKey = (e: KeyboardEvent) => {
      const down = e.type === 'keydown';
      if (e.key === 'ArrowLeft') keys.left = down;
      else if (e.key === 'ArrowRight') keys.right = down;
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    const loop = (now: number) => {
      const e = engineRef.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!e) return;
      if (keys.left !== keys.right) e.nudge(keys.left ? -1 : 1, dt);
      const events = e.step(dt);
      let stop = false;
      for (const ev of events) {
        if (ev.type === 'catch') {
          if (ev.effect === 'score') soundsRef.current.catch.play();
          else {
            soundsRef.current.bad.play();
            setHit((h) => h + 1);
            try {
              navigator.vibrate?.(160);
            } catch {
              // Không rung được thì thôi.
            }
          }
          host.track('catch', { group: ev.group, points: ev.points });
        }
        if (ev.type === 'question') {
          stop = true;
          setScreen('hurt');
          later(showQuestion, configRef.current.quiz.hurtSeconds * 1000);
        }
        if (ev.type === 'end') {
          stop = true;
          finish();
        }
      }
      if (catcherEl.current) catcherEl.current.style.transform = `translateX(${e.catcherX - configRef.current.catcher.width / 2}px)`;
      layerRef.current?.sync(e, configRef.current);
      syncHud();
      if (!stop) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [screen, finish, host, showQuestion, syncHud]);

  // Vẽ lại vật phẩm khi đang dừng (để vẫn thấy chúng sau câu hỏi).
  useEffect(() => {
    const e = engineRef.current;
    if (!e || !field.current) return;
    if (!layerRef.current) layerRef.current = new ItemLayer(field.current);
    layerRef.current.sync(e, configRef.current);
    if (catcherEl.current) catcherEl.current.style.transform = `translateX(${e.catcherX - config.catcher.width / 2}px)`;
  }, [screen, config.catcher.width]);

  const answer = (choice: number) => {
    if (picked !== null || !question) return;
    setPicked(choice);
    const correct = question.q.answers[choice]?.correct === true;
    const e = engineRef.current;
    const ended = e ? e.answer(correct) : false;
    syncHud();
    (correct ? soundsRef.current.correct : soundsRef.current.wrong).play();
    later(
      () => {
        setQuestion(null);
        if (ended) finish();
        else setScreen('continue');
      },
      correct ? 600 : 2000,
    );
  };

  const resume = () => {
    const c = configRef.current;
    const go = () => {
      engineRef.current?.resume();
      setScreen('play');
    };
    if (c.quiz.continueCountdown) {
      setScreen('countdown');
      countdown(3, '', go);
    } else go();
  };

  const pointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (screenRef.current !== 'play' || !scale) return;
    const el = e.currentTarget;
    if (e.type === 'pointerdown') el.setPointerCapture?.(e.pointerId);
    const rect = el.getBoundingClientRect();
    engineRef.current?.setCatcher((e.clientX - rect.left) / scale);
  };

  const c = config;
  const timeWarn = hud.time <= c.hud.timerWarnAt && screen !== 'start';
  const livesWarn = hud.lives <= 1;
  const tint = c.look.overlayTint;
  const overlay: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 32,
    background: tint,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    animation: 'ocq-fade .35s ease',
  };
  const button: CSSProperties = {
    border: '4px solid #fff',
    borderRadius: 130,
    padding: '16px 48px',
    fontFamily: 'inherit',
    fontSize: 45,
    fontWeight: 800,
    cursor: 'pointer',
    background: `linear-gradient(126deg, ${c.look.buttonFrom} 14%, ${c.look.buttonTo} 86%)`,
    color: c.look.buttonText,
    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
  };
  const number: CSSProperties = { fontFamily: numberFont, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' };
  const showCatcher = screen !== 'end' && screen !== 'start';
  const catcherSymbol = screen === 'hurt' || screen === 'question' ? c.catcher.hurt : c.catcher.normal;

  const ctaHref = useMemo(() => {
    if (!c.end.ctaUrl) return '';
    if (!c.end.ctaAppendScore) return c.end.ctaUrl;
    try {
      const url = new URL(c.end.ctaUrl);
      url.searchParams.set('score', String(hud.score));
      return url.toString();
    } catch {
      return c.end.ctaUrl;
    }
  }, [c.end.ctaUrl, c.end.ctaAppendScore, hud.score]);

  return (
    <div
      ref={outer}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: c.look.background,
        fontFamily: font,
        color: c.look.text,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <style>{CSS}</style>
      <div
        onPointerDown={pointer}
        onPointerMove={pointer}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          backgroundImage: c.look.backgroundImage ? `url(${JSON.stringify(c.look.backgroundImage.url)})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        {/* HUD */}
        {screen !== 'start' && screen !== 'end' && (
          <div
            style={{
              position: 'absolute',
              top: 178,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 66px',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <Board image={c.hud.timerBoard} width={270} height={115} inset="8.98% 9.68% 20.82% 6.87%">
              {c.hud.timerIcon && <img src={c.hud.timerIcon.url} alt="" style={{ width: 52, height: 52 }} />}
              <span style={{ ...number, fontSize: 50, color: timeWarn ? c.hud.warnColor : '#fff' }}>{hud.time}</span>
            </Board>
            <Board image={c.hud.scoreBoard} width={273} height={169} inset="27.04% 15.38% 27.89% 12.59%">
              <span style={{ ...number, fontSize: 55 }}>{hud.score}</span>
            </Board>
            <Board image={c.hud.timerBoard} width={270} height={115} inset="8.98% 9.68% 20.82% 6.87%">
              <span
                className="ocq-anim"
                style={{ display: 'flex', gap: 10, animation: livesWarn ? 'ocq-blink .8s ease-in-out infinite' : undefined }}
              >
                {Array.from({ length: Math.max(0, hud.lives) }, (_, i) => (
                  <Sym key={i} value={c.hud.heart} size={52} />
                ))}
              </span>
            </Board>
          </div>
        )}

        <div ref={field} style={{ position: 'absolute', inset: 0 }} />

        {showCatcher && (
          <div
            ref={catcherEl}
            style={{
              position: 'absolute',
              left: 0,
              bottom: c.catcher.bottom,
              width: c.catcher.width,
              height: c.catcher.height,
              zIndex: 10,
              willChange: 'transform',
              transform: `translateX(${(engineRef.current?.catcherX ?? DESIGN_W / 2) - c.catcher.width / 2}px)`,
            }}
          >
            <div
              key={hit}
              className="ocq-anim"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: hit ? 'ocq-hit .35s ease' : undefined,
                filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.45))',
              }}
            >
              <Sym value={catcherSymbol} size="100%" style={catcherSymbol.image ? undefined : { fontSize: c.catcher.height * 0.8 }} />
            </div>
          </div>
        )}

        {screen === 'start' && (
          <div style={{ ...overlay, gap: 48 }}>
            {c.start.logo && <img src={c.start.logo.url} alt="" style={{ maxWidth: 600, maxHeight: 300, objectFit: 'contain' }} />}
            {c.start.title && <h1 style={{ margin: 0, fontSize: 84, fontWeight: 800, lineHeight: 1.15 }}>{c.start.title}</h1>}
            {c.start.text && (
              <p style={{ margin: 0, fontSize: 44, fontWeight: 600, lineHeight: 1.4, whiteSpace: 'pre-line', maxWidth: 900 }}>
                {c.start.text}
              </p>
            )}
            <button type="button" style={button} onClick={begin}>
              {c.start.buttonLabel}
            </button>
          </div>
        )}

        {screen === 'countdown' && (
          <div style={{ ...overlay, zIndex: 70 }}>
            <Board image={c.hud.timerBoard} width={460} height={196} inset="0 0 9% 0">
              <span
                key={count}
                className="ocq-anim"
                style={{
                  ...(Number.isNaN(Number(count)) ? { fontWeight: 800, letterSpacing: 4, color: '#fff' } : number),
                  fontSize: 52,
                  animation: 'ocq-pop .3s ease',
                }}
              >
                {count}
              </span>
            </Board>
          </div>
        )}

        {screen === 'continue' && (
          <div style={{ ...overlay, zIndex: 70 }}>
            <button
              type="button"
              onClick={resume}
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Board image={c.hud.timerBoard} width={460} height={196} inset="0 0 9% 0">
                <span style={{ fontSize: 52, fontWeight: 700, color: '#fff' }}>{c.quiz.continueLabel}</span>
              </Board>
            </button>
          </div>
        )}

        {screen === 'question' && question && (
          <div style={{ ...overlay, zIndex: 70, padding: '28px 24px' }}>
            <div
              style={{
                width: 935,
                height: 1169,
                background: c.quiz.card
                  ? `url(${JSON.stringify(c.quiz.card.url)}) center / 100% 100% no-repeat`
                  : 'rgba(8,16,38,0.92)',
                borderRadius: c.quiz.card ? 0 : 60,
                border: c.quiz.card ? 'none' : '6px solid #fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20% 18% 11%',
                overflow: 'hidden',
              }}
            >
              <h1 style={{ fontSize: 48, fontWeight: 600, color: '#fff', margin: '0 0 60px', maxWidth: '100%' }}>{question.q.text}</h1>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', overflowY: 'auto', padding: '0 7px' }}>
                {question.order.map((ai, i) => {
                  const a = question.q.answers[ai]!;
                  const showCorrect = picked !== null && a.correct;
                  const showWrong = picked === ai && !a.correct;
                  const dim = picked !== null && !showCorrect && !showWrong;
                  return (
                    <button
                      key={ai}
                      type="button"
                      onClick={() => answer(ai)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 30,
                        width: '100%',
                        minHeight: 103,
                        padding: 0,
                        border: showCorrect || showWrong ? `7px solid ${showWrong ? '#2B2F76' : '#fff'}` : '3px solid #fff',
                        borderRadius: 1000,
                        fontFamily: 'inherit',
                        fontSize: 30,
                        fontWeight: 700,
                        cursor: picked === null ? 'pointer' : 'default',
                        background: showCorrect
                          ? 'linear-gradient(126deg, #1E76BF 14%, #06B4B9 86%)'
                          : showWrong
                            ? '#ABABAB'
                            : '#fff',
                        color: showCorrect || showWrong ? '#fff' : '#2B2F76',
                        marginBottom: 20,
                        textAlign: 'start',
                        opacity: dim ? 0.5 : 1,
                        transition: 'background .2s ease, opacity .2s ease',
                      }}
                    >
                      <span
                        style={{
                          flex: '0 0 auto',
                          width: 103,
                          alignSelf: 'stretch',
                          borderRadius: 1000,
                          background: showCorrect
                            ? 'linear-gradient(126deg, #1E76BF 14%, #06B4B9 86%)'
                            : showWrong
                              ? '#ABABAB'
                              : `linear-gradient(126deg, ${c.look.buttonFrom} 14%, ${c.look.buttonTo} 86%)`,
                          color: '#fff',
                          fontSize: 48,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `4px solid ${showWrong ? '#2B2F76' : '#fff'}`,
                          margin: '-3px 0 -3px -3px',
                        }}
                      >
                        {showCorrect ? '✓' : showWrong ? '✕' : String.fromCharCode(65 + i)}
                      </span>
                      <span style={{ padding: '16px 24px 16px 0' }}>{a.text.trim()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {screen === 'end' && (
          <div style={{ ...overlay, zIndex: 60 }}>
            {c.end.title && (
              <p style={{ fontWeight: 600, fontSize: 48, margin: '0 0 80px', whiteSpace: 'pre-line' }}>
                {c.end.title.replaceAll('{score}', String(hud.score))}
              </p>
            )}
            <Board image={c.hud.scoreBoard} width={641} height={398} inset="27.04% 15.38% 27.89% 12.59%">
              <span style={{ ...number, fontSize: 135, fontWeight: 800 }}>{hud.score}</span>
            </Board>
            <div style={{ width: 800, height: 598, maxWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sym
                value={c.end.mascot}
                size="100%"
                style={c.end.mascot.image ? { filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.25))' } : { fontSize: 300 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>
              {c.end.ctaEnabled && ctaHref && (
                <button type="button" style={button} onClick={() => window.open(ctaHref, '_blank', 'noopener,noreferrer')}>
                  {c.end.ctaLabel}
                </button>
              )}
              {c.end.replayEnabled && (
                <button
                  type="button"
                  style={{ ...button, background: 'transparent', boxShadow: 'none', fontSize: 38, padding: '12px 40px' }}
                  onClick={begin}
                >
                  {c.end.replayLabel}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

