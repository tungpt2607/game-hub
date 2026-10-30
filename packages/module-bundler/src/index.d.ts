/** Thư viện nơi chạy cung cấp cho phần chạy của game. */
export declare const RUNTIME_EXTERNALS: string[];

/** Tên module ảo chứa địa chỉ các file trong thư mục assets/ của game. */
export declare const ASSETS_MODULE: string;

export interface BuildError {
  file: string | null;
  line: number;
  column: number;
  text: string;
}

/** Lỗi biên dịch dễ đọc, mỗi dòng một lỗi. */
export declare function formatBuildErrors(failure: unknown): string[];

/** Lỗi biên dịch có vị trí (file, dòng, cột). */
export declare function buildErrors(failure: unknown): BuildError[];

/** Biên dịch mã nguồn một game thành gói mô tả (chạy trong hộp cách ly) và gói chạy (trình duyệt). */
export declare function bundleGame(
  esbuild: unknown,
  input: {
    files: Record<string, string>;
    sdkCore: Record<string, string>;
    assets?: Record<string, { url: string; sha256?: string }>;
  },
): Promise<{ schemaJs: string; runtimeJs: string }>;
