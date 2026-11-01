import { describe, expect, it } from 'vitest';
import {
  ancestors,
  applyEdits,
  formatChangedFiles,
  isEditedFile,
  lineColumn,
  offsetAt,
} from './workspace-utils';

describe('workspace-utils', () => {
  const text = 'dòng 1\nhai\n\nbốn';

  it('offsetAt và lineColumn là hai phép ngược nhau', () => {
    for (let pos = 0; pos <= text.length; pos++) {
      const { line, column } = lineColumn(text, pos);
      expect(offsetAt(text, line, column)).toBe(pos);
    }
  });

  it('offsetAt không vượt quá cuối file khi dòng không tồn tại', () => {
    expect(offsetAt(text, 99, 0)).toBe(text.lastIndexOf('\n') + 1);
    expect(offsetAt(text, 2, -5)).toBe(text.indexOf('\n') + 1);
  });

  it('ancestors liệt kê thư mục cha từ gần tới xa', () => {
    expect(ancestors('a/b/c.ts')).toEqual(['a/b', 'a']);
    expect(ancestors('c.ts')).toEqual([]);
  });

  it('applyEdits áp nhiều sửa đổi trên cùng file mà không lệch vị trí', () => {
    const files = { 'a.ts': 'const foo = foo + 1;', 'b.ts': 'foo' };
    const out = applyEdits(files, [
      { path: 'a.ts', from: 6, to: 9, insert: 'bar' },
      { path: 'a.ts', from: 12, to: 15, insert: 'bar' },
      { path: 'b.ts', from: 0, to: 3, insert: 'bar' },
      { path: 'khong-co.ts', from: 0, to: 0, insert: 'x' },
    ]);
    expect(out).toEqual({ 'a.ts': 'const bar = bar + 1;', 'b.ts': 'bar' });
    expect(files['a.ts']).toBe('const foo = foo + 1;');
  });

  it('isEditedFile chỉ tính file code đã khác bản đã lưu', () => {
    const saved = { 'a.ts': '1', 'b.ts': '2' };
    const now = { 'a.ts': '1', 'b.ts': '3' };
    expect(isEditedFile('a.ts', now, saved)).toBe(false);
    expect(isEditedFile('b.ts', now, saved)).toBe(true);
    expect(isEditedFile('lib:react.d.ts', now, saved)).toBe(false);
    expect(isEditedFile('assets/x.png', now, saved)).toBe(false);
  });

  it('formatChangedFiles chỉ định dạng file đã sửa và giữ nguyên file lỗi', async () => {
    const saved = { 'a.ts': 'x', 'b.ts': 'y', 'c.ts': 'z' };
    const files = { 'a.ts': 'x', 'b.ts': 'y  ', 'c.ts': 'lỗi', 'd.txt': 'khác' };
    const format = async (_path: string, text: string) => {
      if (text === 'lỗi') throw new Error('cú pháp');
      return text.trim();
    };
    const result = await formatChangedFiles(files, saved, format);
    expect(result).toEqual({ files: { ...files, 'b.ts': 'y' }, changed: true });
    expect(await formatChangedFiles(saved, saved, format)).toEqual({
      files: saved,
      changed: false,
    });
  });
});
