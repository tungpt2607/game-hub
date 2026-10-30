'use client';

import { useCallback, useState } from 'react';

/**
 * Các tab file đang mở, giống VS Code:
 * - bấm một lần vào file → mở ở "tab xem tạm" (chữ nghiêng), mở file khác sẽ thay vào chỗ đó;
 * - bấm đúp, hoặc bắt đầu sửa → tab được giữ lại.
 */
export interface Tab {
  path: string;
  /** Tab xem tạm. */
  preview: boolean;
}

export interface TabsState {
  tabs: Tab[];
  active: string | null;
}

export function useTabs(initial: string | null) {
  const [state, setState] = useState<TabsState>({
    tabs: initial ? [{ path: initial, preview: false }] : [],
    active: initial,
  });

  /** Mở file; `pin` = giữ tab (không phải xem tạm). */
  const open = useCallback((path: string, pin = false) => {
    setState((s) => {
      const existing = s.tabs.find((t) => t.path === path);
      if (existing) {
        const tabs = pin && existing.preview ? s.tabs.map((t) => (t.path === path ? { ...t, preview: false } : t)) : s.tabs;
        return { tabs, active: path };
      }
      const previewIndex = pin ? -1 : s.tabs.findIndex((t) => t.preview);
      const tab = { path, preview: !pin };
      if (previewIndex >= 0) {
        const tabs = [...s.tabs];
        tabs[previewIndex] = tab;
        return { tabs, active: path };
      }
      // Mở ngay bên phải tab đang xem.
      const at = s.active ? s.tabs.findIndex((t) => t.path === s.active) + 1 : s.tabs.length;
      const tabs = [...s.tabs];
      tabs.splice(at, 0, tab);
      return { tabs, active: path };
    });
  }, []);

  const pin = useCallback((path: string) => {
    setState((s) =>
      s.tabs.some((t) => t.path === path && t.preview)
        ? { ...s, tabs: s.tabs.map((t) => (t.path === path ? { ...t, preview: false } : t)) }
        : s,
    );
  }, []);

  /** Đóng tab; tab đang xem bị đóng thì chuyển sang tab bên cạnh. */
  const close = useCallback((path: string) => {
    setState((s) => {
      const index = s.tabs.findIndex((t) => t.path === path);
      if (index < 0) return s;
      const tabs = s.tabs.filter((t) => t.path !== path);
      const active = s.active === path ? (tabs[Math.min(index, tabs.length - 1)]?.path ?? null) : s.active;
      return { tabs, active };
    });
  }, []);

  const activate = useCallback((path: string) => setState((s) => ({ ...s, active: path })), []);

  /** File bị đổi tên/di chuyển: đổi đường dẫn của tab theo. */
  const rename = useCallback((moves: [string, string][]) => {
    if (!moves.length) return;
    const map = new Map(moves);
    setState((s) => ({
      tabs: s.tabs.map((t) => ({ ...t, path: map.get(t.path) ?? t.path })),
      active: s.active ? (map.get(s.active) ?? s.active) : null,
    }));
  }, []);

  /** Đóng mọi tab không còn file (sau khi xóa, tải .zip khác…). */
  const keepOnly = useCallback((exists: (path: string) => boolean) => {
    setState((s) => {
      const tabs = s.tabs.filter((t) => exists(t.path));
      if (tabs.length === s.tabs.length) return s;
      const active = s.active && exists(s.active) ? s.active : (tabs[tabs.length - 1]?.path ?? null);
      return { tabs, active };
    });
  }, []);

  return { ...state, open, pin, close, activate, rename, keepOnly };
}
