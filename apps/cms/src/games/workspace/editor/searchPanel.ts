import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  SearchQuery,
  setSearchQuery,
} from '@codemirror/search';
import { EditorView, type Panel, type ViewUpdate } from '@codemirror/view';
import { t } from '@opes/i18n';

/**
 * Khung tìm/thay giống VS Code: nổi ở góc trên bên phải khung code; nút › mở dòng "Thay bằng";
 * Aa (phân biệt hoa thường), ab (nguyên từ), .* (biểu thức chính quy) nằm trong ô tìm; số kết quả;
 * ↑ ↓; ⇄ thay một chỗ, ⇄⇄ thay tất cả; ✕ hoặc Esc để đóng. Trên điện thoại khung rộng hết chiều ngang.
 */

const MAX_COUNT = 9999;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function iconButton(className: string, label: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', `vf-btn ${className}`, { type: 'button', title: label, 'aria-label': label });
  b.textContent = text;
  // Giữ con trỏ trong ô nhập khi bấm nút.
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', onClick);
  return b;
}

function toggleButton(label: string, text: string, onToggle: (on: boolean) => void): HTMLButtonElement {
  const b = iconButton('vf-toggle', label, text, () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    onToggle(on);
  });
  b.setAttribute('aria-pressed', 'false');
  return b;
}

export function createSearchPanel(view: EditorView): Panel {
  const narrow = window.matchMedia('(max-width: 600px)').matches;
  const initial = getSearchQuery(view.state);
  let caseSensitive = initial.caseSensitive;
  let wholeWord = initial.wholeWord;
  let regexp = initial.regexp;

  const dom = el('div', `vf-panel${narrow ? ' vf-narrow' : ''}`, { role: 'search' });
  const expand = iconButton('vf-expand', t('cms.editor.toggleReplace'), '›', () => setExpanded(!expanded));
  const rows = el('div', 'vf-rows');
  const findRow = el('div', 'vf-row');
  const replaceRow = el('div', 'vf-row vf-replace-row');

  const findWrap = el('div', 'vf-input-wrap');
  const findInput = el('input', 'vf-input', {
    type: 'text',
    placeholder: t('cms.editor.find'),
    'aria-label': t('cms.editor.find'),
    'main-field': 'true',
    spellcheck: 'false',
    autocomplete: 'off',
  });
  findInput.value = initial.search;
  const caseBtn = toggleButton(t('cms.editor.matchCase'), 'Aa', (on) => ((caseSensitive = on), commit()));
  const wordBtn = toggleButton(t('cms.editor.wholeWord'), 'ab', (on) => ((wholeWord = on), commit()));
  const regexBtn = toggleButton(t('cms.editor.regex'), '.*', (on) => ((regexp = on), commit()));
  caseBtn.setAttribute('aria-pressed', String(caseSensitive));
  wordBtn.setAttribute('aria-pressed', String(wholeWord));
  regexBtn.setAttribute('aria-pressed', String(regexp));
  findWrap.append(findInput, caseBtn, wordBtn, regexBtn);

  const count = el('span', 'vf-count', { 'aria-live': 'polite' });
  const prev = iconButton('', t('cms.editor.previous'), '↑', () => findPrevious(view));
  const next = iconButton('', t('cms.editor.next'), '↓', () => findNext(view));
  const close = iconButton('', t('cms.editor.close'), '✕', () => closeSearchPanel(view));
  findRow.append(findWrap, count, prev, next, close);

  const replaceWrap = el('div', 'vf-input-wrap');
  const replaceInput = el('input', 'vf-input', {
    type: 'text',
    placeholder: t('cms.editor.replace'),
    'aria-label': t('cms.editor.replace'),
    spellcheck: 'false',
    autocomplete: 'off',
  });
  replaceInput.value = initial.replace;
  replaceWrap.append(replaceInput);
  const replaceOne = iconButton('', t('cms.editor.replaceOne'), '⇄', () => replaceNext(view));
  const replaceAllBtn = iconButton('', t('cms.editor.replaceAll'), '⇄⇄', () => replaceAll(view));
  replaceRow.append(replaceWrap, replaceOne, replaceAllBtn);

  rows.append(findRow, replaceRow);
  dom.append(expand, rows);

  let expanded = initial.replace !== '';
  function setExpanded(on: boolean) {
    expanded = on;
    dom.classList.toggle('vf-expanded', on);
    expand.textContent = on ? '⌄' : '›';
    if (on) replaceInput.focus();
  }
  setExpanded(expanded);

  function query() {
    return new SearchQuery({ search: findInput.value, replace: replaceInput.value, caseSensitive, wholeWord, regexp });
  }
  function commit() {
    const q = query();
    if (!q.eq(getSearchQuery(view.state))) view.dispatch({ effects: setSearchQuery.of(q) });
  }

  /** Số kết quả và vị trí kết quả đang chọn, ví dụ "2/7". */
  function updateCount() {
    const q = getSearchQuery(view.state);
    dom.classList.remove('vf-invalid', 'vf-none');
    if (!q.search) {
      count.textContent = '';
      return;
    }
    if (!q.valid) {
      count.textContent = t('cms.editor.invalidRegex');
      dom.classList.add('vf-invalid');
      return;
    }
    const sel = view.state.selection.main;
    const cursor = q.getCursor(view.state);
    let total = 0;
    let current = 0;
    for (let m = cursor.next(); !m.done && total < MAX_COUNT; m = cursor.next()) {
      total++;
      if (m.value.from === sel.from && m.value.to === sel.to) current = total;
    }
    if (total === 0) {
      count.textContent = t('cms.editor.noResults');
      dom.classList.add('vf-none');
    } else {
      count.textContent = `${current || '?'}/${total >= MAX_COUNT ? `${MAX_COUNT}+` : total}`;
    }
  }

  const onKey = (e: KeyboardEvent, isReplace: boolean) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchPanel(view);
      view.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isReplace) {
        if (e.ctrlKey || e.metaKey) replaceAll(view);
        else replaceNext(view);
      } else if (e.shiftKey) findPrevious(view);
      else findNext(view);
    }
  };
  findInput.addEventListener('input', commit);
  replaceInput.addEventListener('input', commit);
  findInput.addEventListener('keydown', (e) => onKey(e, false));
  replaceInput.addEventListener('keydown', (e) => onKey(e, true));

  return {
    dom,
    top: true,
    mount() {
      // Container của khung nổi: góc phải (máy tính) hoặc hết chiều ngang (điện thoại).
      const parent = dom.parentElement;
      if (parent && narrow) parent.classList.add('vf-container-narrow');
      findInput.focus();
      findInput.select();
      updateCount();
    },
    update(update: ViewUpdate) {
      const q = getSearchQuery(update.state);
      if (!q.eq(getSearchQuery(update.startState))) {
        // Mở lại khung với chữ đang chọn: cập nhật ô nhập theo truy vấn mới.
        if (findInput.value !== q.search) findInput.value = q.search;
        if (replaceInput.value !== q.replace) replaceInput.value = q.replace;
      }
      if (update.docChanged || update.selectionSet || !q.eq(getSearchQuery(update.startState))) updateCount();
    },
  };
}

