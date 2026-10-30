import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { EditorState, Facet, type Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { extOf } from '../vfs';
import { createSearchPanel, searchPanelTheme } from './searchPanel';

/**
 * Cấu hình CodeMirror dùng chung cho mọi file (thay cho basicSetup để chọn đúng phần cần dùng):
 * số dòng, gập code, lịch sử, ngoặc, chọn nhiều chỗ, khung tìm kiếm kiểu VS Code, giao diện tối.
 * Gợi ý code và lỗi kiểu (TypeScript) được thêm riêng (xem ts/extensions.ts).
 */

/** Đường dẫn của file trong mỗi trạng thái trình sửa (để gợi ý code biết đang ở file nào). */
export const editorPath = Facet.define<string, string>({ combine: (values) => values[0] ?? '' });

/** Màn hình cảm ứng: chữ 16px để iPhone không tự phóng to khi chạm vào ô code. */
const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export function languageFor(path: string): Extension {
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

const baseTheme = () =>
  EditorView.theme({
    '&': { height: '100%', fontSize: isTouch() ? '16px' : '13px' },
    '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
    '.cm-tooltip': { maxWidth: 'min(560px, 90vw)' },
    '.cm-tooltip-autocomplete > ul': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
    '.cm-completionInfo': { whiteSpace: 'pre-wrap', maxWidth: '420px' },
  });

/** Phần chung cho mọi file, tạo một lần. */
export const baseExtensions: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  search({ top: true, createPanel: createSearchPanel }),
  searchPanelTheme,
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap,
    indentWithTab,
  ]),
  oneDark,
  EditorView.lineWrapping,
  EditorState.tabSize.of(2),
];

/** Phần riêng của một file: ngôn ngữ, chỉ đọc, cỡ chữ. */
export function fileExtensions(path: string, readOnly: boolean): Extension {
  return [
    editorPath.of(path),
    languageFor(path),
    baseTheme(),
    readOnly ? EditorState.readOnly.of(true) : [],
  ];
}
