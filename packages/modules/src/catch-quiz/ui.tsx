'use client';

import { type CSSProperties, type ReactNode } from 'react';
import type { MediaRef } from '@opes/module-sdk';
import { EmojiOrImageView, type EmojiOrImageViewProps } from '@opes/module-sdk/react';

/** Emoji trong game này hiển thị nhỏ hơn một chút so với mặc định (khớp thiết kế gốc). */
export const Sym = (props: EmojiOrImageViewProps) => (
  <EmojiOrImageView emojiScale={0.8} {...props} />
);

/** Ô có ảnh khung (nếu có), nội dung đặt trong vùng `inset` (%). Không có ảnh thì dùng khung bo tròn. */
export function Board({
  image,
  width,
  height,
  inset,
  children,
  style,
}: {
  image: MediaRef | null;
  width: number;
  height: number;
  inset: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: 'relative', width, height, ...style }}>
      {image ? (
        <img
          src={image.url}
          alt=""
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: '6%',
            borderRadius: 999,
            background: 'rgba(8,16,38,0.75)',
            border: '6px solid rgba(255,255,255,0.85)',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 15,
        }}
      >
        {children}
      </div>
    </div>
  );
}
