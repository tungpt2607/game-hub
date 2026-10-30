'use client';

import { useEffect, useRef } from 'react';
import { redo, undo } from '@codemirror/commands';
import { closeSearchPanel, openSearchPanel, searchPanelOpen } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { baseExtensions, fileExtensions } from './editor/setup';

/**
 * Trình sửa code (CodeMirror 6, đóng gói sẵn trong CMS, không tải gì từ mạng ngoài).
 * Mỗi file giữ trạng thái riêng (lịch sử hoàn tác, vị trí con trỏ) khi chuyển qua lại.
 * File có tiền tố "lib:" (thư viện React, module-sdk) mở ở chế độ chỉ đọc.
 */

export interface EditorApi {
  /** Nhảy tới dòng (bắt đầu từ 1) và cột (bắt đầu từ 0), cuộn cho dòng nằm giữa. */
  goTo(line: number, column: number): void;
  /** Nhảy tới vị trí (số ký tự từ đầu file), có thể chọn đoạn [pos, end). */
  goToOffset(pos: number, end?: number): void;
  /** File và vị trí con trỏ hiện tại. */
  cursor(): { path: string; pos: number };
  /** Thay toàn bộ nội dung (ví dụ sau khi định dạng), giữ lịch sử hoàn tác. */
  replaceAll(text: string): void;
  focus(): void;
  undo(): void;
  redo(): void;
  /** Mở hộp tìm/thay, đang mở thì đóng (dùng cho nút trên điện thoại, nơi không có Ctrl+F). */
  toggleSearch(): void;
}

export interface CursorInfo {
  path: string;
  pos: number;
  line: number;
  column: number;
}

export function CodeEditor({
  path,
  value,
  shared,
  onChange,
  onCursor,
  onMount,
  height,
}: {
  path: string;
  value: string;
  /** Phần mở rộng dùng chung cho mọi file (gợi ý TypeScript…); phải giữ nguyên giữa các lần render. */
  shared: Extension;
  onChange: (value: string) => void;
  onCursor?: (info: CursorInfo) => void;
  onMount?: (editor: EditorApi) => void;
  height: number | string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  /** Trạng thái riêng của từng file đã mở. */
  const states = useRef(new Map<string, EditorState>());
  const currentPath = useRef(path);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorRef = useRef(onCursor);
  onCursorRef.current = onCursor;

  const reportCursor = (state: EditorState) => {
    const pos = state.selection.main.head;
    const line = state.doc.lineAt(pos);
    onCursorRef.current?.({ path: currentPath.current, pos, line: line.number, column: pos - line.from });
  };

  const makeState = (forPath: string, doc: string) =>
    EditorState.create({
      doc,
      extensions: [
        baseExtensions,
        fileExtensions(forPath, forPath.startsWith('lib:')),
        shared,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !update.state.readOnly) onChangeRef.current(update.state.doc.toString());
          if (update.docChanged || update.selectionSet) reportCursor(update.state);
        }),
      ],
    });

  // Tạo trình sửa một lần.
  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({ state: makeState(path, value), parent: host.current });
    view.current = v;
    currentPath.current = path;
    reportCursor(v.state);
    const select = (from: number, to = from) => {
      const len = v.state.doc.length;
      const anchor = Math.max(0, Math.min(from, len));
      const head = Math.max(0, Math.min(to, len));
      v.dispatch({ selection: { anchor, head }, effects: EditorView.scrollIntoView(anchor, { y: 'center' }) });
      v.focus();
    };
    onMount?.({
      goTo(line, column) {
        const doc = v.state.doc;
        const info = doc.line(Math.max(1, Math.min(line, doc.lines)));
        select(Math.min(info.from + Math.max(0, column), info.to));
      },
      goToOffset: (pos, end) => select(pos, end ?? pos),
      cursor: () => ({ path: currentPath.current, pos: v.state.selection.main.head }),
      replaceAll(text) {
        const current = v.state.doc.toString();
        if (current === text) return;
        const head = Math.min(v.state.selection.main.head, text.length);
        v.dispatch({ changes: { from: 0, to: current.length, insert: text }, selection: { anchor: head } });
      },
      focus: () => v.focus(),
      undo: () => {
        undo(v);
        v.focus();
      },
      redo: () => {
        redo(v);
        v.focus();
      },
      toggleSearch: () => {
        if (searchPanelOpen(v.state)) closeSearchPanel(v);
        else openSearchPanel(v);
      },
    });
    const saved = states.current;
    return () => {
      v.destroy();
      view.current = null;
      saved.clear();
    };
    // Chỉ tạo khi gắn vào trang; đổi file và nội dung xử lý ở các effect bên dưới.
  }, []);

  // Đổi file: lưu trạng thái file cũ, mở trạng thái file mới (hoặc tạo mới).
  useEffect(() => {
    const v = view.current;
    if (!v || currentPath.current === path) return;
    states.current.set(currentPath.current, v.state);
    const saved = states.current.get(path);
    currentPath.current = path;
    v.setState(saved && saved.doc.toString() === value ? saved : makeState(path, value));
    reportCursor(v.state);
  }, [path]);

  // Nội dung đổi từ bên ngoài (tải .zip, đổi tên ký hiệu, tìm và thay trong cả game…): thay nội dung, giữ lịch sử hoàn tác.
  useEffect(() => {
    const v = view.current;
    if (!v || currentPath.current !== path) return;
    const current = v.state.doc.toString();
    if (current !== value) v.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value, path]);

  return <div ref={host} style={{ height, overflow: 'hidden' }} />;
}
