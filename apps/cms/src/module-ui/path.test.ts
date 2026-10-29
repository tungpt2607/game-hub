import { describe, expect, it } from 'vitest';
import { getIn, setIn } from './path';

describe('setIn / getIn', () => {
  it('ghi theo đường dẫn mà không sửa object gốc', () => {
    const src = { a: { list: [{ x: 1 }, { x: 2 }] } };
    const out = setIn(src, ['a', 'list', 1, 'x'], 5);
    expect(getIn(out, ['a', 'list', 1, 'x'])).toBe(5);
    expect(src.a.list[1]!.x).toBe(2);
    expect(Array.isArray(out.a.list)).toBe(true);
    expect(out.a.list[0]).toBe(src.a.list[0]);
  });
});
