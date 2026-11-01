import {} from 'react';

export function readBest(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}
export function writeBest(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua.
  }
}
