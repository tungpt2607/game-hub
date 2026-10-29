import { describe, expect, it } from 'vitest';
import { t } from './index';

describe('t', () => {
  it('trả về chuỗi theo khóa', () => {
    expect(t('app.name')).toBe('Game Hub OPES');
  });

  it('thay biến trong chuỗi', () => {
    expect(t('cms.nav.comingIn', { step: 4 })).toBe('Có ở bước 4');
  });

  it('giữ nguyên biến không được truyền', () => {
    expect(t('cms.nav.comingIn', {})).toBe('Có ở bước {step}');
  });

  it('trả về chính khóa khi không tìm thấy', () => {
    expect(t('khong.ton.tai')).toBe('khong.ton.tai');
    expect(t('cms.login')).toBe('cms.login');
  });
});
