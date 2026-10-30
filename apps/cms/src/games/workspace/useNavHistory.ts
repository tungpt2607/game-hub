'use client';

import { useCallback, useRef, useState } from 'react';

export interface NavLocation {
  path: string;
  pos: number;
}

const LIMIT = 50;

/**
 * Lịch sử điều hướng giống VS Code (Alt+← / Alt+→): mỗi lần nhảy (định nghĩa, tham chiếu, lỗi, tìm file…)
 * lưu vị trí trước khi nhảy để quay lại.
 */
export function useNavHistory() {
  const back = useRef<NavLocation[]>([]);
  const forward = useRef<NavLocation[]>([]);
  const [, bump] = useState(0);

  /** Gọi trước khi nhảy, với vị trí hiện tại. */
  const push = useCallback((from: NavLocation | null) => {
    if (!from) return;
    const last = back.current[back.current.length - 1];
    if (!last || last.path !== from.path || last.pos !== from.pos) back.current.push(from);
    if (back.current.length > LIMIT) back.current.shift();
    forward.current = [];
    bump((n) => n + 1);
  }, []);

  /** Quay lại; `current` là vị trí hiện tại (được đưa sang "đi tiếp"). */
  const goBack = useCallback((current: NavLocation | null): NavLocation | null => {
    const target = back.current.pop() ?? null;
    if (target && current) forward.current.push(current);
    bump((n) => n + 1);
    return target;
  }, []);

  const goForward = useCallback((current: NavLocation | null): NavLocation | null => {
    const target = forward.current.pop() ?? null;
    if (target && current) back.current.push(current);
    bump((n) => n + 1);
    return target;
  }, []);

  return {
    push,
    goBack,
    goForward,
    canBack: back.current.length > 0,
    canForward: forward.current.length > 0,
  };
}
