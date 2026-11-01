import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assetStorageKey } from './module-package';

/**
 * Khi bật MEDIA_PROXY, API trả địa chỉ kho dạng "/<thư mục>/..." và CMS / trang chơi chuyển tiếp các thư mục
 * trong MEDIA_PREFIXES (next.config.mjs) tới kho. Thư mục nào API ghi file mà không có trong danh sách thì
 * file đó trả 404 trên trang (đã xảy ra với file kèm của game, thư mục game-assets/).
 */
const prefixesOf = (app: 'cms' | 'play'): string[] => {
  const path = fileURLToPath(new URL(`../../../${app}/next.config.mjs`, import.meta.url));
  const match = /const MEDIA_PREFIXES = \[([^\]]*)\]/.exec(readFileSync(path, 'utf8'));
  if (!match) throw new Error(`Không thấy MEDIA_PREFIXES trong apps/${app}/next.config.mjs`);
  return [...match[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
};

describe('chuyển tiếp kho media (MEDIA_PROXY)', () => {
  // Thư mục API ghi file: thư viện Media (routes/media.ts) và file kèm của game (lib/module-package.ts).
  const written = ['media', assetStorageKey('game.thu', 'a'.repeat(64), 'svg').split('/')[0]!];

  it.each(['cms', 'play'] as const)('%s chuyển tiếp mọi thư mục API ghi file lên kho', (app) => {
    expect(prefixesOf(app)).toEqual(expect.arrayContaining(written));
  });

  it('CMS và trang chơi chuyển tiếp cùng một danh sách', () => {
    expect(prefixesOf('cms')).toEqual(prefixesOf('play'));
  });
});
