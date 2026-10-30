import type * as TS from 'typescript';
import type {
  TsCompletionDetails,
  TsCompletionEntry,
  TsCompletions,
  TsDiagnostic,
  TsLocation,
  TsOutlineItem,
  TsQuickInfo,
  TsRenameResult,
  TsTextEdit,
} from './protocol';

/**
 * TypeScript language service trên một hệ thống file ảo (không dùng ổ đĩa), dùng cho gợi ý code,
 * lỗi kiểu, đi tới định nghĩa, tham chiếu, đổi tên, danh sách hàm. Không phụ thuộc trình duyệt nên
 * test được trong Node. Chạy trong Web Worker (ts.worker.ts) để không làm giật giao diện.
 *
 * Đường dẫn ảo:
 *   /game/<đường dẫn trong gói>   file của game
 *   /lib/lib.*.d.ts               thư viện chuẩn
 *   /types/react/*, /types/csstype/index.d.ts
 *   /sdk/*.ts                     mã nguồn @opes/module-sdk
 *   /game/__opes_assets.d.ts      module ảo `opes:assets`, sinh từ danh sách file kèm
 */

const GAME = '/game/';
const ASSETS_DTS = `${GAME}__opes_assets.d.ts`;
const LIB_PREFIX = 'lib:';

/** Đường dẫn trong trình sửa ↔ đường dẫn ảo. */
export const toVirtual = (path: string) => (path.startsWith(LIB_PREFIX) ? path.slice(LIB_PREFIX.length) : GAME + path);
export const fromVirtual = (file: string) => (file.startsWith(GAME) ? file.slice(GAME.length) : LIB_PREFIX + file);

