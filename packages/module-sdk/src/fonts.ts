import type { FontValue } from './fields';

export interface GoogleFont {
  family: string;
  /** Các độ đậm cần tải. */
  weights: number[];
  category: 'sans' | 'serif' | 'display' | 'handwriting';
}

/** Font Google có hỗ trợ tiếng Việt, dùng cho trường font. */
export const GOOGLE_FONTS_VI: GoogleFont[] = [
  { family: 'Be Vietnam Pro', weights: [400, 600, 800], category: 'sans' },
  { family: 'Baloo 2', weights: [400, 600, 800], category: 'display' },
  { family: 'Nunito', weights: [400, 700, 900], category: 'sans' },
  { family: 'Quicksand', weights: [400, 600, 700], category: 'sans' },
  { family: 'Montserrat', weights: [400, 600, 800], category: 'sans' },
  { family: 'Roboto', weights: [400, 500, 700], category: 'sans' },
  { family: 'Open Sans', weights: [400, 600, 800], category: 'sans' },
  { family: 'Inter', weights: [400, 600, 800], category: 'sans' },
  { family: 'Lexend', weights: [400, 600, 800], category: 'sans' },
  { family: 'Mulish', weights: [400, 700, 900], category: 'sans' },
  { family: 'Josefin Sans', weights: [400, 600, 700], category: 'sans' },
  { family: 'Playfair Display', weights: [400, 700, 900], category: 'serif' },
  { family: 'Lobster', weights: [400], category: 'display' },
  { family: 'Pacifico', weights: [400], category: 'handwriting' },
  { family: 'Dancing Script', weights: [400, 700], category: 'handwriting' },
  { family: 'Patrick Hand', weights: [400], category: 'handwriting' },
  { family: 'Chakra Petch', weights: [400, 600, 700], category: 'sans' },
  { family: 'Paytone One', weights: [400], category: 'display' },
];

export const DEFAULT_FONT_FAMILY = 'Be Vietnam Pro';

export function findGoogleFont(family: string): GoogleFont | undefined {
  return GOOGLE_FONTS_VI.find((f) => f.family === family);
}

/** Địa chỉ CSS của Google Fonts cho một font (chỉ tải ký tự tiếng Việt + Latin). */
export function googleFontHref(font: GoogleFont): string {
  const family = font.family.replace(/ /g, '+');
  const weights = font.weights.join(';');
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&subset=vietnamese&display=swap`;
}

/** Tên dùng trong CSS cho font riêng tải lên (tránh trùng tên font hệ thống). */
export function customFontFamily(font: FontValue): string {
  // Tên font chỉ giữ chữ, số, gạch (id của tài nguyên mẫu có thể chứa ":" và "/").
  return font.media ? `opes-${font.media.id.replace(/[^A-Za-z0-9_-]/g, '-')}` : font.family;
}

/** Chuỗi `font-family` đầy đủ, có font dự phòng. */
export function cssFontStack(font: FontValue): string {
  const g = findGoogleFont(font.family);
  const fallback = g?.category === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif';
  return `"${customFontFamily(font)}", ${fallback}`;
}

const loaded = new Map<string, Promise<void>>();

/** Tải font vào tài liệu (chạy trong trình duyệt). Gọi nhiều lần vẫn chỉ tải một lần. */
export function loadFont(font: FontValue, doc: Document = document): Promise<void> {
  const name = customFontFamily(font);
  const cached = loaded.get(name);
  if (cached) return cached;

  let task: Promise<void>;
  if (font.media) {
    const face = new FontFace(name, `url(${JSON.stringify(font.media.url)})`, { display: 'swap' });
    task = face.load().then((f) => {
      doc.fonts.add(f);
    });
  } else {
    const g = findGoogleFont(font.family);
    if (!g) return Promise.resolve();
    task = new Promise<void>((resolve) => {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = googleFontHref(g);
      link.onload = () => resolve();
      link.onerror = () => resolve();
      doc.head.appendChild(link);
    });
  }
  task = task.catch(() => undefined);
  loaded.set(name, task);
  return task;
}
