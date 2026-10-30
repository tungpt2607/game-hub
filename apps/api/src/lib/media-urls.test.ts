import { describe, expect, it } from 'vitest';
import { rewriteMediaUrls } from './media-urls';

describe('rewriteMediaUrls', () => {
  const base = 'https://pub-abc.r2.dev/';
  it('đổi mọi địa chỉ kho trong dữ liệu lồng nhau thành /media/...', () => {
    const input = {
      items: [{ url: 'https://pub-abc.r2.dev/media/2026/10/a.png', name: 'a.png' }],
      config: { logo: { id: '1', url: 'https://pub-abc.r2.dev/media/2026/10/b.webp' }, title: 'Giữ nguyên' },
    };
    expect(rewriteMediaUrls(input, base)).toEqual({
      items: [{ url: '/media/2026/10/a.png', name: 'a.png' }],
      config: { logo: { id: '1', url: '/media/2026/10/b.webp' }, title: 'Giữ nguyên' },
    });
  });
  it('không đụng tới địa chỉ khác hoặc đường dẫn đã là /media/...', () => {
    expect(rewriteMediaUrls(['/media/x.png', 'https://khac.example/a.png', 3, null], base)).toEqual([
      '/media/x.png',
      'https://khac.example/a.png',
      3,
      null,
    ]);
  });
});
