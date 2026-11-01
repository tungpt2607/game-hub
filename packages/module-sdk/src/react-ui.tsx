'use client';

import { useEffect, type CSSProperties } from 'react';
import type { EmojiOrImage } from './fields';

/**
 * Thành phần giao diện và tiện ích trình duyệt dùng chung cho phần chạy (Runtime) của các game.
 * Xuất qua `@opes/module-sdk/react`.
 */

/** Font hiển thị emoji màu trên mọi hệ điều hành. */
export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export interface EmojiOrImageViewProps {
  value: EmojiOrImage;
  /** Cạnh khung hiển thị (px hoặc giá trị CSS). */
  size: number | string;
  /** Cỡ emoji so với `size` (emoji thường trông to hơn ảnh cùng cỡ); mặc định 0.85. */
  emojiScale?: number;
  style?: CSSProperties;
}

/** Hiển thị trường "emoji hoặc ảnh": ảnh vừa khung `size`, hoặc emoji cỡ tương ứng. */
export function EmojiOrImageView({ value, size, emojiScale = 0.85, style }: EmojiOrImageViewProps) {
  if (value.image) {
    return (
      <img
        src={value.image.url}
        alt=""
        draggable={false}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block', ...style }}
      />
    );
  }
  return (
    <span
      style={{
        fontSize: typeof size === 'number' ? size * emojiScale : size,
        lineHeight: 1,
        fontFamily: EMOJI_FONT,
        ...style,
      }}
    >
      {value.emoji}
    </span>
  );
}

/** Người chơi bật "giảm chuyển động" trong hệ điều hành: bỏ hiệu ứng trang trí (rung màn hình, pháo giấy…). */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

/** Rung máy (nếu trình duyệt cho phép); không làm gì trên máy không hỗ trợ. */
export function vibrate(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Một số trình duyệt chặn rung: bỏ qua.
  }
}

/** Tải trước ảnh để khi xuất hiện trong game không bị nháy. Chỉ tải lại khi danh sách link đổi. */
export function usePreloadImages(urls: readonly string[]): void {
  // Dùng chuỗi làm phụ thuộc: mảng mới cùng nội dung không làm tải lại.
  const key = urls.join('|');
  useEffect(() => {
    for (const url of new Set(key.split('|'))) {
      if (!url) continue;
      const img = new Image();
      img.src = url;
    }
  }, [key]);
}
