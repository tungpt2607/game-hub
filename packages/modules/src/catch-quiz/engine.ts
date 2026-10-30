import { DESIGN_H, DESIGN_W, type CatchQuizConfig, type GroupEffect } from './config';

/**
 * Lõi game Hứng quà + câu hỏi, không phụ thuộc giao diện (có test).
 * Toạ độ theo khung thiết kế 1080 × 1920; (x, y) của vật phẩm là góc trên bên trái.
 */

export interface FallingItem {
  id: number;
  group: number;
  symbol: number;
  lane: number;
  x: number;
  y: number;
}

export type QuizEngineEvent =
  | { type: 'catch'; group: number; effect: GroupEffect; points: number; x: number; y: number; lostLife: boolean }
  | { type: 'question' }
  | { type: 'end'; reason: 'time' | 'lives' };

/** Khoảng lệch ngẫu nhiên khi thả và khoảng hở tối thiểu giữa 2 vật phẩm cùng làn (theo game gốc). */
const MAX_STAGGER = 60;
const MIN_LANE_GAP = 40;
const BAG_SLOTS = 20;
const MAX_DT = 0.05;

type Options = Pick<CatchQuizConfig, 'groups' | 'rules' | 'phases' | 'catcher' | 'quiz'>;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Túi nhóm vật phẩm theo tỉ lệ: chia BAG_SLOTS ô theo phần dư lớn nhất rồi xáo, để tỉ lệ thực tế
 * sát với cấu hình (như game gốc dùng túi 10 ô 7/1/2).
 */
export function buildBag(ratios: number[], rng: () => number): number[] {
  const weights = ratios.map((r) => Math.max(0, r));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const exact = weights.map((w) => (w / total) * BAG_SLOTS);
  const counts = exact.map(Math.floor);
  let left = BAG_SLOTS - counts.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, rem: e - Math.floor(e) })).sort((a, b) => b.rem - a.rem);
  for (const { i } of order) {
    if (left <= 0) break;
    counts[i]! += 1;
    left -= 1;
  }
  // Nhóm có tỉ lệ > 0 luôn có ít nhất một ô.
  weights.forEach((w, i) => {
    if (w > 0 && counts[i] === 0) counts[i] = 1;
  });
  const bag = counts.flatMap((n, i) => Array<number>(n).fill(i));
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return bag;
}

export class CatchQuizEngine {
  readonly opts: Options;
  elapsed = 0;
  score = 0;
  lives: number;
  items: FallingItem[] = [];
  /** Tâm nhân vật theo chiều ngang. */
  catcherX = DESIGN_W / 2;
  /** Đang dừng (chờ trả lời câu hỏi hoặc chờ bấm Tiếp tục). */
  paused = false;
  over = false;
  caught = 0;
  questionsAsked = 0;
  private bag: number[] = [];
  private untilWave = 0;
  private nextId = 1;
  private rng: () => number;

  constructor(opts: Options, rng: () => number = Math.random) {
    this.opts = opts;
    this.lives = opts.rules.lives;
    this.rng = rng;
  }

  get timeLeft() {
    return Math.max(0, this.opts.rules.duration - this.elapsed);
  }

  get phase() {
    const phases = this.opts.phases;
    return phases.find((p) => this.elapsed < p.until) ?? phases[phases.length - 1]!;
  }

  get itemSize() {
    return this.opts.rules.itemSize;
  }

  /** Vùng hứng của nhân vật (theo game gốc: bỏ bớt hai bên, lấy một dải theo chiều cao). */
  get catchRect() {
    const c = this.opts.catcher;
    const top = DESIGN_H - c.bottom - c.height;
    const inset = (c.width * c.insetX) / 100;
    return {
      left: this.catcherX - c.width / 2 + inset,
      right: this.catcherX + c.width / 2 - inset,
      top: top + (c.height * c.catchTop) / 100,
      bottom: top + (c.height * c.catchBottom) / 100,
    };
  }

  /** Đặt nhân vật; vùng hứng không ra khỏi khung. */
  setCatcher(x: number) {
    const c = this.opts.catcher;
    const half = c.width / 2 - (c.width * c.insetX) / 100;
    this.catcherX = clamp(x, half + 6, DESIGN_W - half - 6);
  }

  nudge(direction: number, dt: number) {
    this.setCatcher(this.catcherX + direction * this.opts.catcher.keyboardSpeed * dt);
  }

  private pickGroup(): number {
    if (this.bag.length === 0) this.bag = buildBag(this.opts.groups.map((g) => g.ratio), this.rng);
    return this.bag.shift() ?? 0;
  }

  private laneTop(lane: number) {
    let top = Infinity;
    for (const it of this.items) if (it.lane === lane && it.y < top) top = it.y;
    return top;
  }

