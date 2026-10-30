import type { GameAssets, GameFiles } from './types';

/**
 * Bản tạm trên trình duyệt (giống "hot exit" của VS Code): giữ thay đổi chưa lưu nháp khi tab bị đóng,
 * trình duyệt treo, máy hết pin… Không tự khôi phục: khi mở lại, CMS hỏi Khôi phục / Bỏ đi.
 * Chỉ nằm trên trình duyệt của máy này; mọi lỗi của localStorage (chế độ riêng tư, đầy bộ nhớ) đều bỏ qua.
 */

export interface LocalDraft {
  files: GameFiles;
  assets: GameAssets;
  /** Bản nháp trên máy chủ lúc bắt đầu sửa (thời điểm lưu nháp, hoặc phiên bản nếu chưa có nháp). */
  base: string;
  savedAt: string;
}

const KEY = (moduleKey: string) => `opes:ban-tam:${moduleKey}`;

export function readLocalDraft(moduleKey: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(KEY(moduleKey));
    if (!raw) return null;
    const data = JSON.parse(raw) as LocalDraft;
    return data && typeof data.files === 'object' && typeof data.assets === 'object' ? data : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(moduleKey: string, draft: LocalDraft): void {
  try {
    localStorage.setItem(KEY(moduleKey), JSON.stringify(draft));
  } catch {
    // Hết chỗ hoặc bị chặn: bỏ qua, vẫn còn hộp hỏi khi rời trang.
  }
}

export function clearLocalDraft(moduleKey: string): void {
  try {
    localStorage.removeItem(KEY(moduleKey));
  } catch {
    // bỏ qua
  }
}
