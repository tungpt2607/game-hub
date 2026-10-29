import { createHmac, randomBytes } from 'node:crypto';
import { argon2Verify, argon2id } from 'hash-wasm';

/**
 * Băm mật khẩu bằng Argon2id (thông số theo khuyến nghị OWASP: 19 MiB, 2 vòng).
 * Dùng hash-wasm (WebAssembly thuần) để chạy được cả trên Vercel lẫn Docker mà không cần thư viện native.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'encoded',
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}

/** Chuỗi ngẫu nhiên an toàn, mã hóa base64url. 16 byte → 22 ký tự. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Bản băm của mã phiên để lưu trong cơ sở dữ liệu (HMAC-SHA256 với SESSION_SECRET). */
export function hashToken(token: string, secret: string): string {
  return createHmac('sha256', secret).update(token).digest('base64url');
}

const PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Mật khẩu tạm dễ đọc (bỏ các ký tự dễ nhầm 0/O, 1/l/I), dạng xxxx-xxxx-xxxx. */
export function temporaryPassword(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join('')).join('-');
}
