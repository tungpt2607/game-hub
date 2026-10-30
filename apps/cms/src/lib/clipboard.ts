/**
 * Sao chép chữ vào bộ nhớ tạm. Thử Clipboard API trước; nếu trình duyệt chặn (thường gặp trên
 * Safari iPhone), chọn chữ trong ô `input` được truyền vào rồi dùng lệnh copy cũ.
 * Trả về `true` nếu sao chép được.
 */
export async function copyText(text: string, input?: HTMLInputElement | HTMLTextAreaElement | null): Promise<boolean> {
  if (input && legacyCopy(input)) return true;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Bị chặn: thử cách khác bên dưới.
  }
  return input ? false : legacyCopyDetached(text);
}

/** Chọn toàn bộ chữ trong ô (iOS cần setSelectionRange thay vì select()). */
export function selectAll(input: HTMLInputElement | HTMLTextAreaElement) {
  input.focus();
  input.setSelectionRange(0, input.value.length);
}

function legacyCopy(input: HTMLInputElement | HTMLTextAreaElement): boolean {
  try {
    selectAll(input);
    // execCommand đã cũ nhưng vẫn là cách chắc chắn nhất trên Safari iPhone.
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

function legacyCopyDetached(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);
  try {
    return legacyCopy(area);
  } finally {
    area.remove();
  }
}
