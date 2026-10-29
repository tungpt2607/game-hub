import type { Metadata } from 'next';
import { t } from '@opes/i18n';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Link chơi thử /try/<token>. Bước 6 sẽ tải cấu hình template theo mã link
 * và chạy game hoàn toàn trong trình duyệt.
 */
export default async function TryPage({ params }: { params: Promise<{ token: string }> }) {
  await params;
  return (
    <main className="screen">
      <div className="card" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <h1>{t('play.try.preparing')}</h1>
        <p>{t('play.try.preparingNote')}</p>
      </div>
      <div className="badge">{t('play.try.badge')}</div>
    </main>
  );
}
