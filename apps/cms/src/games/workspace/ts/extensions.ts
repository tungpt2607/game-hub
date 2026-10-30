import { autocompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { linter, type Diagnostic } from '@codemirror/lint';
import { Facet, type Extension } from '@codemirror/state';
import { EditorView, hoverTooltip, keymap } from '@codemirror/view';
import { t } from '@opes/i18n';
import { editorPath } from '../editor/setup';
import type { TsCompletionEntry } from './protocol';
import type { TsClient } from './tsClient';

/**
 * Gợi ý code, lỗi kiểu, xem kiểu khi rê chuột, Ctrl+bấm để đi tới định nghĩa, và phím tắt kiểu VS Code
 * (F12, Shift+F12, F2, Shift+Alt+F), dựa trên TypeScript chạy trong worker.
 * Thao tác cần mở file khác (định nghĩa, tham chiếu, đổi tên…) được giao cho khu sửa code qua `TsBridge`.
 */

export interface TsBridge {
  client: TsClient;
  goToDefinition(path: string, pos: number): void;
  findReferences(path: string, pos: number): void;
  renameSymbol(path: string, pos: number): void;
  formatDocument(): void;
}

const bridgeFacet = Facet.define<TsBridge, TsBridge | null>({ combine: (v) => v[0] ?? null });

/** File có gợi ý TypeScript (code của game và file thư viện chỉ đọc). */
export const isTsPath = (path: string) => /\.(tsx?|jsx?)$/.test(path) || (path.startsWith('lib:') && path.endsWith('.ts'));

/** Loại gợi ý của TypeScript → biểu tượng của CodeMirror. */
const TYPE: Record<string, string> = {
  function: 'function',
  'local function': 'function',
  method: 'method',
  constructor: 'class',
  class: 'class',
  'local class': 'class',
  interface: 'interface',
  type: 'type',
  enum: 'enum',
  'enum member': 'enum',
  var: 'variable',
  'local var': 'variable',
  let: 'variable',
  const: 'constant',
  parameter: 'variable',
  property: 'property',
  getter: 'property',
  setter: 'property',
  module: 'namespace',
  'external module name': 'namespace',
  keyword: 'keyword',
  string: 'text',
  directory: 'namespace',
  script: 'namespace',
};

function infoNode(detail: string, documentation: string): Node {
  const box = document.createElement('div');
  if (detail) {
    const code = document.createElement('div');
    code.className = 'cm-ts-detail';
    code.textContent = detail;
    box.append(code);
  }
  if (documentation) {
    const doc = document.createElement('div');
    doc.className = 'cm-ts-doc';
    doc.textContent = documentation;
    box.append(doc);
  }
  return box;
}

async function completionSource(ctx: CompletionContext): Promise<CompletionResult | null> {
  const bridge = ctx.state.facet(bridgeFacet);
  const path = ctx.state.facet(editorPath);
  if (!bridge || !isTsPath(path) || path.startsWith('lib:')) return null;
  const word = ctx.matchBefore(/[\w$]*/);
  const prev = ctx.state.sliceDoc(ctx.pos - (word?.text.length ?? 0) - 1, ctx.pos - (word?.text.length ?? 0));
  // Chỉ hỏi TypeScript khi đang gõ tên, sau dấu chấm, trong chuỗi import, hoặc khi bấm Ctrl+Space.
  if (!ctx.explicit && !word?.text && !['.', '"', "'", '/', '<', '@'].includes(prev)) return null;
  const text = ctx.state.doc.toString();
  const result = await bridge.client.request({ type: 'completions', path, text, pos: ctx.pos, explicit: ctx.explicit }).catch(() => null);
  if (!result || ctx.aborted) return null;

  const options: Completion[] = result.entries.map((entry: TsCompletionEntry) => {
    const n = parseInt(entry.sortText, 10);
    return {
      label: entry.name,
      type: TYPE[entry.kind] ?? 'text',
      detail: entry.source ? t('cms.editor.autoImport', { module: entry.source }) : undefined,
      boost: entry.isRecommended ? 99 : Number.isFinite(n) ? Math.max(-99, 20 - n) : 0,
      // Chi tiết (kiểu, chú thích) chỉ hỏi khi gợi ý được chọn.
      info: async () => {
        const d = await bridge.client
          .request({ type: 'completionDetails', path, text, pos: ctx.pos, entry })
          .catch(() => null);
        return d ? infoNode(d.detail, d.documentation) : null;
      },
      apply: (view, _completion, from, to) => {
        const insert = entry.insertText ?? entry.name;
        const tr = view.state.update({ changes: { from, to, insert }, selection: { anchor: from + insert.length }, userEvent: 'input.complete' });
        view.dispatch(tr);
        if (!entry.hasAction) return;
        // Tự thêm import: lấy sửa đổi kèm theo từ TypeScript rồi áp vào (thường là dòng import đầu file).
        void bridge.client.request({ type: 'completionDetails', path, text, pos: ctx.pos, entry }).then((d) => {
          const edits = (d?.edits ?? []).filter((e) => e.path === path);
          if (!edits.length) return;
          const changes = edits.map((e) => ({ from: tr.changes.mapPos(e.from), to: tr.changes.mapPos(e.to), insert: e.insert }));
          view.dispatch({ changes, userEvent: 'input.complete' });
        });
      },
    };
  });
  return { from: result.from, options, validFor: /^[\w$]*$/ };
}

const lintSource = async (view: EditorView): Promise<Diagnostic[]> => {
  const bridge = view.state.facet(bridgeFacet);
  const path = view.state.facet(editorPath);
  if (!bridge || !isTsPath(path) || path.startsWith('lib:')) return [];
  const text = view.state.doc.toString();
  const list = await bridge.client.request({ type: 'diagnostics', path, text }).catch(() => []);
  // Nội dung đã đổi trong lúc chờ: bỏ kết quả cũ (linter sẽ chạy lại).
  if (view.state.doc.toString() !== text) return [];
  const len = view.state.doc.length;
  return list.map((d) => ({
    from: Math.min(d.from, len),
    to: Math.min(Math.max(d.to, d.from), len),
    severity: d.severity,
    message: d.message,
    source: `ts(${d.code})`,
  }));
};

const hover = hoverTooltip(
  async (view, pos) => {
    const bridge = view.state.facet(bridgeFacet);
    const path = view.state.facet(editorPath);
    if (!bridge || !isTsPath(path)) return null;
    const info = await bridge.client
      .request({ type: 'quickInfo', path, text: view.state.doc.toString(), pos })
      .catch(() => null);
    if (!info || !info.display) return null;
    return {
      pos: info.from,
      end: info.to,
      above: true,
      create: () => {
        const dom = document.createElement('div');
        dom.className = 'cm-ts-hover';
        dom.append(infoNode(info.display, info.documentation));
        return { dom };
      },
    };
  },
  { hoverTime: 350 },
);

const at = (view: EditorView) => ({ path: view.state.facet(editorPath), pos: view.state.selection.main.head });

const tsKeymap = keymap.of([
  {
    key: 'F12',
    run: (view) => {
      const b = view.state.facet(bridgeFacet);
      if (!b) return false;
      const { path, pos } = at(view);
      b.goToDefinition(path, pos);
      return true;
    },
  },
  {
    key: 'Shift-F12',
    run: (view) => {
      const b = view.state.facet(bridgeFacet);
      if (!b) return false;
      const { path, pos } = at(view);
      b.findReferences(path, pos);
      return true;
    },
  },
  {
    key: 'F2',
    run: (view) => {
      const b = view.state.facet(bridgeFacet);
      if (!b || view.state.readOnly) return false;
      const { path, pos } = at(view);
      b.renameSymbol(path, pos);
      return true;
    },
  },
  {
    key: 'Shift-Alt-f',
    run: (view) => {
      const b = view.state.facet(bridgeFacet);
      if (!b || view.state.readOnly) return false;
      b.formatDocument();
      return true;
    },
  },
]);

/** Ctrl+bấm (Cmd+bấm trên Mac) vào một tên để đi tới định nghĩa. */
const ctrlClick = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 0 || !(event.ctrlKey || event.metaKey)) return false;
    const b = view.state.facet(bridgeFacet);
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (!b || pos === null) return false;
    event.preventDefault();
    b.goToDefinition(view.state.facet(editorPath), pos);
    return true;
  },
});

const theme = EditorView.theme({
  '.cm-ts-hover': { padding: '6px 8px', maxHeight: '320px', overflow: 'auto' },
  '.cm-ts-detail': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    color: '#9CDCFE',
  },
  '.cm-ts-doc': { marginTop: '6px', fontSize: '12px', whiteSpace: 'pre-wrap', color: '#CCCCCC' },
  '.cm-tooltip-autocomplete .cm-completionDetail': { fontStyle: 'normal', opacity: '0.7', marginLeft: '12px' },
});

/** Mọi phần TypeScript cho trình sửa, tạo một lần cho mỗi khu sửa code. */
export function tsExtensions(bridge: TsBridge): Extension {
  return [
    bridgeFacet.of(bridge),
    autocompletion({ override: [completionSource], activateOnTypingDelay: 80, icons: true }),
    linter(lintSource, { delay: 500 }),
    hover,
    ctrlClick,
    tsKeymap,
    theme,
  ];
}
