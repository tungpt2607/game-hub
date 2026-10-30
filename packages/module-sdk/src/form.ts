import type { Fields } from './fields';
import type { ModuleKind, ModulePreset, ModuleScreen } from './meta';
import { isFieldVisible } from './validation';

/**
 * Trạng thái form tính từ lược đồ trường (gồm cả hàm `visibleWhen`, `itemLabel` của game) và cấu hình
 * hiện tại. Khi game chạy trong khung cách ly, CMS không giữ các hàm này nên hỏi khung để có kết quả.
 */
export interface FormState {
  /** Đường dẫn các trường đang bị ẩn, ví dụ "end.ctaUrl" hay "groups.0.points". */
  hidden: string[];
  /** Tên hiển thị của từng phần tử danh sách, theo đường dẫn danh sách. */
  labels: Record<string, string[]>;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const join = (path: string, key: string | number) => (path ? `${path}.${key}` : String(key));

export function describeForm(fields: Fields, root: unknown): FormState {
  const state: FormState = { hidden: [], labels: {} };
  const visit = (fs: Fields, value: unknown, path: string) => {
    const obj = isObj(value) ? value : {};
    for (const [key, f] of Object.entries(fs)) {
      const at = join(path, key);
      if (!isFieldVisible(f, root)) {
        state.hidden.push(at);
        continue;
      }
      if (f.type === 'group') visit(f.fields, obj[key], at);
      if (f.type === 'list') {
        const items = Array.isArray(obj[key]) ? (obj[key] as unknown[]) : [];
        if (f.itemLabel) {
          state.labels[at] = items.map((item, i) => {
            try {
              return String(f.itemLabel!(item as never, i));
            } catch {
              return `${f.label} ${i + 1}`;
            }
          });
        }
        items.forEach((item, i) => visit(f.item, item, join(at, i)));
      }
    }
  };
  visit(fields, root, '');
  return state;
}

/** Mô tả game gửi được qua postMessage/JSON: lược đồ trường đã bỏ các hàm. */
export interface SerializedSchema {
  key: string;
  kind: ModuleKind;
  version: string;
  name: string;
  description: string;
  fields: Fields;
  defaults: Record<string, unknown>;
  screens: ModuleScreen[];
  presets: ModulePreset<Record<string, unknown>>[];
  scoring: { unit: string; higherIsBetter: boolean } | null;
}

export function serializeSchema(mod: {
  key: string;
  kind: ModuleKind;
  version: string;
  name: string;
  description: string;
  fields: Fields;
  defaults: unknown;
  screens: ModuleScreen[];
  presets?: ModulePreset<unknown>[];
  scoring?: { unit: string; higherIsBetter: boolean };
}): SerializedSchema {
  // JSON bỏ các hàm (visibleWhen, check, itemLabel); kết quả của chúng do khung chạy game tính.
  return JSON.parse(
    JSON.stringify({
      key: mod.key,
      kind: mod.kind,
      version: mod.version,
      name: mod.name,
      description: mod.description,
      fields: mod.fields,
      defaults: mod.defaults,
      screens: mod.screens,
      presets: mod.presets ?? [],
      scoring: mod.scoring ?? null,
    }),
  ) as SerializedSchema;
}