/** Game tự khai báo `opes:assets` (file opes-assets.d.ts trong gói mẫu) thì bỏ qua file đó, dùng bản sinh tự động. */
const DECLARES_ASSETS = /declare\s+module\s+['"]opes:assets['"]/;

function assetsDeclaration(assets: string[]): string {
  const union = assets.length ? assets.map((a) => JSON.stringify(a)).join(' | ') : 'never';
  return `import type { MediaRef } from '@opes/module-sdk/core';
/** Đường dẫn các file trong thư mục assets/ của game. */
export type AssetPath = ${union};
/** Địa chỉ của từng file trong assets/. */
declare const urls: Record<AssetPath, string>;
export default urls;
/** MediaRef của một file trong assets/ (dùng cho trường ảnh, âm thanh, font, emojiOrImage). */
export function asset(path: AssetPath, name?: string): MediaRef;
`;
}

interface Entry {
  text: string;
  version: number;
}

export function createTsService(ts: typeof TS, libs: Record<string, string>) {
  const files = new Map<string, Entry>();
  for (const [name, text] of Object.entries(libs)) files.set(name, { text, version: 1 });
  let gameFiles: string[] = [];
  const directories = new Set<string>();
  const addDirs = (file: string) => {
    for (let d = file.slice(0, file.lastIndexOf('/')); d; d = d.slice(0, d.lastIndexOf('/'))) directories.add(d);
    directories.add('/');
  };
  for (const name of files.keys()) addDirs(name);

  const options: TS.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    noEmit: true,
    allowJs: true,
    checkJs: false,
    esModuleInterop: true,
    skipLibCheck: true,
    isolatedModules: true,
    resolveJsonModule: true,
    types: [],
    paths: {
      '@opes/module-sdk': ['/sdk/index.ts'],
      '@opes/module-sdk/core': ['/sdk/core.ts'],
      '@opes/module-sdk/react': ['/sdk/react.ts'],
      react: ['/types/react/index.d.ts'],
      'react/jsx-runtime': ['/types/react/jsx-runtime.d.ts'],
      csstype: ['/types/csstype/index.d.ts'],
      'opes:assets': [ASSETS_DTS],
    },
  };

  const setFile = (name: string, text: string) => {
    const old = files.get(name);
    if (old?.text === text) return;
    files.set(name, { text, version: (old?.version ?? 0) + 1 });
    addDirs(name);
  };

  const host: TS.LanguageServiceHost = {
    getScriptFileNames: () => gameFiles,
    getScriptVersion: (name) => String(files.get(name)?.version ?? 0),
    getScriptSnapshot: (name) => {
      const e = files.get(name);
      return e ? ts.ScriptSnapshot.fromString(e.text) : undefined;
    },
    getCurrentDirectory: () => '/game',
    getCompilationSettings: () => options,
    getDefaultLibFileName: () => '/lib/lib.d.ts',
    fileExists: (name) => files.has(name),
    readFile: (name) => files.get(name)?.text,
    directoryExists: (dir) => directories.has(dir.replace(/\/$/, '') || '/'),
    getDirectories: () => [],
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  };
  const service = ts.createLanguageService(host, ts.createDocumentRegistry(true, '/'));

  // ---------- Đồng bộ file ----------

  /** Thay toàn bộ file của game (file mới, sửa, xóa) và danh sách file kèm. */
  function sync(next: Record<string, string>, assets: string[]) {
    const wanted = new Set<string>();
    for (const [path, text] of Object.entries(next)) {
      const name = toVirtual(path);
      setFile(name, text);
      if (!/\.(md|txt)$/.test(path) && !(path.endsWith('.d.ts') && DECLARES_ASSETS.test(text))) wanted.add(name);
    }
    for (const name of [...files.keys()]) {
      if (name.startsWith(GAME) && name !== ASSETS_DTS && next[fromVirtual(name)] === undefined) files.delete(name);
    }
    setFile(ASSETS_DTS, assetsDeclaration([...assets].sort()));
    wanted.add(ASSETS_DTS);
    gameFiles = [...wanted];
  }

  /** Cập nhật nội dung file đang sửa (trình sửa gửi kèm theo mỗi yêu cầu). */
  function touch(path: string, text: string): string {
    const name = toVirtual(path);
    if (name.startsWith(GAME)) setFile(name, text);
    return name;
  }

  // ---------- Tiện ích ----------

  const text = (parts: readonly TS.SymbolDisplayPart[] | undefined) => (parts ?? []).map((p) => p.text).join('');

  function lineInfo(name: string, pos: number): { line: number; lineText: string } {
    const src = files.get(name)?.text ?? '';
    const before = src.lastIndexOf('\n', pos - 1) + 1;
    const after = src.indexOf('\n', pos);
    const line = src.slice(0, pos).split('\n').length;
    return { line, lineText: src.slice(before, after < 0 ? undefined : after).trim() };
  }

  const location = (name: string, span: TS.TextSpan): TsLocation => ({
    path: fromVirtual(name),
    from: span.start,
    to: span.start + span.length,
    ...lineInfo(name, span.start),
  });

  function toDiagnostic(d: TS.Diagnostic): TsDiagnostic {
    const from = d.start ?? 0;
    return {
      from,
      to: from + (d.length ?? 0),
      severity:
        d.category === ts.DiagnosticCategory.Error ? 'error' : d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'info',
      message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      code: d.code,
    };
  }

  const changesToEdits = (changes: readonly TS.FileTextChanges[]): TsTextEdit[] =>
    changes.flatMap((c) =>
      c.textChanges.map((t) => ({ path: fromVirtual(c.fileName), from: t.span.start, to: t.span.start + t.span.length, insert: t.newText })),
    );

  const userPreferences: TS.UserPreferences = {
    includeCompletionsForModuleExports: true,
    includeCompletionsForImportStatements: true,
    includeCompletionsWithInsertText: true,
    includeAutomaticOptionalChainCompletions: true,
    importModuleSpecifierPreference: 'shortest',
    quotePreference: 'single',
    allowRenameOfImportPath: false,
    providePrefixAndSuffixTextForRename: true,
  };

  // ---------- Chức năng ----------

  return {
    sync,

    diagnostics(path: string, src: string): TsDiagnostic[] {
      const name = touch(path, src);
      if (!name.startsWith(GAME) || /\.(md|txt|json)$/.test(path)) return [];
      return [...service.getSyntacticDiagnostics(name), ...service.getSemanticDiagnostics(name)].map(toDiagnostic);
    },

    allDiagnostics(): Record<string, TsDiagnostic[]> {
      const out: Record<string, TsDiagnostic[]> = {};
      for (const name of gameFiles) {
        if (name === ASSETS_DTS || /\.json$/.test(name)) continue;
        const list = [...service.getSyntacticDiagnostics(name), ...service.getSemanticDiagnostics(name)].map(toDiagnostic);
        if (list.length) out[fromVirtual(name)] = list;
      }
      return out;
    },

    completions(path: string, src: string, pos: number, explicit: boolean): TsCompletions | null {
      const name = touch(path, src);
      const result = service.getCompletionsAtPosition(name, pos, {
        ...userPreferences,
        triggerKind: explicit ? ts.CompletionTriggerKind.Invoked : ts.CompletionTriggerKind.TriggerCharacter,
      });
      if (!result) return null;
      const word = /[\w$]*$/.exec(src.slice(0, pos))![0];
      const from = result.optionalReplacementSpan?.start ?? pos - word.length;
      // Lọc trước theo chữ đã gõ (khớp mờ, giống cách trình sửa lọc) để gửi ít dữ liệu; gợi ý tự import nằm cuối danh sách.
      const typed = src.slice(from, pos).toLowerCase();
      const matches = (name: string) => {
        const n = name.toLowerCase();
        let at = 0;
        for (const ch of typed) {
          at = n.indexOf(ch, at);
          if (at < 0) return false;
          at++;
        }
        return true;
      };
      const entries: TsCompletionEntry[] = result.entries.filter((e) => matches(e.name)).slice(0, 1500).map((e) => ({
        name: e.name,
        kind: e.kind,
        kindModifiers: e.kindModifiers,
        sortText: e.sortText,
        insertText: e.insertText,
        hasAction: e.hasAction,
        source: e.source,
        data: e.data,
        isRecommended: e.isRecommended,
      }));
      return { from, entries };
    },

    completionDetails(path: string, src: string, pos: number, entry: TsCompletionEntry): TsCompletionDetails | null {
      const name = touch(path, src);
      const d = service.getCompletionEntryDetails(
        name,
        pos,
        entry.name,
        {},
        entry.source,
        userPreferences,
        entry.data as TS.CompletionEntryData | undefined,
      );
      if (!d) return null;
      return {
        detail: text(d.displayParts),
        documentation: text(d.documentation),
        edits: changesToEdits((d.codeActions ?? []).flatMap((a) => a.changes)),
      };
    },

    quickInfo(path: string, src: string, pos: number): TsQuickInfo | null {
      const name = touch(path, src);
      const info = service.getQuickInfoAtPosition(name, pos);
      if (!info) return null;
      const tags = (info.tags ?? []).map((t) => `@${t.name} ${text(t.text)}`.trim());
      return {
        from: info.textSpan.start,
        to: info.textSpan.start + info.textSpan.length,
        display: text(info.displayParts),
        documentation: [text(info.documentation), ...tags].filter(Boolean).join('\n\n'),
      };
    },

    definition(path: string, src: string, pos: number): TsLocation[] {
      const name = touch(path, src);
      const defs = service.getDefinitionAtPosition(name, pos) ?? [];
      return defs.map((d) => location(d.fileName, d.textSpan));
    },

    references(path: string, src: string, pos: number): TsLocation[] {
      const name = touch(path, src);
      const refs = service.getReferencesAtPosition(name, pos) ?? [];
      return refs.filter((r) => r.fileName !== ASSETS_DTS).map((r) => location(r.fileName, r.textSpan));
    },

    renameInfo(path: string, src: string, pos: number): { ok: boolean; name: string; message?: string } {
      const name = touch(path, src);
      const info = service.getRenameInfo(name, pos, userPreferences);
      if (!info.canRename) return { ok: false, name: '', message: info.localizedErrorMessage };
      return { ok: true, name: info.displayName };
    },

    rename(path: string, src: string, pos: number, newName: string): TsRenameResult {
      const name = touch(path, src);
      const info = service.getRenameInfo(name, pos, userPreferences);
      if (!info.canRename) return { ok: false, message: info.localizedErrorMessage, edits: [] };
      const locations = service.findRenameLocations(name, pos, false, false, userPreferences) ?? [];
      if (locations.some((l) => !l.fileName.startsWith(GAME) || l.fileName === ASSETS_DTS)) {
        return { ok: false, message: 'Tên này được khai báo trong thư viện, không đổi được.', edits: [] };
      }
      return {
        ok: true,
        edits: locations.map((l) => ({
          path: fromVirtual(l.fileName),
          from: l.textSpan.start,
          to: l.textSpan.start + l.textSpan.length,
          insert: `${l.prefixText ?? ''}${newName}${l.suffixText ?? ''}`,
        })),
      };
    },

    outline(path: string, src: string): TsOutlineItem[] {
      const name = touch(path, src);
      if (!/\.(tsx?|jsx?)$/.test(path) && !path.startsWith(LIB_PREFIX)) return [];
      const out: TsOutlineItem[] = [];
      // Chỉ giữ thuộc tính của class/interface (bỏ thuộc tính của object literal), giống danh sách của VS Code.
      const propertyParents = new Set<string>([
        ts.ScriptElementKind.classElement,
        ts.ScriptElementKind.interfaceElement,
        ts.ScriptElementKind.typeElement,
      ]);
      const walk = (node: TS.NavigationTree, depth: number) => {
        for (const child of node.childItems ?? []) {
          // Bỏ import và hàm không tên (callback).
          if (child.kind === ts.ScriptElementKind.alias || child.text.startsWith('<')) continue;
          if (child.kind === ts.ScriptElementKind.memberVariableElement && !propertyParents.has(node.kind)) continue;
          const span = child.spans[0]!;
          out.push({ name: child.text, kind: child.kind, from: span.start, to: span.start + span.length, depth });
          walk(child, depth + 1);
        }
      };
      walk(service.getNavigationTree(name), 0);
      return out;
    },

    libText(path: string): string | null {
      return files.get(toVirtual(path))?.text ?? null;
    },
  };
}

export type TsService = ReturnType<typeof createTsService>;
