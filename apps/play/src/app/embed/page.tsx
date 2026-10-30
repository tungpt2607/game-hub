import type { Metadata } from 'next';
import { EmbedClient } from './EmbedClient';

export const metadata: Metadata = {
  title: 'Xem trước game',
  robots: { index: false, follow: false },
};

/**
 * Khung chạy game cho CMS (nhúng bằng iframe): xem trước, đọc mô tả form và kiểm tra cấu hình.
 * Chỉ CMS được nhúng trang này (frame-ancestors trong next.config.mjs).
 */
export default function EmbedPage() {
  return <EmbedClient />;
}
