/**
 * Kiểu dữ liệu trao đổi giữa trình sửa code (luồng chính) và TypeScript chạy trong Web Worker.
 * Vị trí trong file là số ký tự tính từ đầu file (offset), giống CodeMirror.
 * Đường dẫn: file của game dùng đường dẫn trong gói ("schema.ts"); file thư viện (chỉ đọc) có tiền tố "lib:".
 */

export interface TsDiagnostic {
  from: number;
  to: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code: number;
}

export interface TsCompletionEntry {
  name: string;
  kind: string;
  kindModifiers?: string;
  sortText: string;
  insertText?: string;
  /** Có thao tác kèm theo (ví dụ tự thêm import) khi chọn. */
  hasAction?: boolean;
  /** Module của gợi ý tự import, ví dụ "@opes/module-sdk/react". */
  source?: string;
  /** Dữ liệu TypeScript cần để lấy chi tiết gợi ý (giữ nguyên, gửi lại khi hỏi chi tiết). */
  data?: unknown;
  isRecommended?: boolean;
}

export interface TsCompletions {
  /** Vị trí bắt đầu phần chữ sẽ bị thay khi chọn gợi ý. */
  from: number;
  entries: TsCompletionEntry[];
}

export interface TsTextEdit {
  path: string;
  from: number;
  to: number;
  insert: string;
}

export interface TsCompletionDetails {
  detail: string;
  documentation: string;
  /** Sửa thêm khi chọn (ví dụ dòng import). */
  edits: TsTextEdit[];
}

export interface TsQuickInfo {
  from: number;
  to: number;
  display: string;
  documentation: string;
}

export interface TsLocation {
  path: string;
  from: number;
  to: number;
  /** Dòng (từ 1) và nội dung dòng, để hiện trong danh sách tham chiếu. */
  line: number;
  lineText: string;
}

export interface TsRenameResult {
  ok: boolean;
  /** Lý do không đổi tên được (ví dụ tên nằm trong thư viện). */
  message?: string;
  edits: TsTextEdit[];
}

export interface TsOutlineItem {
  name: string;
  kind: string;
  from: number;
  to: number;
  depth: number;
}

/** Yêu cầu gửi tới worker. Mỗi yêu cầu kèm nội dung hiện tại của file đang thao tác (nếu có). */
export type TsRequest =
  | { type: 'sync'; files: Record<string, string>; assets: string[] }
  | { type: 'diagnostics'; path: string; text: string }
  | { type: 'allDiagnostics' }
  | { type: 'completions'; path: string; text: string; pos: number; explicit: boolean }
  | { type: 'completionDetails'; path: string; text: string; pos: number; entry: TsCompletionEntry }
  | { type: 'quickInfo'; path: string; text: string; pos: number }
  | { type: 'definition'; path: string; text: string; pos: number }
  | { type: 'references'; path: string; text: string; pos: number }
  | { type: 'renameInfo'; path: string; text: string; pos: number }
  | { type: 'rename'; path: string; text: string; pos: number; newName: string }
  | { type: 'outline'; path: string; text: string }
  | { type: 'libText'; path: string }
  | { type: 'format'; path: string; text: string };

export interface TsResponses {
  sync: null;
  diagnostics: TsDiagnostic[];
  allDiagnostics: Record<string, TsDiagnostic[]>;
  completions: TsCompletions | null;
  completionDetails: TsCompletionDetails | null;
  quickInfo: TsQuickInfo | null;
  definition: TsLocation[];
  references: TsLocation[];
  renameInfo: { ok: boolean; name: string; message?: string };
  rename: TsRenameResult;
  outline: TsOutlineItem[];
  libText: string | null;
  format: string;
}
