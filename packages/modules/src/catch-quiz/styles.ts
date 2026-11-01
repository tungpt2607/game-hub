import type { CSSProperties } from 'react';
import type { CatchQuizConfig } from './config';

/** CSS của game: hiệu ứng vật phẩm, nhân vật, các lớp phủ; tắt hiệu ứng khi người chơi giảm chuyển động. */
export const CSS = `
.ocq-item { position:absolute; left:0; top:0; display:flex; align-items:center; justify-content:center;
  border-radius:50%; background:#FFFFFF1A; pointer-events:none; will-change:transform; }
.ocq-item > .ocq-pulse { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
.ocq-item.pulse > .ocq-pulse { animation: ocq-pulse 1.1s ease-in-out infinite; }
.ocq-item img { width:100%; height:100%; object-fit:contain; display:block; pointer-events:none; }
@keyframes ocq-pulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.09) } }
@keyframes ocq-hit { 0%,100% { transform:rotate(0) } 25% { transform:rotate(-8deg) translateY(2px) } 75% { transform:rotate(8deg) translateY(2px) } }
@keyframes ocq-blink { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.45; transform:scale(1.12) } }
@keyframes ocq-pop { from { transform:scale(1.25); opacity:.4 } to { transform:scale(1); opacity:1 } }
@keyframes ocq-fade { from { opacity:0 } to { opacity:1 } }
@media (prefers-reduced-motion: reduce) { .ocq-item > .ocq-pulse, .ocq-anim { animation:none !important } }
`;

/** Lớp phủ mờ toàn màn hình (màn mở đầu, câu hỏi, kết thúc…). */
export const overlayStyle = (tint: string): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: 32,
  background: tint,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  animation: 'ocq-fade .35s ease',
});

/** Nút chính theo màu cấu hình. */
export const buttonStyle = (look: CatchQuizConfig['look']): CSSProperties => ({
  border: '4px solid #fff',
  borderRadius: 130,
  padding: '16px 48px',
  fontFamily: 'inherit',
  fontSize: 45,
  fontWeight: 800,
  cursor: 'pointer',
  background: `linear-gradient(126deg, ${look.buttonFrom} 14%, ${look.buttonTo} 86%)`,
  color: look.buttonText,
  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
});

/** Chữ số trên bảng điểm / thời gian (font số riêng, độ rộng đều). */
export const numberStyle = (fontFamily: string): CSSProperties => ({
  fontFamily,
  fontWeight: 700,
  color: '#fff',
  fontVariantNumeric: 'tabular-nums',
});
