import type { Field, Fields } from './fields';

/** Lỗi cấu hình theo đường dẫn, ví dụ `{ "items.0.points": "Tối thiểu là 1" }`. */
export type ConfigErrors = Record<string, string>;

type Obj = Record<string, unknown>;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMediaRef(value: unknown): boolean {
  return isObj(value) && typeof value.id === 'string' && typeof value.url === 'string';
}

function join(path: string, key: string | number): string {
  return path ? `${path}.${key}` : String(key);
}

/** Trường có đang hiện với cấu hình gốc này không. */
export function isFieldVisible(f: Field, root: unknown): boolean {
  if (!f.visibleWhen) return true;
  try {
    return f.visibleWhen(root as never);
  } catch {
    return true;
  }
}

/**
 * Kiểm tra cấu hình theo lược đồ. Trả về object rỗng nếu hợp lệ.
 * Trường đang bị ẩn (visibleWhen = false) không bị kiểm tra.
 */
export function validateConfig(fields: Fields, value: unknown, root: unknown = value): ConfigErrors {
  const errors: ConfigErrors = {};
  walkObject(fields, value, root, '', errors);
  return errors;
}

function walkObject(fields: Fields, value: unknown, root: unknown, path: string, errors: ConfigErrors) {
  const obj = isObj(value) ? value : {};
  for (const [key, f] of Object.entries(fields)) {
    if (!isFieldVisible(f, root)) continue;
    checkField(f, obj[key], root, join(path, key), errors);
  }
}

function checkField(f: Field, v: unknown, root: unknown, path: string, errors: ConfigErrors) {
  const fail = (message: string) => {
    errors[path] = message;
  };
  switch (f.type) {
    case 'text': {
      if (typeof v !== 'string') return fail('Cần nhập chữ');
      if (f.required && v.trim() === '') return fail('Không được để trống');
      if (f.maxLength !== undefined && v.length > f.maxLength) return fail(`Tối đa ${f.maxLength} ký tự`);
      return;
    }
    case 'number': {
      if (typeof v !== 'number' || !Number.isFinite(v)) return fail('Cần nhập một số');
      if (f.integer && !Number.isInteger(v)) return fail('Cần là số nguyên');
      if (f.min !== undefined && v < f.min) return fail(`Tối thiểu là ${f.min}`);
      if (f.max !== undefined && v > f.max) return fail(`Tối đa là ${f.max}`);
      return;
    }
    case 'boolean':
      if (typeof v !== 'boolean') fail('Giá trị không hợp lệ');
      return;
    case 'select':
      if (!f.options.some((o) => o.value === v)) fail('Hãy chọn một giá trị trong danh sách');
      return;
    case 'color':
      if (!isHexColor(v)) fail('Màu cần có dạng #RRGGBB');
      return;
    case 'image':
    case 'audio': {
      if (v === null || v === undefined) {
        if (f.required) fail(f.type === 'image' ? 'Hãy chọn ảnh' : 'Hãy chọn file âm thanh');
        return;
      }
      if (!isMediaRef(v)) fail('File không hợp lệ');
      return;
    }
    case 'emojiOrImage': {
      if (!isObj(v)) return fail('Giá trị không hợp lệ');
      const hasImage = v.image !== null && v.image !== undefined;
      if (hasImage && !isMediaRef(v.image)) return fail('Ảnh không hợp lệ');
      if (!hasImage && (typeof v.emoji !== 'string' || v.emoji.trim() === ''))
        return fail('Hãy nhập emoji hoặc chọn ảnh');
      return;
    }
    case 'font': {
      if (!isObj(v) || typeof v.family !== 'string' || v.family.trim() === '') return fail('Hãy chọn font');
      if (v.media !== null && v.media !== undefined && !isMediaRef(v.media)) fail('File font không hợp lệ');
      return;
    }
    case 'list': {
      if (!Array.isArray(v)) return fail('Danh sách không hợp lệ');
      if (f.min !== undefined && v.length < f.min) fail(`Cần ít nhất ${f.min} mục`);
      else if (f.max !== undefined && v.length > f.max) fail(`Tối đa ${f.max} mục`);
      v.forEach((item, i) => walkObject(f.item, item, root, join(path, i), errors));
      return;
    }
    case 'group':
      walkObject(f.fields, v, root, path, errors);
      return;
  }
}

