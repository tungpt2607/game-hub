import {} from 'react';

/**
 * Lớp ảnh nằm dưới canvas. Ảnh (kể cả GIF/WebP động) được hiển thị bằng thẻ <img> thay vì vẽ lên canvas,
 * vì canvas chỉ vẽ được khung hình đầu của ảnh động.
 */
export class SpriteLayer {
  private sprites = new Map<string, HTMLImageElement>();
  private seen = new Set<string>();
  constructor(private root: HTMLDivElement) {}

  begin() {
    this.seen.clear();
  }

  /** Đặt ảnh `url` vừa trong khung w×h, tâm tại (x, y). */
  place(id: string, url: string, x: number, y: number, w: number, h: number) {
    this.seen.add(id);
    let img = this.sprites.get(id);
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      Object.assign(img.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        objectFit: 'contain',
        pointerEvents: 'none',
        willChange: 'transform',
      });
      this.root.appendChild(img);
      this.sprites.set(id, img);
    }
    if (img.getAttribute('src') !== url) img.src = url;
    img.style.width = `${w}px`;
    img.style.height = `${h}px`;
    img.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px)`;
  }

  /** Bỏ các ảnh không còn trên màn hình. */
  end() {
    for (const [id, img] of this.sprites) {
      if (!this.seen.has(id)) {
        img.remove();
        this.sprites.delete(id);
      }
    }
  }

  clear() {
    for (const img of this.sprites.values()) img.remove();
    this.sprites.clear();
  }
}
