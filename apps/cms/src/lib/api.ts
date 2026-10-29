import { t } from '@opes/i18n';

/** Lỗi từ API, mang mã lỗi và lỗi theo từng ô nhập để giao diện hiển thị. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Gọi API quản trị qua đường dẫn /api/admin/* (cùng tên miền với CMS nên cookie đăng nhập đi kèm). */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', t('common.networkError'));
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; fields?: Record<string, string>; details?: unknown } }
    | null;
  if (!res.ok) {
    const error = data?.error;
    throw new ApiRequestError(
      res.status,
      error?.code ?? `HTTP_${res.status}`,
      error?.message ?? t('common.networkError'),
      error?.fields ?? {},
      error?.details,
    );
  }
  return data as T;
}

/** Chuyển về trang đăng nhập khi phiên hết hạn, hoặc trang đổi mật khẩu khi bắt buộc. */
export function handleAuthError(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return false;
  if (error.status === 401) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?next=${next}`;
    return true;
  }
  if (error.code === 'PASSWORD_CHANGE_REQUIRED') {
    window.location.href = '/change-password';
    return true;
  }
  return false;
}