/** Giá trị có đúng "dạng" của trường không (chưa xét min/max/bắt buộc). Dùng khi chuẩn hóa. */
function hasShape(f: Field, v: unknown): boolean {
  switch (f.type) {
    case 'text':
      return typeof v === 'string';
    case 'number':
      return typeof v === 'number' && Number.isFinite(v);
    case 'boolean':
      return typeof v === 'boolean';
    case 'select':
      return f.options.some((o) => o.value === v);
    case 'color':
      return isHexColor(v);
    case 'image':
    case 'audio':
      return v === null || isMediaRef(v);
    case 'emojiOrImage':
      return isObj(v) && typeof v.emoji === 'string' && (v.image === null || isMediaRef(v.image));
    case 'font':
      return isObj(v) && typeof v.family === 'string' && (v.media === null || isMediaRef(v.media));
    case 'list':
      return Array.isArray(v);
    case 'group':
      return isObj(v);
  }
}

/**
 * Chuẩn hóa cấu hình: giữ giá trị đúng dạng, thay giá trị thiếu hoặc sai dạng bằng mặc định,
 * bỏ khóa thừa. Dùng khi mở cấu hình cũ sau khi module thêm trường mới.
 */
export function normalizeConfig<Config>(fields: Fields, raw: unknown, defaults: Config): Config {
  return normalizeObject(fields, raw, defaults) as Config;
}

function normalizeObject(fields: Fields, raw: unknown, defaults: unknown): Obj {
  const src = isObj(raw) ? raw : {};
  const def = isObj(defaults) ? defaults : {};
  const out: Obj = {};
  for (const [key, f] of Object.entries(fields)) {
    out[key] = normalizeField(f, src[key], def[key]);
  }
  return out;
}

function normalizeField(f: Field, v: unknown, def: unknown): unknown {
  if (f.type === 'group') return normalizeObject(f.fields, v, def);
  if (f.type === 'list') {
    const items = Array.isArray(v) ? v : Array.isArray(def) ? def : [];
    return items.map((item) => normalizeObject(f.item, item, f.newItem));
  }
  if (hasShape(f, v)) return structuredClone(v);
  if (def !== undefined) return structuredClone(def);
  return emptyValue(f);
}

function emptyValue(f: Field): unknown {
  switch (f.type) {
    case 'text':
      return '';
    case 'number':
      return f.min ?? 0;
    case 'boolean':
      return false;
    case 'select':
      return f.options[0]?.value ?? '';
    case 'color':
      return '#000000';
    case 'image':
    case 'audio':
      return null;
    case 'emojiOrImage':
      return { emoji: '⭐', image: null };
    case 'font':
      return { family: 'Be Vietnam Pro', media: null };
    case 'list':
      return [];
    case 'group':
      return {};
  }
}

/** Liệt kê mọi MediaRef trong cấu hình (để chặn xóa media đang dùng, và để snapshot). */
export function collectMediaIds(fields: Fields, value: unknown): string[] {
  const ids = new Set<string>();
  const visit = (fs: Fields, v: unknown) => {
    const obj = isObj(v) ? v : {};
    for (const [key, f] of Object.entries(fs)) {
      const x = obj[key];
      if ((f.type === 'image' || f.type === 'audio') && isMediaRef(x)) ids.add((x as Obj).id as string);
      if (f.type === 'emojiOrImage' && isObj(x) && isMediaRef(x.image)) ids.add((x.image as Obj).id as string);
      if (f.type === 'font' && isObj(x) && isMediaRef(x.media)) ids.add((x.media as Obj).id as string);
      if (f.type === 'group') visit(f.fields, x);
      if (f.type === 'list' && Array.isArray(x)) x.forEach((item) => visit(f.item, item));
    }
  };
  visit(fields, value);
  return [...ids];
}
