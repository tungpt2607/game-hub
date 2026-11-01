import { useEffect, useState } from 'react';

/**
 * Giá trị chỉ cập nhật sau khi `value` đứng yên `delay` mili giây. Dùng cho ô tìm kiếm để không gọi API
 * sau mỗi phím gõ.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
