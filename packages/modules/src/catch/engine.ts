import type { BasketSize, CatchConfig, EndMode } from './config';

/**
 * Lõi game Hứng quà: không phụ thuộc giao diện, chạy được trong test.
 * Tọa độ tính bằng px của vùng chơi; x, y là tâm vật phẩm.
 */

export interface EngineItem {
  points: number;
  weight: number;
  loseLifeOnCatch: boolean;
  loseLifeOnMiss: boolean;
}

export interface EngineOptions {
  width: number;
  height: number;
  items: EngineItem[];
  basketSize: BasketSize;
  endMode: EndMode;
  duration: number;
  lives: number;
  difficulty: CatchConfig['difficulty'];
  /** Hàm số ngẫu nhiên [0, 1); truyền vào để test cho ra cùng kết quả. */
  rng?: () => number;
}

export interface Falling {
  id: number;
  itemIndex: number;
  x: number;
  y: number;
  /** Vận tốc rơi (px/giây), cố định từ lúc xuất hiện. */
  vy: number;
}

export type EngineEvent =
  | { type: 'catch'; itemIndex: number; points: number; x: number; y: number; lostLife: boolean }
  | { type: 'miss'; itemIndex: number; x: number; lostLife: boolean }
  | { type: 'levelUp'; level: number }
  | { type: 'end'; reason: 'time' | 'lives' };

