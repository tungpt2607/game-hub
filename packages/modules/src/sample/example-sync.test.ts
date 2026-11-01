import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Game có sẵn "game.sample" và gói mẫu tải về (examples/game-mau) dùng chung phần chạy và form cấu hình.
 * Gói mẫu phải tự đủ file (người dùng tải về dạng .zip) nên không import chéo được; test này bắt buộc
 * hai bản luôn giống nhau. Sửa một bên thì chép sang bên kia.
 */
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('gói mẫu game-mau khớp với game.sample', () => {
  for (const file of ['Runtime.tsx', 'config.ts']) {
    it(file, () => {
      expect(read(`../../examples/game-mau/${file}`), `examples/game-mau/${file} khác src/sample/${file}`).toBe(
        read(`./${file}`),
      );
    });
  }
});
