/**
 * So sánh hai đoạn văn bản theo dòng (kiểu `git diff`), dùng để xem khác biệt trước khi phát hành.
 * Bỏ phần đầu/cuối giống nhau rồi tìm dãy con chung dài nhất; văn bản quá lớn thì trả về null.
 */

export type DiffLine = { type: 'same' | 'add' | 'del'; text: string; oldNo?: number; newNo?: number };

export interface Hunk {
  lines: DiffLine[];
}

/** Giới hạn ô của bảng so sánh (số dòng cũ × số dòng mới phần khác nhau) để không treo trình duyệt. */
const MAX_CELLS = 4_000_000;

export function diffLines(before: string, after: string): DiffLine[] | null {
  const a = before === '' ? [] : before.split('\n');
  const b = after === '' ? [] : after.split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const n = endA - start;
  const m = endB - start;
  if (n * m > MAX_CELLS) return null;

  // Bảng LCS cho phần giữa (lưu theo hàng bằng mảng số nguyên để nhẹ bộ nhớ).
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        a[start + i] === b[start + j]
          ? table[(i + 1) * width + j + 1]! + 1
          : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let oldNo = 1;
  let newNo = 1;
  const same = (text: string) => out.push({ type: 'same', text, oldNo: oldNo++, newNo: newNo++ });
  for (let k = 0; k < start; k++) same(a[k]!);
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[start + i] === b[start + j]) {
      same(a[start + i]!);
      i++;
      j++;
    } else if (i < n && (j >= m || table[(i + 1) * width + j]! >= table[i * width + j + 1]!)) {
      // Giống git: dòng bị xóa hiện trước dòng thêm.
      out.push({ type: 'del', text: a[start + i]!, oldNo: oldNo++ });
      i++;
    } else {
      out.push({ type: 'add', text: b[start + j]!, newNo: newNo++ });
      j++;
    }
  }
  for (let k = endA; k < a.length; k++) same(a[k]!);
  return out;
}

/** Gom các dòng thay đổi thành từng đoạn, kèm `context` dòng giống nhau ở hai bên. */
export function toHunks(lines: DiffLine[], context = 3): Hunk[] {
  const changed = lines.map((l, i) => (l.type === 'same' ? -1 : i)).filter((i) => i >= 0);
  if (changed.length === 0) return [];
  const hunks: Hunk[] = [];
  let from = Math.max(0, changed[0]! - context);
  let to = Math.min(lines.length, changed[0]! + context + 1);
  for (const idx of changed.slice(1)) {
    if (idx - context <= to) {
      to = Math.min(lines.length, idx + context + 1);
    } else {
      hunks.push({ lines: lines.slice(from, to) });
      from = Math.max(0, idx - context);
      to = Math.min(lines.length, idx + context + 1);
    }
  }
  hunks.push({ lines: lines.slice(from, to) });
  return hunks;
}

export function countChanges(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.type === 'add') added++;
    else if (l.type === 'del') removed++;
  }
  return { added, removed };
}
