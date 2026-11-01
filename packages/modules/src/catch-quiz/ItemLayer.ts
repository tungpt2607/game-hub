import { EMOJI_FONT } from '@opes/module-sdk/react';
import { type CatchQuizConfig } from './config';
import { type CatchQuizEngine } from './engine';

/** Lớp vật phẩm: phần tử DOM cập nhật trực tiếp mỗi khung hình (không qua React cho nhẹ). */
export class ItemLayer {
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
