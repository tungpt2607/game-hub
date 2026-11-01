import { useEffect, useRef, useState, type RefObject } from 'react';
import type { EditorApi } from './CodeEditor';
import { useNavHistory, type NavLocation } from './useNavHistory';

/**
 * Mở file và nhảy tới vị trí, lưu lịch sử vị trí để quay lại / tiến tới (Alt+← / Alt+→).
 * Vị trí được áp sau khi trình sửa đã mở đúng file.
 */
export function useEditorNavigation({
  editor,
  codePath,
  openFile,
  prepare,
}: {
  editor: RefObject<EditorApi | null>;
  /** File code đang mở trong trình sửa. */
  codePath: string | null;
  openFile: (path: string, pin: boolean) => void;
  /** Chuẩn bị trước khi mở (ví dụ tải file thư viện chỉ đọc); trả về false thì không mở. */
  prepare: (path: string) => Promise<boolean>;
}) {
  const nav = useNavHistory();
  const pendingJump = useRef<{ path: string; from: number; to?: number } | null>(null);
  const [, setJumpTick] = useState(0);

  // Nhảy tới vị trí sau khi trình sửa đã mở đúng file (chạy sau mỗi lần vẽ, rất nhẹ).
  useEffect(() => {
    const jump = pendingJump.current;
    if (jump && jump.path === codePath && editor.current) {
      pendingJump.current = null;
      editor.current.goToOffset(jump.from, jump.to);
    }
  });

  /** Vị trí con trỏ hiện tại. */
  const here = (): NavLocation | null =>
    editor.current && codePath ? editor.current.cursor() : null;

  /** Mở file và nhảy tới vị trí; lưu vị trí cũ (trừ khi `record` = false) để quay lại. */
  const navigate = async (path: string, from: number, to?: number, record = true) => {
    if (record) nav.push(here());
    if (!(await prepare(path))) return;
    pendingJump.current = { path, from, to };
    openFile(path, true);
    setJumpTick((n) => n + 1);
  };

  const goBack = () => {
    const target = nav.goBack(here());
    if (target) void navigate(target.path, target.pos, undefined, false);
  };
  const goForward = () => {
    const target = nav.goForward(here());
    if (target) void navigate(target.path, target.pos, undefined, false);
  };
  /** Hàm chạy `fn` tại vị trí con trỏ (bỏ qua nếu chưa mở file code). */
  const atCursor = (fn: (path: string, pos: number) => void) => () => {
    const c = here();
    if (c) fn(c.path, c.pos);
  };
  /** Ghi vị trí hiện tại vào lịch sử (trước khi mở file theo cách khác). */
  const remember = () => nav.push(here());

  return { navigate, goBack, goForward, atCursor, remember, canBack: nav.canBack };
}