  spawnWave() {
    const lanes = Math.max(1, this.opts.rules.lanes);
    const size = this.itemSize;
    const laneW = DESIGN_W / lanes;
    const order = [...Array(lanes).keys()];
    const count = Math.min(lanes, this.phase.waveSize);
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(this.rng() * (lanes - i));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    for (let i = 0; i < count; i++) {
      const lane = order[i]!;
      const group = this.pickGroup();
      const symbols = this.opts.groups[group]?.symbols.length ?? 1;
      let y = -size - this.rng() * MAX_STAGGER;
      const top = this.laneTop(lane);
      if (top !== Infinity) y = Math.min(y, top - size - MIN_LANE_GAP);
      this.items.push({
        id: this.nextId++,
        group,
        symbol: Math.floor(this.rng() * symbols),
        lane,
        x: lane * laneW + (laneW - size) / 2,
        y,
      });
    }
  }

  /** Bắt đầu (hoặc chơi tiếp): thả ngay một đợt nếu `spawnNow`. */
  start(spawnNow = true) {
    this.paused = false;
    if (spawnNow) {
      this.spawnWave();
      this.untilWave = this.phase.interval / 1000;
    }
  }

  step(dtSeconds: number): QuizEngineEvent[] {
    const events: QuizEngineEvent[] = [];
    let remaining = Math.max(0, dtSeconds);
    while (remaining > 0 && !this.over && !this.paused) {
      const dt = Math.min(MAX_DT, remaining);
      remaining -= dt;
      this.tick(dt, events);
    }
    return events;
  }

  private tick(dt: number, events: QuizEngineEvent[]) {
    this.elapsed += dt;
    this.untilWave -= dt;
    if (this.untilWave <= 0) {
      this.spawnWave();
      this.untilWave += this.phase.interval / 1000;
    }

    const speed = this.phase.speed;
    const size = this.itemSize;
    const r = this.catchRect;
    const kept: FallingItem[] = [];
    let stop = false;
    for (const it of this.items) {
      if (stop) {
        kept.push(it);
        continue;
      }
      it.y += speed * dt;
      const caught = it.y + size > r.top && it.y < r.bottom && it.x + size > r.left && it.x < r.right;
      if (caught) {
        const g = this.opts.groups[it.group]!;
        this.caught += 1;
        if (g.effect === 'question' && this.opts.quiz.questions.length > 0) {
          this.score += g.points;
          this.paused = true;
          this.questionsAsked += 1;
          events.push({ type: 'catch', group: it.group, effect: 'question', points: g.points, x: it.x, y: it.y, lostLife: false });
          events.push({ type: 'question' });
          stop = true; // giữ nguyên các vật phẩm còn lại cho tới khi chơi tiếp
          continue;
        }
        const lostLife = g.effect === 'life' || g.effect === 'question';
        this.score += g.points;
        if (lostLife) this.lives -= 1;
        events.push({ type: 'catch', group: it.group, effect: g.effect, points: g.points, x: it.x, y: it.y, lostLife });
        continue;
      }
      if (it.y > DESIGN_H + 10) continue;
      kept.push(it);
    }
    this.items = kept;

    if (this.lives <= 0) {
      this.lives = 0;
      this.over = true;
      events.push({ type: 'end', reason: 'lives' });
    } else if (!this.paused && this.elapsed >= this.opts.rules.duration) {
      this.over = true;
      events.push({ type: 'end', reason: 'time' });
    }
  }

  /** Kết quả trả lời câu hỏi; trả về true nếu game kết thúc (hết mạng). */
  answer(correct: boolean): boolean {
    const q = this.opts.quiz;
    if (correct) this.score += q.correctBonus;
    else if (q.wrongPenalty === 'life') this.lives -= 1;
    else if (q.wrongPenalty === 'points') this.score -= q.wrongPoints;
    if (this.lives <= 0) {
      this.lives = 0;
      this.over = true;
      return true;
    }
    return false;
  }

  /** Chơi tiếp sau câu hỏi. */
  resume() {
    if (!this.over) this.paused = false;
  }
}

/** Chọn câu hỏi ngẫu nhiên, không lặp lại cho tới khi đã hỏi hết. */
export function pickQuestionIndex(total: number, used: number[], rng: () => number = Math.random): number {
  const pool = [...Array(total).keys()].filter((i) => !used.includes(i));
  const candidates = pool.length ? pool : [...Array(total).keys()];
  return candidates[Math.floor(rng() * candidates.length)] ?? 0;
}

/** Xáo mảng (không sửa mảng gốc). */
export function shuffled<T>(list: T[], rng: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
