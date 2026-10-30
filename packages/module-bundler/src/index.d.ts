/** Thư viện nơi chạy cung cấp cho phần chạy của game. */
export declare const RUNTIME_EXTERNALS: string[];

/** Lỗi biên dịch dễ đọc, mỗi dòng một lỗi. */
export declare function formatBuildErrors(failure: unknown): string[];

/** Biên dịch mã nguồn một game thành gói mô tả (chạy trong hộp cách ly) và gói chạy (trình duyệt). */
export declare function bundleGame(
  esbuild: unknown,
  input: { files: Record<string, string>; sdkCore: Record<string, string> },
): Promise<{ schemaJs: string; runtimeJs: string }>;
