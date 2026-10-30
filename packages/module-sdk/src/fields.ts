/**
 * Các loại trường cấu hình của module (xem docs/02-chuan-module.md).
 * CMS đọc danh sách trường để tự sinh form; API và CMS dùng chung để kiểm tra cấu hình.
 */

/** Tham chiếu tới một file trong thư viện Media. `id` là khóa bền vững; `url` để hiển thị. */
export interface MediaRef {
  id: string;
  url: string;
  name?: string;
}

/** Giá trị trường emoji-hoặc-ảnh: có ảnh thì dùng ảnh, không thì dùng emoji. */
export interface EmojiOrImage {
  emoji: string;
  image: MediaRef | null;
}

/** Giá trị trường font: tên font Google, hoặc font riêng tải lên thư viện Media. */
export interface FontValue {
  family: string;
  media: MediaRef | null;
}

/** Điều kiện hiện trường, nhận toàn bộ cấu hình gốc. Trường bị ẩn thì không bị kiểm tra lỗi. */
type VisibleWhen = (root: never) => boolean;

/** Kiểm tra thêm cho trường (sau khi đã đúng kiểu); trả về câu báo lỗi, hoặc null nếu hợp lệ. */
type FieldCheck = (value: never, root: never) => string | null;

interface FieldBase {
  label: string;
  help?: string;
  visibleWhen?: VisibleWhen;
  check?: FieldCheck;
}

export interface TextField extends FieldBase {
  type: 'text';
  required?: boolean;
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
  /** Kiểm tra thêm định dạng: `url` = link bắt đầu bằng http:// hoặc https://. */
  format?: 'url';
}
export interface NumberField extends FieldBase {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  unit?: string;
}
export interface BooleanField extends FieldBase {
  type: 'boolean';
}
export interface SelectField extends FieldBase {
  type: 'select';
  options: { value: string; label: string }[];
}
export interface ColorField extends FieldBase {
  type: 'color';
}
export interface ImageField extends FieldBase {
  type: 'image';
  required?: boolean;
  /** Gợi ý kích thước, ví dụ "Tỉ lệ dọc 9:16, 1080 × 1920 px". */
  hint?: string;
}
export interface AudioField extends FieldBase {
  type: 'audio';
  required?: boolean;
}
export interface EmojiOrImageField extends FieldBase {
  type: 'emojiOrImage';
}
export interface FontField extends FieldBase {
  type: 'font';
}
export interface ListField extends FieldBase {
  type: 'list';
  item: Fields;
  /** Giá trị của một phần tử mới khi bấm "Thêm". */
  newItem: Record<string, unknown>;
  min?: number;
  max?: number;
  /** Tên hiển thị của từng phần tử trong form. */
  itemLabel?: (item: never, index: number) => string;
}
export interface GroupField extends FieldBase {
  type: 'group';
  fields: Fields;
  /** Nhóm gập sẵn khi mở form. */
  collapsed?: boolean;
}

export type Field =
  | TextField
  | NumberField
  | BooleanField
  | SelectField
  | ColorField
  | ImageField
  | AudioField
  | EmojiOrImageField
  | FontField
  | ListField
  | GroupField;

export type Fields = Record<string, Field>;

/** Hàm tạo trường, giúp khai báo lược đồ gọn và đúng kiểu. */
export const field = {
  text: (o: Omit<TextField, 'type'>): TextField => ({ type: 'text', ...o }),
  number: (o: Omit<NumberField, 'type'>): NumberField => ({ type: 'number', ...o }),
  boolean: (o: Omit<BooleanField, 'type'>): BooleanField => ({ type: 'boolean', ...o }),
  select: (o: Omit<SelectField, 'type'>): SelectField => ({ type: 'select', ...o }),
  color: (o: Omit<ColorField, 'type'>): ColorField => ({ type: 'color', ...o }),
  image: (o: Omit<ImageField, 'type'>): ImageField => ({ type: 'image', ...o }),
  audio: (o: Omit<AudioField, 'type'>): AudioField => ({ type: 'audio', ...o }),
  emojiOrImage: (o: Omit<EmojiOrImageField, 'type'>): EmojiOrImageField => ({ type: 'emojiOrImage', ...o }),
  font: (o: Omit<FontField, 'type'>): FontField => ({ type: 'font', ...o }),
  list: <Item extends Record<string, unknown>>(
    o: Omit<ListField, 'type' | 'newItem' | 'itemLabel'> & {
      newItem: Item;
      itemLabel?: (item: Item, index: number) => string;
    },
  ): ListField => ({ type: 'list', ...o }) as ListField,
  group: (o: Omit<GroupField, 'type'>): GroupField => ({ type: 'group', ...o }),
  /** Kiểm tra thêm có kiểu, ví dụ "phải có đúng một đáp án đúng". */
  check:
    <Value, Config = unknown>(fn: (value: Value, root: Config) => string | null): FieldCheck =>
    (value: never, root: never) =>
      fn(value as Value, root as Config),
  /** Điều kiện hiện trường có kiểu theo cấu hình của module. */
  when:
    <Config>(fn: (root: Config) => boolean): VisibleWhen =>
    (root: never) =>
      fn(root as Config),
};
