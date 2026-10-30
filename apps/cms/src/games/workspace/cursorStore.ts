'use client';

import { useSyncExternalStore } from 'react';
import type { CursorInfo } from './CodeEditor';

/**
 * Vị trí con trỏ của trình sửa, tách khỏi state của khu sửa code: con trỏ đổi liên tục khi gõ, chỉ thanh
 * trạng thái và thanh đường dẫn cần vẽ lại, không phải cả khu sửa code.
 */
export function createCursorStore() {
  let value: CursorInfo | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: CursorInfo) {
      if (value && value.path === next.path && value.pos === next.pos) return;
      value = next;
      for (const l of listeners) l();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type CursorStore = ReturnType<typeof createCursorStore>;

export function useCursor(store: CursorStore): CursorInfo | null {
  return useSyncExternalStore(store.subscribe, store.get, () => null);
}
