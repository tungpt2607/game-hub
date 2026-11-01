import { useEffect, useRef, useState } from 'react';
import type { PanelTab, ReferenceItem } from './BottomPanel';

/**
 * Trạng thái bảng dưới (Vấn đề / Tham chiếu). Tự mở bảng Vấn đề khi vừa xuất hiện lỗi biên dịch
 * (lỗi này chặn phát hành).
 */
export function useBottomPanel(buildErrorCount: number) {
  const [panel, setPanel] = useState<{ open: boolean; tab: PanelTab }>({
    open: false,
    tab: 'problems',
  });
  const [references, setReferences] = useState<{ title: string; items: ReferenceItem[] } | null>(
    null,
  );

  const prevBuildErrors = useRef(0);
  useEffect(() => {
    if (buildErrorCount > 0 && prevBuildErrors.current === 0)
      setPanel({ open: true, tab: 'problems' });
    prevBuildErrors.current = buildErrorCount;
  }, [buildErrorCount]);

  return {
    panel,
    references,
    showTab: (tab: PanelTab) => setPanel({ open: true, tab }),
    /** Mở bảng Vấn đề; đang mở đúng bảng này thì đóng. */
    toggleProblems: () =>
      setPanel((s) => ({ open: !s.open || s.tab !== 'problems', tab: 'problems' })),
    close: () => setPanel((s) => ({ ...s, open: false })),
    showReferences: (title: string, items: ReferenceItem[]) => {
      setReferences({ title, items });
      setPanel({ open: true, tab: 'references' });
    },
  };
}
