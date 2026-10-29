import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health';

const valid = {
  status: 'ok',
  service: 'api',
  version: '0.2.0',
  time: '2026-10-29T12:00:00.000Z',
  database: 'ok',
};

describe('HealthResponseSchema', () => {
  it('chấp nhận kết quả hợp lệ', () => {
    expect(HealthResponseSchema.parse(valid)).toEqual(valid);
  });

  it('chấp nhận trạng thái degraded khi cơ sở dữ liệu lỗi', () => {
    expect(HealthResponseSchema.parse({ ...valid, status: 'degraded', database: 'down' }).status).toBe(
      'degraded',
    );
  });

  it('từ chối thời điểm sai định dạng', () => {
    expect(HealthResponseSchema.safeParse({ ...valid, time: 'hôm qua' }).success).toBe(false);
  });

  it('từ chối trạng thái cơ sở dữ liệu lạ', () => {
    expect(HealthResponseSchema.safeParse({ ...valid, database: 'maybe' }).success).toBe(false);
  });
});
