import type { Metadata } from 'next';
import { TryClient } from './TryClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Link chơi thử /try/<mã>: tải cấu hình template theo mã link và chạy game ngay trong trình duyệt. */
export default async function TryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TryClient token={token} />;
}