const BASKET_RATIO: Record<BasketSize, number> = { small: 0.2, medium: 0.27, large: 0.36 };
/** Bước thời gian tối đa mỗi lần cập nhật, tránh vật phẩm "nhảy" qua giỏ khi máy giật. */
const MAX_DT = 0.05;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class CatchEngine {
  width: number;
  height: number;
  readonly opts: EngineOptions;
  elapsed = 0;
  score = 0;
  lives: number;
  level = 1;
  caught = 0;
  missed = 0;
  falling: Falling[] = [];
  over = false;
  basketX: number;
  private target: number;
  private spawnAcc = 0.6;
  private nextId = 1;
  private rng: () => number;

  constructor(opts: EngineOptions) {
    this.opts = opts;
    this.width = opts.width;
    this.height = opts.height;
    this.lives = opts.lives;
    this.basketX = opts.width / 2;
    this.target = this.basketX;
    this.rng = opts.rng ?? Math.random;
  }

  get usesLives() {
    return this.opts.endMode !== 'time';
  }
  get usesTime() {
    return this.opts.endMode !== 'lives';
  }
  get timeLeft(): number | null {
    return this.usesTime ? Math.max(0, this.opts.duration - this.elapsed) : null;
  }
  get basketWidth() {
    return clamp(this.width * BASKET_RATIO[this.opts.basketSize], 48, 220);
  }
  get basketHeight() {
    return this.basketWidth * 0.62;
  }
  /** Mép trên của giỏ. */
  get basketTop() {
    return this.height - this.basketHeight - this.height * 0.035;
  }
  get itemSize() {
    return clamp(this.width * 0.12, 30, 64);
  }

  /** Mức khó hiện tại, từ 0 (dễ nhất) tới 1 (khó nhất). */
  get progress(): number {
    const d = this.opts.difficulty;
    if (d.mode === 'levels') return d.maxLevel <= 1 ? 1 : clamp((this.level - 1) / (d.maxLevel - 1), 0, 1);
    return d.rampSeconds <= 0 ? 1 : clamp(this.elapsed / d.rampSeconds, 0, 1);
  }
  get fallTime() {
    const d = this.opts.difficulty;
    return Math.max(0.3, lerp(d.fallStart, d.fallEnd, this.progress));
  }
  get spawnRate() {
    const d = this.opts.difficulty;
    return Math.max(0.05, lerp(d.spawnStart, d.spawnEnd, this.progress));
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    const sx = width / this.width;
    const sy = height / this.height;
    for (const f of this.falling) {
      f.x *= sx;
      f.y *= sy;
      f.vy *= sy;
    }
    this.basketX *= sx;
    this.target *= sx;
    this.width = width;
    this.height = height;
  }

  /** Vị trí ngón tay / chuột (tâm giỏ sẽ đi theo). */
  setTarget(x: number) {
    this.target = x;
  }
  /** Di chuyển bằng phím mũi tên: -1 trái, 1 phải. */
  nudge(direction: number, dt: number) {
    this.target = clamp(this.target + direction * this.width * 1.2 * dt, 0, this.width);
  }

  private pickItem(): number {
    const items = this.opts.items;
    const total = items.reduce((sum, it) => sum + Math.max(0, it.weight), 0);
    if (total <= 0) return 0;
    let r = this.rng() * total;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, items[i]!.weight);
      if (r < 0) return i;
    }
    return items.length - 1;
  }

  private spawn() {
    if (this.opts.items.length === 0) return;
    const size = this.itemSize;
    this.falling.push({
      id: this.nextId++,
      itemIndex: this.pickItem(),
      x: size / 2 + this.rng() * Math.max(0, this.width - size),
      y: -size / 2,
      vy: (this.height + size) / this.fallTime,
    });
  }

  /** Cập nhật game sau `dt` giây; trả về các sự kiện xảy ra. */
  step(dtSeconds: number): EngineEvent[] {
    const events: EngineEvent[] = [];
    let remaining = Math.max(0, dtSeconds);
    while (remaining > 0 && !this.over) {
      const dt = Math.min(MAX_DT, remaining);
      remaining -= dt;
      this.tick(dt, events);
    }
    return events;
  }

  private tick(dt: number, events: EngineEvent[]) {
    this.elapsed += dt;

    // Giỏ đi theo ngón tay, mượt nhưng nhanh.
    const half = this.basketWidth / 2;
    this.target = clamp(this.target, half, this.width - half);
    this.basketX += (this.target - this.basketX) * Math.min(1, dt * 22);
    this.basketX = clamp(this.basketX, half, this.width - half);

    this.spawnAcc += dt * this.spawnRate;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      this.spawn();
    }

    const size = this.itemSize;
    const top = this.basketTop;
    const catchBand = this.basketHeight * 0.55;
    const reach = half + size * 0.2;
    const kept: Falling[] = [];
    for (const f of this.falling) {
      const prevBottom = f.y + size / 2;
      f.y += f.vy * dt;
      const bottom = f.y + size / 2;
      const item = this.opts.items[f.itemIndex]!;
      // Hứng: đáy vật phẩm đi qua vùng miệng giỏ và nằm trong bề ngang giỏ.
      if (bottom >= top && prevBottom <= top + catchBand && Math.abs(f.x - this.basketX) <= reach) {
        const lostLife = this.usesLives && item.loseLifeOnCatch;
        this.score += item.points;
        this.caught += 1;
        if (lostLife) this.lives -= 1;
        events.push({ type: 'catch', itemIndex: f.itemIndex, points: item.points, x: f.x, y: top, lostLife });
        continue;
      }
      if (f.y - size / 2 > this.height) {
        const lostLife = this.usesLives && item.loseLifeOnMiss;
        if (lostLife) this.lives -= 1;
        this.missed += 1;
        events.push({ type: 'miss', itemIndex: f.itemIndex, x: f.x, lostLife });
        continue;
      }
      kept.push(f);
    }
    this.falling = kept;

    const d = this.opts.difficulty;
    if (d.mode === 'levels' && d.pointsPerLevel > 0) {
      const next = clamp(1 + Math.floor(Math.max(0, this.score) / d.pointsPerLevel), 1, Math.max(1, d.maxLevel));
      if (next > this.level) {
        this.level = next;
        events.push({ type: 'levelUp', level: next });
      }
    }

    if (this.usesLives && this.lives <= 0) {
      this.lives = 0;
      this.over = true;
      events.push({ type: 'end', reason: 'lives' });
    } else if (this.usesTime && this.elapsed >= this.opts.duration) {
      this.over = true;
      events.push({ type: 'end', reason: 'time' });
    }
  }
}

/** Tạo bộ số ngẫu nhiên có hạt giống (mulberry32), dùng cho test. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lời nhắn ứng với điểm: mức cao nhất mà điểm đạt tới; không đạt mức nào thì lấy mức thấp nhất. */
export function pickEndMessage(messages: { minScore: number; message: string }[], score: number): string {
  if (messages.length === 0) return '';
  const sorted = [...messages].sort((a, b) => a.minScore - b.minScore);
  let chosen = sorted[0]!;
  for (const m of sorted) if (score >= m.minScore) chosen = m;
  return chosen.message.replaceAll('{score}', String(score));
}
