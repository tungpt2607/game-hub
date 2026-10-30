/**
 * Kiểu của module ảo `opes:assets` (CMS tự tạo khi biên dịch từ thư mục assets/ của gói).
 * Giữ file này trong gói để trình sửa code (VS Code…) hiểu `import { asset } from 'opes:assets'`.
 */
declare module 'opes:assets' {
  import type { MediaRef } from '@opes/module-sdk/core';
  /** Địa chỉ của từng file, theo đường dẫn trong assets/ (ví dụ "hop-qua.svg"). */
  const urls: Record<string, string>;
  export default urls;
  /** MediaRef của một file trong assets/, dùng được cho trường ảnh, âm thanh, font và emojiOrImage. */
  export function asset(path: string, name?: string): MediaRef;
}
