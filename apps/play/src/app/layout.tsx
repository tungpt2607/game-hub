import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { t } from '@opes/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: t('play.title'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
