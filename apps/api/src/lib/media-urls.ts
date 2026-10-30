/**
 * Thay địa chỉ kho media bằng đường dẫn "/media/..." trên tên miền của trang đang mở (CMS hoặc trang chơi);
 * hai trang này chuyển tiếp /media/* tới kho.
 */
export function rewriteMediaUrls<T>(value: T, base: string): T {
  if (!base) return value;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return v.startsWith(base) ? `/${v.slice(base.length)}` : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}
