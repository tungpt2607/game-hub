'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { RuntimeProps } from '@opes/module-sdk';
import { useFont, useSound, type Sound, vibrate } from '@opes/module-sdk/react';
import { DESIGN_H, DESIGN_W, type CatchQuizConfig } from './config';
import { CatchQuizEngine, pickQuestionIndex, shuffled } from './engine';
import { Sym } from './ui';
import { ItemLayer } from './ItemLayer';
import { useStageScale } from './useStageScale';
import { CSS } from './styles';
import { Hud } from './Hud';
import { QuestionOverlay, type ShownQuestion } from './QuestionOverlay';
import { ContinueScreen, CountdownScreen, EndScreen, StartScreen } from './screens';

type Screen = 'start' | 'countdown' | 'play' | 'hurt' | 'question' | 'continue' | 'end';

interface Sounds {
  music: Sound;
  catch: Sound;
  bad: Sound;
  correct: Sound;
  wrong: Sound;
  end: Sound;
}

export function CatchQuizRuntime({
  config,
  host,
  initialScreen,
  muted,
}: RuntimeProps<CatchQuizConfig>) {
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
  const [hud, setHud] = useState({
    score: 0,
    time: config.rules.duration,
    lives: config.rules.lives,
  });
  const [count, setCount] = useState<string>('');
  const [hit, setHit] = useState(0);
  const [question, setQuestion] = useState<ShownQuestion | null>(null);
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
      return prev.score === next.score && prev.time === next.time && prev.lives === next.lives
        ? prev
        : next;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi mở module (đổi màn hình thì khung xem trước tạo lại module).
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
            vibrate(160);
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
      if (catcherEl.current)
        catcherEl.current.style.transform = `translateX(${e.catcherX - configRef.current.catcher.width / 2}px)`;
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
    if (catcherEl.current)
      catcherEl.current.style.transform = `translateX(${e.catcherX - config.catcher.width / 2}px)`;
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
  const showCatcher = screen !== 'end' && screen !== 'start';
  const catcherSymbol =
    screen === 'hurt' || screen === 'question' ? c.catcher.hurt : c.catcher.normal;

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
          backgroundImage: c.look.backgroundImage
            ? `url(${JSON.stringify(c.look.backgroundImage.url)})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        {/* HUD */}
        {screen !== 'start' && screen !== 'end' && (
          <Hud config={c} hud={hud} numberFont={numberFont} />
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
              <Sym
                value={catcherSymbol}
                size="100%"
                style={catcherSymbol.image ? undefined : { fontSize: c.catcher.height * 0.8 }}
              />
            </div>
          </div>
        )}

        {screen === 'start' && <StartScreen config={c} onStart={begin} />}

        {screen === 'countdown' && (
          <CountdownScreen config={c} count={count} numberFont={numberFont} />
        )}

        {screen === 'continue' && <ContinueScreen config={c} onContinue={resume} />}

        {screen === 'question' && question && (
          <QuestionOverlay config={c} question={question} picked={picked} onAnswer={answer} />
        )}

        {screen === 'end' && (
          <EndScreen config={c} score={hud.score} numberFont={numberFont} onReplay={begin} />
        )}
      </div>
    </div>
  );
}
