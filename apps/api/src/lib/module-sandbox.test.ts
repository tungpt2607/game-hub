import { describe, expect, it } from 'vitest';
import builtin from '@opes/modules/bundles';
import { sandbox } from './module-sandbox';

type Bundle = { meta: { key: string; presets: { id: string; config: unknown }[]; defaults: unknown }; schemaJs: string };
const bundles = builtin as Bundle[];
const quiz = bundles.find((b) => b.meta.key === 'game.catch-quiz')!;

describe('hộp cách ly chạy gói mô tả game', () => {
  it('đọc được mô tả của mọi game có sẵn', async () => {
    for (const b of bundles) {
      const meta = await sandbox.meta(b.schemaJs);
      expect(meta.key).toBe(b.meta.key);
    }
  });

  it('mẫu và cấu hình mặc định đều hợp lệ', async () => {
    for (const b of bundles) {
      expect(await sandbox.validate(b.schemaJs, b.meta.defaults)).toEqual({});
      for (const p of b.meta.presets) expect(await sandbox.validate(b.schemaJs, p.config)).toEqual({});
    }
  });

  it('chuẩn hóa: điền phần thiếu từ mặc định', async () => {
    const out = await sandbox.normalize(quiz.schemaJs, { rules: { lives: 5 } });
    expect((out.rules as { lives: number; lanes: number }).lives).toBe(5);
    expect((out.rules as { lanes: number }).lanes).toBe(5);
  });

  it('code chạy vô hạn bị dừng, không treo máy chủ', async () => {
    await expect(sandbox.meta('while (true) {}')).rejects.toThrow(/lỗi khi chạy/);
  });

  it('không truy cập được tài nguyên của máy chủ', async () => {
    const probe = `globalThis.__opes = { meta: () => ({ process: typeof process, require: typeof require, fetch: typeof fetch }) };`;
    expect(await sandbox.meta(probe)).toEqual({ process: 'undefined', require: 'undefined', fetch: 'undefined' });
  });
});
