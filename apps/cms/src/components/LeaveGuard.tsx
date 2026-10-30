'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@opes/i18n';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Hỏi trước khi rời trang khi còn thay đổi chưa lưu (`when`):
 * - đóng tab, tải lại, gõ địa chỉ khác: hộp hỏi của trình duyệt;
 * - bấm link bên trong CMS (menu, nút quay lại…): hộp "Rời trang?" của CMS.
 * Nút Back của trình duyệt không chặn được an toàn với Next.js; khi đó bản tạm trên trình duyệt giữ lại thay đổi.
 */
export function LeaveGuard({ when }: { when: boolean }) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Trình duyệt cũ cần returnValue để hiện hộp hỏi.
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      // Chặn trước khi Link của Next.js xử lý (bắt ở pha capture).
      e.preventDefault();
      e.stopPropagation();
      setTarget(url.pathname + url.search + url.hash);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [when]);

  return (
    <ConfirmDialog
      open={target !== null}
      title={t('cms.leave.title')}
      text={t('cms.leave.text')}
      confirmLabel={t('cms.leave.leave')}
      cancelLabel={t('cms.leave.stay')}
      danger
      onConfirm={() => {
        const href = target;
        setTarget(null);
        if (href) router.push(href);
      }}
      onClose={() => setTarget(null)}
    />
  );
}
