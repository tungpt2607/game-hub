import { useEffect, useState, type RefObject } from 'react';
import { DESIGN_H, DESIGN_W } from './config';

export function useStageScale(ref: RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setScale(Math.min(width / DESIGN_W, height / DESIGN_H));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return scale;
}
