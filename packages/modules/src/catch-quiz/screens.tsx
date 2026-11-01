import { useMemo } from 'react';
import type { CatchQuizConfig } from './config';
import { buttonStyle, numberStyle, overlayStyle } from './styles';
import { Board, Sym } from './ui';

/** Màn mở đầu: logo, tiêu đề, lời giới thiệu, nút bắt đầu. */
export function StartScreen({
  config: c,
  onStart,
}: {
  config: CatchQuizConfig;
  onStart: () => void;
}) {
  const overlay = overlayStyle(c.look.overlayTint);
  const button = buttonStyle(c.look);
  return (
    <div style={{ ...overlay, gap: 48 }}>
      {c.start.logo && (
        <img
          src={c.start.logo.url}
          alt=""
          style={{ maxWidth: 600, maxHeight: 300, objectFit: 'contain' }}
        />
      )}
      {c.start.title && (
        <h1 style={{ margin: 0, fontSize: 84, fontWeight: 800, lineHeight: 1.15 }}>
          {c.start.title}
        </h1>
      )}
      {c.start.text && (
        <p
          style={{
            margin: 0,
            fontSize: 44,
            fontWeight: 600,
            lineHeight: 1.4,
            whiteSpace: 'pre-line',
            maxWidth: 900,
          }}
        >
          {c.start.text}
        </p>
      )}
      <button type="button" style={button} onClick={onStart}>
        {c.start.buttonLabel}
      </button>
    </div>
  );
}

/** Đếm ngược trước khi chơi hoặc chơi tiếp. */
export function CountdownScreen({
  config: c,
  count,
  numberFont,
}: {
  config: CatchQuizConfig;
  count: string;
  numberFont: string;
}) {
  const overlay = overlayStyle(c.look.overlayTint);
  const number = numberStyle(numberFont);
  return (
    <div style={{ ...overlay, zIndex: 70 }}>
      <Board image={c.hud.timerBoard} width={460} height={196} inset="0 0 9% 0">
        <span
          key={count}
          className="ocq-anim"
          style={{
            ...(Number.isNaN(Number(count))
              ? { fontWeight: 800, letterSpacing: 4, color: '#fff' }
              : number),
            fontSize: 52,
            animation: 'ocq-pop .3s ease',
          }}
        >
          {count}
        </span>
      </Board>
    </div>
  );
}

/** Chờ người chơi bấm "Tiếp tục" sau câu hỏi. */
export function ContinueScreen({
  config: c,
  onContinue,
}: {
  config: CatchQuizConfig;
  onContinue: () => void;
}) {
  const overlay = overlayStyle(c.look.overlayTint);
  return (
    <div style={{ ...overlay, zIndex: 70 }}>
      <button
        type="button"
        onClick={onContinue}
        style={{
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <Board image={c.hud.timerBoard} width={460} height={196} inset="0 0 9% 0">
          <span style={{ fontSize: 52, fontWeight: 700, color: '#fff' }}>
            {c.quiz.continueLabel}
          </span>
        </Board>
      </button>
    </div>
  );
}

/** Màn kết thúc: điểm, linh vật, nút hành động và chơi lại. */
export function EndScreen({
  config: c,
  score,
  numberFont,
  onReplay,
}: {
  config: CatchQuizConfig;
  score: number;
  numberFont: string;
  onReplay: () => void;
}) {
  const overlay = overlayStyle(c.look.overlayTint);
  const button = buttonStyle(c.look);
  const number = numberStyle(numberFont);
  const ctaHref = useMemo(() => {
    if (!c.end.ctaUrl) return '';
    if (!c.end.ctaAppendScore) return c.end.ctaUrl;
    try {
      const url = new URL(c.end.ctaUrl);
      url.searchParams.set('score', String(score));
      return url.toString();
    } catch {
      return c.end.ctaUrl;
    }
  }, [c.end.ctaUrl, c.end.ctaAppendScore, score]);
  return (
    <div style={{ ...overlay, zIndex: 60 }}>
      {c.end.title && (
        <p
          style={{
            fontWeight: 600,
            fontSize: 48,
            margin: '0 0 80px',
            whiteSpace: 'pre-line',
          }}
        >
          {c.end.title.replaceAll('{score}', String(score))}
        </p>
      )}
      <Board image={c.hud.scoreBoard} width={641} height={398} inset="27.04% 15.38% 27.89% 12.59%">
        <span style={{ ...number, fontSize: 135, fontWeight: 800 }}>{score}</span>
      </Board>
      <div
        style={{
          width: 800,
          height: 598,
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Sym
          value={c.end.mascot}
          size="100%"
          style={
            c.end.mascot.image
              ? { filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.25))' }
              : { fontSize: 300 }
          }
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center' }}>
        {c.end.ctaEnabled && ctaHref && (
          <button
            type="button"
            style={button}
            onClick={() => window.open(ctaHref, '_blank', 'noopener,noreferrer')}
          >
            {c.end.ctaLabel}
          </button>
        )}
        {c.end.replayEnabled && (
          <button
            type="button"
            style={{
              ...button,
              background: 'transparent',
              boxShadow: 'none',
              fontSize: 38,
              padding: '12px 40px',
            }}
            onClick={onReplay}
          >
            {c.end.replayLabel}
          </button>
        )}
      </div>
    </div>
  );
}
