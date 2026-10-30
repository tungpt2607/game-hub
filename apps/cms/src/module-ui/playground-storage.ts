/** Nơi nhớ tạm cấu hình Phòng thử module trong trình duyệt (chỉ trên máy này). */
export const PLAYGROUND_STORAGE_KEY = 'opes-playground:v1';

export interface PlaygroundStored {
  moduleKey?: string;
  configs?: Record<string, unknown>;
}

export function readPlayground(): PlaygroundStored {
  try {
    const raw = window.localStorage.getItem(PLAYGROUND_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlaygroundStored) : {};
  } catch {
    return {};
  }
}

export function writePlayground(value: PlaygroundStored) {
  try {
    window.localStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Trình duyệt chặn lưu trữ: phòng thử vẫn chạy, chỉ không nhớ được.
  }
}

/** Cấu hình đang thử của một module, nếu có. */
export function readPlaygroundConfig(moduleKey: string): Record<string, unknown> | null {
  const config = readPlayground().configs?.[moduleKey];
  return config && typeof config === 'object' ? (config as Record<string, unknown>) : null;
}
