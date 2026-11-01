import type { CatchQuizConfig } from './config';
import { numberStyle } from './styles';
import { Board, Sym } from './ui';

export interface HudState {
  score: number;
  time: number;
  lives: number;
}

/** Bảng thời gian, điểm và mạng phía trên màn chơi. */
export function Hud({
  config: c,
  hud,
  numberFont,
}: {
  config: CatchQuizConfig;
  hud: HudState;
  numberFont: string;
}) {
  const number = numberStyle(numberFont);
  const timeWarn = hud.time <= c.hud.timerWarnAt;
  const livesWarn = hud.lives <= 1;
  return (
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
        {c.hud.timerIcon && (
          <img src={c.hud.timerIcon.url} alt="" style={{ width: 52, height: 52 }} />
        )}
        <span style={{ ...number, fontSize: 50, color: timeWarn ? c.hud.warnColor : '#fff' }}>
          {hud.time}
        </span>
      </Board>
      <Board image={c.hud.scoreBoard} width={273} height={169} inset="27.04% 15.38% 27.89% 12.59%">
        <span style={{ ...number, fontSize: 55 }}>{hud.score}</span>
      </Board>
      <Board image={c.hud.timerBoard} width={270} height={115} inset="8.98% 9.68% 20.82% 6.87%">
        <span
          className="ocq-anim"
          style={{
            display: 'flex',
            gap: 10,
            animation: livesWarn ? 'ocq-blink .8s ease-in-out infinite' : undefined,
          }}
        >
          {Array.from({ length: Math.max(0, hud.lives) }, (_, i) => (
            <Sym key={i} value={c.hud.heart} size={52} />
          ))}
        </span>
      </Board>
    </div>
  );
}
