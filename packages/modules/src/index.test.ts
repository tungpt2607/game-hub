import { describe, expect, it } from 'vitest';
import { isValidModuleKey, normalizeConfig, validateConfig } from '@opes/module-sdk';
import { MODULES, getModule } from './index';
import { MODULE_SCHEMAS } from './schemas';

describe('danh sách module', () => {
  it('định danh không trùng và đúng dạng', () => {
    const keys = MODULES.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const m of MODULES) expect(isValidModuleKey(m.key, m.kind)).toBe(true);
  });

  it('cấu hình mặc định của mọi module đều hợp lệ', () => {
    for (const m of MODULES) {
      expect(validateConfig(m.fields, m.defaults), m.key).toEqual({});
      expect(normalizeConfig(m.fields, m.defaults, m.defaults), m.key).toEqual(m.defaults);
    }
  });

  it('mọi mẫu có sẵn đều hợp lệ và không trùng mã', () => {
    for (const m of MODULES) {
      const presets = m.presets ?? [];
      expect(new Set(presets.map((p) => p.id)).size, m.key).toBe(presets.length);
      for (const p of presets) {
        expect(validateConfig(m.fields, p.config), `${m.key}/${p.id}`).toEqual({});
        expect(normalizeConfig(m.fields, p.config, m.defaults), `${m.key}/${p.id}`).toEqual(p.config);
      }
    }
  });

  it('Hứng quà có 4 mẫu', () => {
    expect(getModule('game.catch')?.presets?.map((p) => p.id)).toEqual(['tet', 'trung-thu', 'giang-sinh', 'trai-cay']);
  });

  it('danh sách lược đồ khớp với danh sách module', () => {
    expect(MODULE_SCHEMAS.map((m) => `${m.key}@${m.version}`)).toEqual(MODULES.map((m) => `${m.key}@${m.version}`));
  });

  it('Hứng quà + câu hỏi có mẫu OME Catch với 6 câu hỏi và ảnh đi kèm', () => {
    const preset = getModule('game.catch-quiz')?.presets?.find((p) => p.id === 'ome-catch');
    expect(preset?.config.quiz.questions).toHaveLength(6);
    expect(preset?.config.look.backgroundImage.url).toBe('/module-assets/catch-quiz/ome/background.webp');
  });

  it('mỗi module có ít nhất một màn hình', () => {
    for (const m of MODULES) expect(m.screens.length).toBeGreaterThan(0);
  });

  it('tìm module theo định danh', () => {
    expect(getModule('game.sample')?.name).toContain('Chạm quà');
    expect(getModule('game.khong-co')).toBeUndefined();
  });
});
