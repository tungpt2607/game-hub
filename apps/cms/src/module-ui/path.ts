/** Đọc/ghi giá trị theo đường dẫn dạng "items.0.points", không sửa object gốc. */
export type Path = (string | number)[];

export const pathKey = (path: Path) => path.join('.');

export function getIn(value: unknown, path: Path): unknown {
  let node = value;
  for (const part of path) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string | number, unknown>)[part];
  }
  return node;
}

export function setIn<T>(value: T, path: Path, next: unknown): T {
  if (path.length === 0) return next as T;
  const [head, ...rest] = path as [string | number, ...Path];
  if (Array.isArray(value)) {
    const copy = [...value];
    copy[head as number] = setIn(copy[head as number], rest, next);
    return copy as T;
  }
  const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return { ...obj, [head]: setIn(obj[head as string], rest, next) } as T;
}
