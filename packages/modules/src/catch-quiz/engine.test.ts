import { describe, expect, it } from 'vitest';
import { seededRandom } from '../catch/engine';
import { catchQuizDefaults, type CatchQuizConfig } from './config';
import { buildBag, CatchQuizEngine, pickQuestionIndex, shuffled } from './engine';

function config(patch: (c: CatchQuizConfig) => void = () => {}): CatchQuizConfig {
  const c = structuredClone(catchQuizDefaults);
  patch(c);
  return c;
}

/** Đặt một vật phẩm của nhóm `group` ngay trên vùng hứng (hoặc lệch hẳn). */
function dropOn(engine: CatchQuizEngine, group: number, onCatcher = true) {
  const r = engine.catchRect;
  const size = engine.itemSize;
  engine.items = [
    {
      id: 999,
      group,
      symbol: 0,
      lane: 0,
      x: onCatcher ? (r.left + r.right) / 2 - size / 2 : r.right + 300,
      y: r.top - size - 1,
    },
  ];
}

describe('buildBag', () => {
  it('chia ô theo tỉ lệ 70/10/20', () => {
    const bag = buildBag([70, 10, 20], seededRandom(1));
    expect(bag).toHaveLength(20);
    expect(bag.filter((g) => g === 0)).toHaveLength(14);
    expect(bag.filter((g) => g === 1)).toHaveLength(2);
    expect(bag.filter((g) => g === 2)).toHaveLength(4);
  });
  it('nhóm tỉ lệ nhỏ vẫn có ít nhất một ô; tỉ lệ 0 thì không có', () => {
    const bag = buildBag([99, 1, 0], seededRandom(2));
    expect(bag.includes(1)).toBe(true);
    expect(bag.includes(2)).toBe(false);
  });
});

describe('CatchQuizEngine', () => {
  it('hứng vật phẩm cộng điểm', () => {
    const e = new CatchQuizEngine(config(), seededRandom(1));
    e.start(false);
    dropOn(e, 1); // nhóm Vàng +50
    const events = e.step(0.2);
    expect(events[0]).toMatchObject({ type: 'catch', effect: 'score', points: 50 });
    expect(e.score).toBe(50);
  });

  it('không hứng thì vật phẩm rơi qua', () => {
    const e = new CatchQuizEngine(config(), seededRandom(1));
    e.start(false);
    dropOn(e, 1, false);
    e.step(0.2);
    expect(e.score).toBe(0);
  });

  it('dính vật xấu: dừng game, hiện câu hỏi; trả lời sai mất mạng, đúng thì chơi tiếp', () => {
    const e = new CatchQuizEngine(config((c) => (c.quiz.correctBonus = 5)), seededRandom(1));
    e.start(false);
    dropOn(e, 2);
    const events = e.step(0.2);
    expect(events.map((ev) => ev.type)).toEqual(['catch', 'question']);
    expect(e.paused).toBe(true);
    const before = e.elapsed;
    e.step(5);
    expect(e.elapsed).toBe(before); // thời gian đứng yên khi đang hỏi

    expect(e.answer(false)).toBe(false);
    expect(e.lives).toBe(2);
    e.resume();
    expect(e.paused).toBe(false);

    dropOn(e, 2);
    e.step(0.2);
    expect(e.answer(true)).toBe(false);
    expect(e.score).toBe(5);
  });

  it('trả lời sai khi còn 1 mạng thì kết thúc', () => {
    const e = new CatchQuizEngine(config((c) => (c.rules.lives = 1)), seededRandom(1));
    e.start(false);
    dropOn(e, 2);
    e.step(0.2);
    expect(e.answer(false)).toBe(true);
    expect(e.over).toBe(true);
  });

  it('trả lời sai bị trừ điểm khi chọn "Bị trừ điểm"', () => {
    const e = new CatchQuizEngine(
      config((c) => {
        c.quiz.wrongPenalty = 'points';
        c.quiz.wrongPoints = 7;
      }),
      seededRandom(1),
    );
    e.start(false);
    dropOn(e, 2);
    e.step(0.2);
    e.answer(false);
    expect(e.lives).toBe(3);
    expect(e.score).toBe(-7);
  });

  it('nhóm "mất mạng" trừ mạng ngay, không dừng game', () => {
    const e = new CatchQuizEngine(config((c) => (c.groups[2]!.effect = 'life')), seededRandom(1));
    e.start(false);
    dropOn(e, 2);
    const events = e.step(0.2);
    expect(events[0]).toMatchObject({ type: 'catch', lostLife: true });
    expect(e.lives).toBe(2);
    expect(e.paused).toBe(false);
  });

  it('hết giờ thì kết thúc', () => {
    const e = new CatchQuizEngine(config((c) => (c.rules.duration = 3)), seededRandom(1));
    e.start();
    e.catcherX = -10000; // không hứng gì
    const events = e.step(3.2);
    expect(events.at(-1)).toEqual({ type: 'end', reason: 'time' });
  });

  it('đổi giai đoạn theo thời gian và thả đúng số vật mỗi đợt', () => {
    const e = new CatchQuizEngine(config(), seededRandom(3));
    expect(e.phase.waveSize).toBe(2);
    e.spawnWave();
    expect(e.items).toHaveLength(2);
    expect(new Set(e.items.map((i) => i.lane)).size).toBe(2);
    e.elapsed = 45;
    expect(e.phase.speed).toBe(450);
    e.items = [];
    e.spawnWave();
    expect(e.items).toHaveLength(3);
  });

  it('nhân vật không đi ra ngoài khung', () => {
    const e = new CatchQuizEngine(config(), seededRandom(1));
    e.setCatcher(-500);
    expect(e.catchRect.left).toBeGreaterThanOrEqual(0);
    e.setCatcher(5000);
    expect(e.catchRect.right).toBeLessThanOrEqual(1080);
  });
});

describe('câu hỏi', () => {
  it('không lặp lại cho tới khi hỏi hết', () => {
    const used: number[] = [];
    const rng = seededRandom(5);
    for (let i = 0; i < 4; i++) used.push(pickQuestionIndex(4, used, rng));
    expect([...used].sort()).toEqual([0, 1, 2, 3]);
    expect(pickQuestionIndex(4, used, rng)).toBeLessThan(4);
  });
  it('xáo đáp án không làm mất phần tử', () => {
    expect(shuffled([1, 2, 3, 4], seededRandom(2)).sort()).toEqual([1, 2, 3, 4]);
  });
});
