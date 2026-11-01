import { useEffect, useRef } from 'react';
import type { Command } from './commands';

/**
 * Phím tắt toàn trang của khu sửa code (Ctrl+P, Ctrl+Shift+P, Ctrl+S, Ctrl+Shift+F, Ctrl+Shift+O, Alt+←/→).
 * Gắn một lần; luôn gọi danh sách lệnh mới nhất.
 */
export function useCommandShortcuts(commands: Command[]) {
  const latest = useRef(commands);
  latest.current = commands;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const run = (id: string) => {
        e.preventDefault();
        latest.current.find((c) => c.id === id)?.run();
      };
      if (mod && !e.altKey && key === 'p') run(e.shiftKey ? 'commands' : 'quickOpen');
      else if (mod && !e.altKey && !e.shiftKey && key === 's') run('save');
      else if (mod && e.shiftKey && !e.altKey && key === 'f') run('searchAll');
      else if (mod && e.shiftKey && !e.altKey && key === 'o') run('outline');
      else if (e.altKey && !mod && e.key === 'ArrowLeft') run('back');
      else if (e.altKey && !mod && e.key === 'ArrowRight') run('forward');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
