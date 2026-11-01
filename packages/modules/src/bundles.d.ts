/**
 * Kiểu của bundles/builtin.json: các game có sẵn đã biên dịch (scripts/build-bundles.mjs sinh ra,
 * không đưa vào git). Khai báo tay để TypeScript không tự suy một kiểu riêng cho từng game theo
 * đúng tên file trong JSON (các kiểu đó không khớp nhau khi mỗi game có bộ file khác nhau).
 * package.json trỏ điều kiện "types" của "./bundles" tới file này.
 */

export interface BuiltinBundleMeta {
  key: string;
  kind: 'game' | 'leaderboard' | 'reward';
  version: string;
  name: string;
  description: string;
  defaults: Record<string, unknown>;
  screens: { id: string; label: string }[];
  presets: { id: string; name: string; description?: string; config: Record<string, unknown> }[];
  scoring: { unit: string; higherIsBetter: boolean } | null;
}

export interface BuiltinBundle {
  /** Thư mục game trong packages/modules/src. */
  folder: string;
  meta: BuiltinBundleMeta;
  /** Mã nguồn: đường dẫn → nội dung. */
  files: Record<string, string>;
  schemaJs: string;
  runtimeJs: string;
}

declare const builtin: BuiltinBundle[];
export default builtin;