/** Giao diện khung tìm kiếm (nền tối như VS Code). */
export const searchPanelTheme = EditorView.theme({
  '.cm-panels.cm-panels-top': {
    position: 'absolute',
    top: '0',
    left: 'auto',
    right: '14px',
    border: 'none',
    backgroundColor: 'transparent',
    zIndex: '20',
  },
  '.cm-panels.cm-panels-top.vf-container-narrow': { left: '0', right: '0' },
  '.vf-panel': {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '2px',
    padding: '4px 4px 4px 2px',
    backgroundColor: '#252526',
    color: '#CCCCCC',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    borderRadius: '0 0 4px 4px',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '13px',
  },
  '.vf-narrow': { borderRadius: '0' },
  '.vf-rows': { display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '0' },
  '.vf-row': { display: 'flex', alignItems: 'center', gap: '2px' },
  '.vf-replace-row': { display: 'none' },
  '.vf-expanded .vf-replace-row': { display: 'flex' },
  '.vf-input-wrap': {
    display: 'flex',
    alignItems: 'center',
    width: '240px',
    backgroundColor: '#3C3C3C',
    border: '1px solid #3C3C3C',
    borderRadius: '2px',
  },
  '.vf-narrow .vf-input-wrap': { width: 'auto', flex: '1', minWidth: '0' },
  '.vf-input-wrap:focus-within': { borderColor: '#007FD4' },
  '.vf-invalid .vf-input-wrap': { borderColor: '#BE1100' },
  '.vf-none .vf-row:first-child .vf-input-wrap': { borderColor: '#BE1100' },
  '.vf-input': {
    flex: '1',
    minWidth: '0',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#CCCCCC',
    padding: '3px 6px',
    font: 'inherit',
  },
  '.vf-narrow .vf-input': { fontSize: '16px' },
  '.vf-btn': {
    minWidth: '22px',
    height: '22px',
    padding: '0 4px',
    border: '1px solid transparent',
    borderRadius: '3px',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: '12px',
    lineHeight: '20px',
    cursor: 'pointer',
    flexShrink: '0',
  },
  '.vf-narrow .vf-btn': { minWidth: '32px', height: '32px', fontSize: '14px' },
  '.vf-btn:hover': { backgroundColor: 'rgba(90, 93, 94, 0.5)' },
  '.vf-toggle': { fontFamily: 'monospace' },
  '.vf-toggle[aria-pressed="true"]': { backgroundColor: 'rgba(0, 127, 212, 0.4)', borderColor: '#007FD4' },
  '.vf-expand': { alignSelf: 'stretch', height: 'auto', fontSize: '14px' },
  '.vf-count': { minWidth: '64px', padding: '0 4px', fontSize: '12px', whiteSpace: 'nowrap', opacity: '0.85' },
  '.vf-none .vf-count': { color: '#F48771' },
  '.vf-invalid .vf-count': { color: '#F48771' },
});
