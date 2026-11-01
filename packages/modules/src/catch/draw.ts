import type { EmojiOrImage } from '@opes/module-sdk';
import { EMOJI_FONT } from '@opes/module-sdk/react';
import type { CatchConfig } from './config';
import type { CatchEngine } from './engine';
import type { SpriteLayer } from './SpriteLayer';

/** Điểm bay lên chỗ vừa hứng (+10, -❤️…), mờ dần trong 0,8 giây. */
export interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
  good: boolean;
  born: number;
}

/**
 * Vẽ một khung hình: vật phẩm rơi, giỏ, điểm bay lên. Emoji vẽ lên canvas; ảnh đặt bằng lớp <img>
 * (SpriteLayer) để ảnh động vẫn chạy. Xóa khỏi `pops` các điểm đã hết thời gian hiển thị.
 */
export function drawFrame(
  cv: HTMLCanvasElement,
  engine: CatchEngine,
  c: CatchConfig,
  sprites: SpriteLayer | null,
  pops: Pop[],
  now: number,
): void {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const scale = cv.width / engine.width;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, engine.width, engine.height);
  sprites?.begin();

  const drawSymbol = (
    id: string,
    symbol: EmojiOrImage | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    if (!symbol) return;
    if (symbol.image) {
      sprites?.place(id, symbol.image.url, x, y, w, h);
    } else {
      ctx.font = `${Math.min(w, h) * 0.86}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol.emoji, x, y + Math.min(w, h) * 0.04);
    }
  };

  const size = engine.itemSize;
  for (const f of engine.falling)
    drawSymbol(`item-${f.id}`, c.items[f.itemIndex]?.symbol, f.x, f.y, size, size);

  const bw = engine.basketWidth;
  const bh = engine.basketHeight;
  drawSymbol(
    'basket',
    c.basket.symbol,
    engine.basketX,
    engine.basketTop + bh / 2,
    bw,
    c.basket.symbol.image ? bh : bw,
  );
  sprites?.end();

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
}
