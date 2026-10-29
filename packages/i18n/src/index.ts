import { vi } from './vi';

export { vi };

type Messages = { [key: string]: string | Messages };

const dictionaries: Record<string, Messages> = { vi };

export type Locale = 'vi';

/**
 * Lấy chuỗi giao diện theo khóa dạng "cms.login.heading".
 * Biến trong chuỗi viết dạng {ten} và được thay bằng giá trị trong `vars`.
 * Khóa không tồn tại thì trả về chính khóa, để dễ phát hiện khi xem giao diện.
 */
export function t(
  key: string,
  vars?: Record<string, string | number>,
  locale: Locale = 'vi',
): string {
  let node: string | Messages | undefined = dictionaries[locale];
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return key;
    node = node[part];
  }
  if (typeof node !== 'string') return key;
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
