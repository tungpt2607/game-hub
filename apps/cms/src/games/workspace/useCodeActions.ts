import { useMemo, useRef, useState, type RefObject } from 'react';
import { t } from '@opes/i18n';
import type { GameAssets, GameFiles } from '../types';
import type { EditorApi } from './CodeEditor';
import type { ReferenceItem } from './panels/BottomPanel';
import { tsExtensions, type TsBridge } from './ts/extensions';
import type { TsClient } from './ts/tsClient';
import { FORMATTABLE, applyEdits, isLib } from './workspace-utils';

interface CodeActionsDeps {
  client: TsClient;
  /** Nội dung file (kể cả file thư viện chỉ đọc đã tải); null nếu chưa có. */
  textOf: (path: string) => string | null;
  files: GameFiles;
  assets: GameAssets;
  /** File code đang mở trong trình sửa. */
  codePath: string | null;
  editor: RefObject<EditorApi | null>;
  navigate: (path: string, from: number, to?: number) => Promise<void>;
  onChange: (files: GameFiles, assets: GameAssets) => void;
  onNotice: (message: string, severity?: 'info' | 'error') => void;
  showReferences: (title: string, items: ReferenceItem[]) => void;
}

/**
 * Tính năng TypeScript của trình sửa code: đi tới định nghĩa, tìm tham chiếu, đổi tên ký hiệu,
 * định dạng. Trả về phần mở rộng cho CodeEditor (tạo một lần) và trạng thái hộp đổi tên.
 */
export function useCodeActions(d: CodeActionsDeps) {
  const [renaming, setRenaming] = useState<{ path: string; pos: number; name: string } | null>(
    null,
  );

  const goToDefinition = async (path: string, pos: number) => {
    const text = d.textOf(path);
    if (text === null) return;
    const defs = await d.client.request({ type: 'definition', path, text, pos }).catch(() => []);
    const def = defs[0];
    if (!def) d.onNotice(t('cms.editor.noDefinition'));
    else void d.navigate(def.path, def.from, def.to);
  };

  const findReferences = async (path: string, pos: number) => {
    const text = d.textOf(path);
    if (text === null) return;
    const refs = await d.client.request({ type: 'references', path, text, pos }).catch(() => []);
    if (!refs.length) {
      d.onNotice(t('cms.editor.noReferences'));
      return;
    }
    const word =
      (text.slice(0, pos).match(/[\w$]*$/)?.[0] ?? '') +
      (text.slice(pos).match(/^[\w$]*/)?.[0] ?? '');
    d.showReferences(t('cms.editor.referencesTitle', { name: word, count: refs.length }), refs);
  };

  const renameSymbol = async (path: string, pos: number) => {
    const text = d.textOf(path);
    if (text === null || isLib(path)) return;
    const info = await d.client.request({ type: 'renameInfo', path, text, pos }).catch(() => null);
    if (!info?.ok) d.onNotice(info?.message || t('cms.editor.cannotRename'), 'error');
    else setRenaming({ path, pos, name: info.name });
  };

  const applyRename = async (newName: string) => {
    const r = renaming;
    setRenaming(null);
    if (!r) return;
    const text = d.textOf(r.path);
    if (text === null) return;
    const result = await d.client
      .request({ type: 'rename', path: r.path, text, pos: r.pos, newName })
      .catch(() => null);
    if (!result?.ok) {
      d.onNotice(result?.message || t('cms.editor.cannotRename'), 'error');
      return;
    }
    d.onChange(applyEdits(d.files, result.edits), d.assets);
    const fileCount = new Set(result.edits.map((e) => e.path)).size;
    d.onNotice(t('cms.editor.renamed', { count: result.edits.length, files: fileCount }));
  };

  const formatText = (path: string, text: string) =>
    d.client.request({ type: 'format', path, text });

  const formatDocument = async () => {
    const { codePath } = d;
    if (!codePath || isLib(codePath) || !FORMATTABLE.test(codePath)) return;
    try {
      d.editor.current?.replaceAll(await formatText(codePath, d.files[codePath] ?? ''));
    } catch (e) {
      d.onNotice(
        t('cms.editor.formatFailed', {
          message: e instanceof Error ? (e.message.split('\n')[0] ?? '') : String(e),
        }),
        'error',
      );
    }
  };

  // Phần mở rộng TypeScript của trình sửa: tạo một lần; các hàm gọi qua ref nên luôn dùng trạng thái mới nhất.
  const actions = useRef({ goToDefinition, findReferences, renameSymbol, formatDocument });
  actions.current = { goToDefinition, findReferences, renameSymbol, formatDocument };
  const { client } = d;
  const shared = useMemo(() => {
    const bridge: TsBridge = {
      client,
      goToDefinition: (p, pos) => void actions.current.goToDefinition(p, pos),
      findReferences: (p, pos) => void actions.current.findReferences(p, pos),
      renameSymbol: (p, pos) => void actions.current.renameSymbol(p, pos),
      formatDocument: () => void actions.current.formatDocument(),
    };
    return tsExtensions(bridge);
  }, [client]);

  return {
    shared,
    goToDefinition,
    findReferences,
    renameSymbol,
    formatDocument,
    formatText,
    renaming,
    cancelRename: () => setRenaming(null),
    applyRename,
  };
}
