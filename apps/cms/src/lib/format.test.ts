import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDay } from './format';

describe('định dạng ngày giờ', () => {
  const iso = '2026-11-01T07:05:00Z';
  it('trả về đúng như toLocaleString/toLocaleDateString của vi-VN', () => {
    const d = new Date(iso);
    expect(formatDateTime(iso)).toBe(
      d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
    );
    expect(formatDay(iso)).toBe(d.toLocaleDateString('vi-VN'));
  });
});
