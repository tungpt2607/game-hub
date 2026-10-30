'use client';

import Box from '@mui/material/Box';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const url = (v: unknown) => str(obj(v).url);

/**
 * Ảnh nhỏ của template, tự vẽ từ cấu hình (màu nền, ảnh nền, logo, tiêu đề, vài vật phẩm).
 * Đọc theo các nhóm phổ biến `look`, `content`, `items`; module khác cấu trúc thì vẫn hiện được màu mặc định.
 */
export function TemplateThumb({ config, height = 160 }: { config: Obj; height?: number }) {
  const look = obj(config.look);
  const content = obj(config.content);
  const items = Array.isArray(config.items) ? (config.items as unknown[]) : [];
  const background = str(look.background) ?? '#1E3A8A';
  const text = str(look.text) ?? '#FFFFFF';
  const bgImage = url(look.backgroundImage);
  const logo = url(content.logo);
  const title = str(content.title) ?? '';
  const symbols = items.slice(0, 4).map((it, i) => {
    const symbol = obj(obj(it).symbol);
    const image = url(symbol.image);
    return image ? (
      <img key={i} src={image} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
    ) : (
      <span key={i} style={{ fontSize: 22, lineHeight: 1 }}>
        {str(symbol.emoji) ?? ''}
      </span>
    );
  });
  return (
    <Box
      sx={{
        height,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: background,
        backgroundImage: bgImage ? `url(${JSON.stringify(bgImage)})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: text,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        p: 1.5,
        textAlign: 'center',
      }}
    >
      {logo && <img src={logo} alt="" style={{ maxWidth: '50%', maxHeight: height * 0.3, objectFit: 'contain' }} />}
      <Box
        sx={{
          fontWeight: 800,
          fontSize: 17,
          lineHeight: 1.2,
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </Box>
      {symbols.length > 0 && <Box sx={{ display: 'flex', gap: 1 }}>{symbols}</Box>}
    </Box>
  );
}
