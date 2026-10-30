import ts from 'typescript';
import type { TsRequest, TsResponses } from './protocol';
import { createTsService, type TsService } from './service';

/**
 * Web Worker chạy TypeScript cho trình sửa code (gợi ý, lỗi kiểu, định nghĩa…) và Prettier (định dạng),
 * tách khỏi luồng giao diện. Nhận { id, req }, trả { id, ok, result } hoặc { id, ok: false, error }.
 */

/** Phạm vi của worker (không dùng lib "webworker" để khỏi xung đột kiểu với "dom" của CMS). */
const scope = globalThis as unknown as {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent<{ id: number; req: TsRequest }>) => void) | null;
};

let service: Promise<TsService> | null = null;

function getService(): Promise<TsService> {
  service ??= fetch('/ts-libs.json', { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`Không tải được thư viện kiểu (${res.status}).`);
      return res.json() as Promise<Record<string, string>>;
    })
    .then((libs) => createTsService(ts, libs));
  return service;
}

const PARSER: Record<string, string> = { ts: 'typescript', tsx: 'typescript', js: 'babel', jsx: 'babel', json: 'json', md: 'markdown' };

/** Định dạng bằng Prettier (tải khi dùng lần đầu), cùng cấu hình với repo. */
async function format(path: string, text: string): Promise<string> {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  const parser = PARSER[ext];
  if (!parser) return text;
  const [prettier, typescript, estree, babel, markdown] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/typescript'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/markdown'),
  ]);
  return prettier.format(text, {
    parser,
    filepath: path,
    plugins: [typescript, estree, babel, markdown],
    singleQuote: true,
    printWidth: 100,
    trailingComma: 'all',
  });
}

async function handle(req: TsRequest): Promise<TsResponses[TsRequest['type']]> {
  if (req.type === 'format') return format(req.path, req.text);
  const svc = await getService();
  switch (req.type) {
    case 'sync':
      svc.sync(req.files, req.assets);
      return null;
    case 'diagnostics':
      return svc.diagnostics(req.path, req.text);
    case 'allDiagnostics':
      return svc.allDiagnostics();
    case 'completions':
      return svc.completions(req.path, req.text, req.pos, req.explicit);
    case 'completionDetails':
      return svc.completionDetails(req.path, req.text, req.pos, req.entry);
    case 'quickInfo':
      return svc.quickInfo(req.path, req.text, req.pos);
    case 'definition':
      return svc.definition(req.path, req.text, req.pos);
    case 'references':
      return svc.references(req.path, req.text, req.pos);
    case 'renameInfo':
      return svc.renameInfo(req.path, req.text, req.pos);
    case 'rename':
      return svc.rename(req.path, req.text, req.pos, req.newName);
    case 'outline':
      return svc.outline(req.path, req.text);
    case 'libText':
      return svc.libText(req.path);
  }
}

scope.onmessage = (event) => {
  const { id, req } = event.data;
  handle(req).then(
    (result) => scope.postMessage({ id, ok: true, result }),
    (e: unknown) => scope.postMessage({ id, ok: false, error: e instanceof Error ? e.message : String(e) }),
  );
};
