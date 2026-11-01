import { useEffect } from 'react';
import { clearLocalDraft, writeLocalDraft } from './localDraft';
import type { GameAssets, GameFiles } from './types';

/** Chờ ngừng sửa bao lâu (ms) rồi mới ghi bản tạm. */
const SAVE_DELAY = 1000;

/**
 * Bản tạm trên trình duyệt: ghi sau khi ngừng sửa 1 giây; hết thay đổi so với bản đã lưu thì xóa.
 * `paused` (đang hỏi người dùng khôi phục bản tạm cũ) thì để nguyên, không ghi đè.
 */
export function useLocalDraftAutosave({
  moduleKey,
  paused,
  dirty,
  files,
  assets,
  base,
}: {
  /** null khi game chưa tải xong. */
  moduleKey: string | null;
  paused: boolean;
  dirty: boolean;
  files: GameFiles;
  assets: GameAssets;
  /** Bản trên máy chủ mà bản tạm dựa vào (để báo khi bản tạm đã cũ). */
  base: string;
}) {
  useEffect(() => {
    if (!moduleKey || paused) return;
    if (!dirty) {
      clearLocalDraft(moduleKey);
      return;
    }
    const timer = setTimeout(() => {
      writeLocalDraft(moduleKey, { files, assets, base, savedAt: new Date().toISOString() });
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [moduleKey, paused, dirty, files, assets, base]);
}
