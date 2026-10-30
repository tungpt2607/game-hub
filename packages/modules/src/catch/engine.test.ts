import { describe, expect, it } from 'vitest';
import { catchDefaults } from './config';
import { CatchEngine, pickEndMessage, seededRandom, type EngineOptions } from './engine';

const base = (over: Partial<EngineOptions> = {}): EngineOptions => ({
  width: 400,
  height: 800,
  items: [{ points: 2, weight: 1, loseLifeOnCatch: false, loseLifeOnMiss: false }],
  basketSize: 'medium',
  endMode: 'time',
  duration: 30,
  lives: 3,
  difficulty: { ...catchDefaults.difficulty, mode: 'ramp', rampSeconds: 10 },
  rng: seededRandom(1),
  ...over,
});

/** Chạy tới khi có vật phẩm đầu tiên, đặt nó ngay trên giỏ hoặc lệch hẳn khỏi giỏ. */
function dropOne(engine: CatchEngine, onBasket: boolean) {
  while (engine.falling.length === 0) engine.step(0.01);
  const f = engine.falling[0]!;
  engine.falling = [f];
  f.x = onBasket ? engine.basketX : engine.basketX > 200 ? 20 : 380;
  f.y = engine.basketTop - engine.itemSize; // ngay trên miệng giỏ
  return f;
}

describe('CatchEngine', () => {
  it('hứng được vật phẩm rơi vào giỏ thì cộng điểm', () => {
    const e = new CatchEngine(base());
    dropOne(e, true);
    const events = e.step(0.5);
    expect(events.some((ev) => ev.type === 'catch')).toBe(true);
    expect(e.score).toBe(2);
    expect(e.caught).toBe(1);
  });

  it('vật phẩm rơi ngoài giỏ thì tính là để rơi', () => {
    const e = new CatchEngine(base({ difficulty: { ...catchDefaults.difficulty, spawnStart: 0.2, spawnEnd: 0.2 } }));
    const f = dropOne(e, false);
    let missed = false;
    for (let i = 0; i < 200 && !missed; i++) missed = e.step(0.05).some((ev) => ev.type === 'miss' && ev.x === f.x);
    expect(missed).toBe(true);
    expect(e.score).toBe(0);
  });

  it('hứng vật xấu thì mất mạng và hết mạng thì kết thúc', () => {
    const e = new CatchEngine(
      base({
        endMode: 'lives',
        lives: 1,
        items: [{ points: 0, weight: 1, loseLifeOnCatch: true, loseLifeOnMiss: false }],
      }),
    );
    dropOne(e, true);
    const events = e.step(0.5);
    expect(e.lives).toBe(0);
    expect(e.over).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'end', reason: 'lives' });
  });

  it('chế độ chỉ tính giờ thì không mất mạng', () => {
    const e = new CatchEngine(
      base({ endMode: 'time', items: [{ points: 0, weight: 1, loseLifeOnCatch: true, loseLifeOnMiss: true }] }),
    );
    dropOne(e, true);
    e.step(0.5);
    expect(e.lives).toBe(3);
    expect(e.over).toBe(false);
  });

  it('hết giờ thì kết thúc', () => {
    const e = new CatchEngine(base({ duration: 2 }));
    const events = e.step(2.1);
    expect(e.over).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'end', reason: 'time' });
    expect(e.timeLeft).toBe(0);
  });

  it('độ khó tăng dần theo thời gian', () => {
    const e = new CatchEngine(base({ duration: 100 }));
    const startFall = e.fallTime;
    const startRate = e.spawnRate;
    e.step(10.5);
    expect(e.fallTime).toBeLessThan(startFall);
    expect(e.spawnRate).toBeGreaterThan(startRate);
    expect(e.progress).toBe(1);
  });

  it('chế độ theo màn: đủ điểm thì lên màn', () => {
    const e = new CatchEngine(
      base({ difficulty: { ...catchDefaults.difficulty, mode: 'levels', pointsPerLevel: 4, maxLevel: 5 } }),
    );
    expect(e.progress).toBe(0);
    dropOne(e, true);
    e.step(0.5);
    dropOne(e, true);
    const events = e.step(0.5);
    expect(e.score).toBe(4);
    expect(events).toContainEqual({ type: 'levelUp', level: 2 });
    expect(e.progress).toBeCloseTo(0.25);
  });

  it('chọn vật phẩm theo tần suất', () => {
    const e = new CatchEngine(
      base({
        duration: 1000,
        difficulty: { ...catchDefaults.difficulty, spawnStart: 5, spawnEnd: 5, fallStart: 100, fallEnd: 100 },
        items: [
          { points: 1, weight: 9, loseLifeOnCatch: false, loseLifeOnMiss: false },
          { points: 1, weight: 1, loseLifeOnCatch: false, loseLifeOnMiss: false },
        ],
      }),
    );
    e.step(60);
    const common = e.falling.filter((f) => f.itemIndex === 0).length;
    expect(common / e.falling.length).toBeGreaterThan(0.8);
  });

  it('giỏ không ra ngoài màn hình', () => {
    const e = new CatchEngine(base());
    e.setTarget(-500);
    e.step(1);
    expect(e.basketX).toBeCloseTo(e.basketWidth / 2, 0);
    e.setTarget(5000);
    e.step(1);
    expect(e.basketX).toBeCloseTo(400 - e.basketWidth / 2, 0);
  });
});

describe('pickEndMessage', () => {
  const messages = catchDefaults.end.messages;
  it('lấy lời nhắn của mức cao nhất đạt được', () => {
    expect(pickEndMessage(messages, 5)).toBe('Bạn đạt 5 điểm. Thử lại nhé!');
    expect(pickEndMessage(messages, 30)).toBe('Giỏi lắm! 30 điểm.');
    expect(pickEndMessage(messages, 200)).toContain('cao thủ');
  });
  it('điểm âm vẫn có lời nhắn', () => {
    expect(pickEndMessage(messages, -3)).toBe('Bạn đạt -3 điểm. Thử lại nhé!');
  });
});
