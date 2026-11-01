/**
 * Định dạng ngày giờ dùng chung cho toàn CMS. Mọi chỗ hiển thị ngày giờ phải gọi các hàm ở đây
 * (ESLint chặn gọi toLocaleString/toLocaleDateString trực tiếp), để cả CMS hiển thị thống nhất.
 */

const LOCALE = 'vi-VN';

/** Ngày giờ ngắn, ví dụ "14:05 1/11/26". */
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' });

/** Chỉ ngày, ví dụ "1/11/2026". */
export const formatDay = (iso: string) => new Date(iso).toLocaleDateString(LOCALE);
