import { describe, expect, it } from 'vitest';
import { replaceInFiles, searchFiles } from './searchAll';

const files = {
  'a.ts': 'const score = 1;\nconst Score = 2;\nscoreBoard();',
  'b/c.tsx': 'export function x() {\n  return score + 1;\n}',
};
const opts = { query: 'score', caseSensitive: false, wholeWord: false, regexp: false };

describe('searchFiles', () => {
  it('tìm mọi file, có dòng và đoạn xem trước', () => {
    const r = searchFiles(files, opts);
    expect(r.total).toBe(4);
    expect(r.files.map((f) => f.path)).toEqual(['a.ts', 'b/c.tsx']);
    const m = r.files[1]!.matches[0]!;
    expect(m.line).toBe(2);
    expect(m.preview.slice(m.previewFrom, m.previewTo)).toBe('score');
  });

  it('phân biệt hoa thường, nguyên từ, biểu thức chính quy', () => {
    expect(searchFiles(files, { ...opts, caseSensitive: true }).total).toBe(3);
    expect(searchFiles(files, { ...opts, wholeWord: true }).total).toBe(3);
    expect(searchFiles(files, { ...opts, query: 'sc(o)re\\b', regexp: true }).total).toBe(3);
    expect(searchFiles(files, { ...opts, query: '(', regexp: true }).error).toBeTruthy();
    expect(searchFiles(files, { ...opts, query: '' }).total).toBe(0);
  });
});

describe('replaceInFiles', () => {
  it('thay nguyên văn và theo nhóm của biểu thức chính quy', () => {
    const r = replaceInFiles(files, { ...opts, wholeWord: true, caseSensitive: true }, 'diem');
    expect(r.count).toBe(2);
    expect(r.files['a.ts']).toBe('const diem = 1;\nconst Score = 2;\nscoreBoard();');
    const g = replaceInFiles(files, { ...opts, query: 'const (\\w+)', regexp: true }, 'let $1');
    expect(g.files['a.ts']!.startsWith('let score = 1;\nlet Score')).toBe(true);
  });

  it('chỉ thay trong các file được chọn', () => {
    const r = replaceInFiles(files, opts, 'x', ['b/c.tsx']);
    expect(r.count).toBe(1);
    expect(r.files['a.ts']).toBe(files['a.ts']);
  });
});
