import { describe, expect, it } from 'vitest';
import { isValidModuleKey } from './index';

describe('isValidModuleKey', () => {
  it('chấp nhận định danh đúng dạng', () => {
    expect(isValidModuleKey('game.catch', 'game')).toBe(true);
    expect(isValidModuleKey('reward.wheel', 'reward')).toBe(true);
  });

  it('từ chối định danh sai loại hoặc sai dạng', () => {
    expect(isValidModuleKey('game.catch', 'reward')).toBe(false);
    expect(isValidModuleKey('Game.Catch', 'game')).toBe(false);
    expect(isValidModuleKey('catch', 'game')).toBe(false);
  });
});
