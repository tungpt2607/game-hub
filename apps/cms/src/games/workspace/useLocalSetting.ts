'use client';

import { useCallback, useEffect, useState } from 'react';

/** Một tùy chọn nhỏ nhớ trên trình duyệt (ví dụ tự định dạng khi lưu); lỗi localStorage thì dùng mặc định. */
export function useLocalSetting(key: string, initial: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(raw === 'true');
    } catch {
      // bỏ qua
    }
  }, [key]);
  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // bỏ qua
      }
    },
    [key],
  );
  return [value, update];
}
