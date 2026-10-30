import { describe, expect, it } from 'vitest';
import { diffPackages, sameAssets, sameFiles } from './changes';
import { countChanges, diffLines, toHunks } from './lineDiff';

const asset = (sha: string) => ({ url: '/m', size: 1, mime: 'image/png', sha256: sha.padEnd(64, '0') });

describe('so sánh gói game', () => {
  it('sameFiles / sameAssets so theo nội dung', () => {
    expect(sameFiles({ a: '1', b: '2' }, { b: '2', a: '1' })).toBe(true);
    expect(sameFiles({ a: '1' }, { a: '1 ' })).toBe(false);
    expect(sameFiles({ a: '1' }, { a: '1', b: '' })).toBe(false);
    expect(sameAssets({ x: asset('a') }, { x: { ...asset('a'), url: '/khac' } })).toBe(true);
    expect(sameAssets({ x: asset('a') }, { x: asset('b') })).toBe(false);
  });

  it('diffPackages liệt kê file thêm, xóa, sửa', () => {
    const changes = diffPackages(
      { files: { 'a.ts': '1', 'b.ts': '2' }, assets: { 'x.png': asset('a'), 'y.png': asset('b') } },
      { files: { 'a.ts': '1', 'b.ts': '3', 'c.ts': '' }, assets: { 'x.png': asset('c') } },
    );
    expect(changes.map((c) => `${c.kind} ${c.path}`)).toEqual([
      'modified assets/x.png',
      'removed assets/y.png',
      'modified b.ts',
      'added c.ts',
    ]);
  });
});

describe('diffLines', () => {
  it('tìm dòng thêm và xóa, giữ số dòng', () => {
    const lines = diffLines('a\nb\nc\nd', 'a\nB\nc\nd\ne')!;
    expect(lines.map((l) => `${l.type[0]}${l.text}`)).toEqual(['sa', 'db', 'aB', 'sc', 'sd', 'ae']);
    expect(countChanges(lines)).toEqual({ added: 2, removed: 1 });
    expect(lines.find((l) => l.text === 'e')!.newNo).toBe(5);
  });

  it('gom thành đoạn có ngữ cảnh', () => {
    const before = Array.from({ length: 30 }, (_, i) => `dòng ${i}`).join('\n');
    const after = before.replace('dòng 2', 'X').replace('dòng 25', 'Y');
    const hunks = toHunks(diffLines(before, after)!, 2);
    expect(hunks).toHaveLength(2);
    expect(hunks[0]!.lines.map((l) => l.text)).toEqual(['dòng 0', 'dòng 1', 'dòng 2', 'X', 'dòng 3', 'dòng 4']);
  });

  it('file mới hoặc bị xóa', () => {
    expect(countChanges(diffLines('', 'a\nb')!)).toEqual({ added: 2, removed: 0 });
    expect(countChanges(diffLines('a', '')!)).toEqual({ added: 0, removed: 1 });
  });
});
