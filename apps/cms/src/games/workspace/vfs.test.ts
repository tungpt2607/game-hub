import { describe, expect, it } from 'vitest';
import {
  buildTree,
  checkFilePath,
  checkFolderPath,
  deleteEntry,
  moveEntry,
  relativePath,
  updateReferences,
  type Workspace,
} from './vfs';

const asset = (n: string) => ({ url: `/media/${n}`, size: 10, mime: 'image/png', sha256: n.padEnd(64, '0').slice(0, 64) });

const ws: Workspace = {
  files: {
    'schema.ts': "import { presets } from './presets';\nimport { x } from './lib/util';\nexport default {};",
    'presets.ts': "import { asset } from 'opes:assets';\nexport const presets = [asset('hoa-mai.png', 'Hoa'), asset(\"tet/nen.png\")];",
    'index.ts': "import s from './schema';\nexport default s;",
    'lib/util.ts': "import { presets } from '../presets';\nexport const x = 1;",
    'Runtime.tsx': '',
  },
  assets: { 'hoa-mai.png': asset('a'), 'tet/nen.png': asset('b') },
  folders: [],
};

describe('buildTree', () => {
  it('thư mục trước, file chính trước, luôn có assets/', () => {
    const tree = buildTree(ws);
    expect(tree.map((n) => n.name)).toEqual(['assets', 'lib', 'schema.ts', 'index.ts', 'presets.ts', 'Runtime.tsx']);
    const assets = tree[0]!;
    expect(assets.children.map((n) => n.path)).toEqual(['assets/tet', 'assets/hoa-mai.png']);
    expect(buildTree({ files: {}, assets: {}, folders: ['components/ui'] }).map((n) => n.path)).toEqual(['assets', 'components']);
  });
});

describe('kiểm tra tên', () => {
  it('code ngoài assets/, file kèm trong assets/, không trùng, không dấu cách', () => {
    expect(checkFilePath(ws, 'utils.ts', 'code')).toBeNull();
    expect(checkFilePath(ws, 'assets/a.ts', 'code')).toContain('assets/');
    expect(checkFilePath(ws, 'a b.ts', 'code')).toContain('dấu cách');
    expect(checkFilePath(ws, 'style.css', 'code')).toContain('.ts');
    expect(checkFilePath(ws, 'schema.ts', 'code')).toContain('trùng');
    expect(checkFilePath(ws, 'lib', 'code')).not.toBeNull();
    expect(checkFilePath(ws, 'hoa.png', 'asset')).toContain('assets/');
    expect(checkFilePath(ws, 'assets/hoa.webp', 'asset', 'assets/hoa-mai.png')).toContain('đuôi');
    expect(checkFolderPath(ws, 'components')).toBeNull();
    expect(checkFolderPath(ws, 'lib')).toContain('trùng');
  });
});

describe('moveEntry', () => {
  it('đổi tên file kèm, giữ nội dung', () => {
    const { ws: next, moves } = moveEntry(ws, 'assets/hoa-mai.png', 'assets/tet/hoa-mai.png');
    expect(moves).toEqual([['assets/hoa-mai.png', 'assets/tet/hoa-mai.png']]);
    expect(next.assets['tet/hoa-mai.png']).toEqual(ws.assets['hoa-mai.png']);
    expect(next.assets['hoa-mai.png']).toBeUndefined();
  });

  it('di chuyển cả thư mục', () => {
    const { ws: next, moves } = moveEntry(ws, 'lib', 'src/lib');
    expect(moves).toEqual([['lib/util.ts', 'src/lib/util.ts']]);
    expect(Object.keys(next.files)).toContain('src/lib/util.ts');
  });

  it('chặn chuyển code vào assets/ và file kèm ra ngoài', () => {
    expect(() => moveEntry(ws, 'presets.ts', 'assets/presets.ts')).toThrow('assets/');
    expect(() => moveEntry(ws, 'assets/hoa-mai.png', 'hoa-mai.png')).toThrow('assets/');
    expect(() => moveEntry(ws, 'lib', 'assets/lib')).toThrow('assets/');
    expect(() => moveEntry(ws, 'assets', 'x')).toThrow();
    expect(() => moveEntry(ws, 'lib', 'lib/con')).toThrow('chính nó');
  });

  it('thư mục rỗng đổi tên được, có file thì không còn là thư mục rỗng', () => {
    const empty = { ...ws, folders: ['components'] };
    expect(moveEntry(empty, 'components', 'ui').ws.folders).toEqual(['ui']);
    const filled = moveEntry(empty, 'Runtime.tsx', 'components/Runtime.tsx').ws;
    expect(filled.folders).toEqual([]);
  });
});

describe('deleteEntry', () => {
  it('xóa thư mục cùng mọi thứ bên trong', () => {
    const next = deleteEntry(ws, 'assets/tet');
    expect(Object.keys(next.assets)).toEqual(['hoa-mai.png']);
    expect(() => deleteEntry(ws, 'assets')).toThrow();
  });
});

describe('updateReferences', () => {
  it('sửa asset(...) khi đổi tên file kèm', () => {
    const { ws: next, moves } = moveEntry(ws, 'assets/hoa-mai.png', 'assets/tet/hoa.png');
    const { files, changes } = updateReferences(ws, next, moves);
    expect(files['presets.ts']).toContain("asset('tet/hoa.png', 'Hoa')");
    expect(changes).toEqual([{ file: 'presets.ts', count: 1 }]);
  });

  it('sửa import tới file vừa chuyển, và import bên trong file vừa chuyển', () => {
    const { ws: next, moves } = moveEntry(ws, 'presets.ts', 'data/presets.ts');
    const { files, changes } = updateReferences(ws, next, moves);
    expect(files['schema.ts']).toContain("from './data/presets'");
    expect(files['lib/util.ts']).toContain("from '../data/presets'");
    expect(changes.map((c) => c.file).sort()).toEqual(['lib/util.ts', 'schema.ts']);

    const moved = moveEntry(ws, 'lib/util.ts', 'util.ts');
    const r = updateReferences(ws, moved.ws, moved.moves);
    expect(r.files['util.ts']).toContain("from './presets'");
    expect(r.files['schema.ts']).toContain("from './util'");
  });

  it('không đổi gì khi không có chỗ trỏ tới', () => {
    const { ws: next, moves } = moveEntry(ws, 'Runtime.tsx', 'App.tsx');
    expect(updateReferences(ws, next, moves).changes).toEqual([]);
  });
});

describe('relativePath', () => {
  it('tính đường dẫn tương đối', () => {
    expect(relativePath('', 'a/b')).toBe('./a/b');
    expect(relativePath('a/b', 'a/c')).toBe('../c');
    expect(relativePath('a', 'a/b')).toBe('./b');
    expect(relativePath('a/b', 'x')).toBe('../../x');
  });
});
