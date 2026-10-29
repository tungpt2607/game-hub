import { describe, expect, it } from 'vitest';
import { isValidModuleKey, normalizeConfig, validateConfig } from '@opes/module-sdk';
import { MODULES, getModule } from './index';

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

  it('mỗi module có ít nhất một màn hình', () => {
    for (const m of MODULES) expect(m.screens.length).toBeGreaterThan(0);
  });

  it('tìm module theo định danh', () => {
    expect(getModule('game.sample')?.name).toContain('Chạm quà');
    expect(getModule('game.khong-co')).toBeUndefined();
  });
});
