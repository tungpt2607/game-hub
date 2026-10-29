import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ZodSchema } from 'zod';
import { ErrorCode } from '@opes/contracts';

/** Lỗi nghiệp vụ; trình xử lý lỗi chung chuyển nó thành JSON `{ error: { code, message, ... } }`. */
export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly extra: { fields?: Record<string, string>; details?: unknown } = {},
  ) {
    super(message);
  }
}

/** Kiểm tra dữ liệu gửi lên theo lược đồ Zod; sai thì báo lỗi theo từng ô nhập. */
export function parseInput<T>(schema: ZodSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  const first = Object.values(fields)[0] ?? 'Dữ liệu không hợp lệ.';
  throw new AppError(400, ErrorCode.VALIDATION, first, { fields });
}

/** Đọc JSON trong body; body hỏng thì báo lỗi dữ liệu. */
export async function readJson(req: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, ErrorCode.VALIDATION, 'Dữ liệu gửi lên không phải JSON hợp lệ.');
  }
}
