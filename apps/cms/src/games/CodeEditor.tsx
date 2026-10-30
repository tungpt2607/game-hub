'use client';

import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState, type Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { extOf } from './zip';

/**
 * Trình sửa code (CodeMirror 6, đóng gói sẵn trong CMS, không tải gì từ mạng ngoài).
 * Có tô màu, tìm/thay (Ctrl+F, Esc để đóng), gập code, nhiều con trỏ; dùng được trên điện thoại.
 * Mỗi file giữ trạng thái riêng (lịch sử hoàn tác, vị trí con trỏ) khi chuyển qua lại.
 */

export interface EditorApi {
  /** Nhảy tới dòng (bắt đầu từ 1) và cột (bắt đầu từ 0), cuộn cho dòng nằm giữa. */
  goTo(line: number, column: number): void;
  focus(): void;
}

function languageFor(path: string): Extension {
  switch (extOf(path)) {
    case 'ts':
      return javascript({ typescript: true });
    case 'tsx':
      return javascript({ typescript: true, jsx: true });
    case 'js':
      return javascript();
    case 'jsx':
      return javascript({ jsx: true });
    case 'json':
      return json();
    case 'md':
      return markdown();
    default:
      return [];
  }
}

const baseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px' },
  '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
});

export function CodeEditor({
  path,
  value,
  onChange,
  onMount,
  height,
}: {
  path: string;
  value: string;
  onChange: (value: string) => void;
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

  const makeState = (forPath: string, doc: string) =>
    EditorState.create({
      doc,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        languageFor(forPath),
        oneDark,
        baseTheme,
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

  // Tạo trình sửa một lần.
  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({ state: makeState(path, value), parent: host.current });
    view.current = v;
    currentPath.current = path;
    onMount?.({
      goTo(line, column) {
        const doc = v.state.doc;
        const info = doc.line(Math.max(1, Math.min(line, doc.lines)));
        const pos = Math.min(info.from + Math.max(0, column), info.to);
        v.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
        v.focus();
      },
      focus: () => v.focus(),
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
    v.setState(saved && saved.doc.toString() === value ? saved : makeState(path, value));
    currentPath.current = path;
  }, [path]);

  // Nội dung đổi từ bên ngoài (tải .zip, lấy phiên bản cũ…): thay nội dung, giữ lịch sử hoàn tác.
  useEffect(() => {
    const v = view.current;
    if (!v || currentPath.current !== path) return;
    const current = v.state.doc.toString();
    if (current !== value) v.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value, path]);

  return <div ref={host} style={{ height, overflow: 'hidden' }} />;
}
