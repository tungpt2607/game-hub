import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health';

describe('HealthResponseSchema', () => {
  it('chấp nhận kết quả hợp lệ', () => {
    const value = {
      status: 'ok',
      service: 'api',
      version: '0.1.0',
      time: '2026-10-29T12:00:00.000Z',
    };
    expect(HealthResponseSchema.parse(value)).toEqual(value);
  });

  it('từ chối thời điểm sai định dạng', () => {
    const result = HealthResponseSchema.safeParse({
      status: 'ok',
      service: 'api',
      version: '0.1.0',
      time: 'hôm qua',
    });
    expect(result.success).toBe(false);
  });
});
