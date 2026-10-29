'use client';

import { createContext, useContext } from 'react';
import type { User } from '@opes/contracts';

/** Tài khoản đang đăng nhập; AdminShell nạp và cung cấp cho các trang quản trị. */
export const AuthContext = createContext<User | null>(null);

export function useCurrentUser(): User | null {
  return useContext(AuthContext);
}
