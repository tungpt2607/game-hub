import { describe, expect, it } from 'vitest';
import { field, type Fields } from './fields';
import { collectMediaIds, normalizeConfig, validateConfig } from './validation';

const img = { id: 'm1', url: 'https://x/a.png' };

const fields: Fields = {
  title: field.text({ label: 'Tiêu đề', required: true, maxLength: 10 }),
  duration: field.number({ label: 'Thời gian', min: 5, max: 60, integer: true }),
  showTimer: field.boolean({ label: 'Hiện đồng hồ' }),
  level: field.select({
    label: 'Độ khó',
    options: [
      { value: 'easy', label: 'Dễ' },
      { value: 'hard', label: 'Khó' },
    ],
  }),
  look: field.group({
    label: 'Giao diện',
    fields: {
      primary: field.color({ label: 'Màu chính' }),
      bg: field.image({ label: 'Ảnh nền' }),
      font: field.font({ label: 'Font' }),
    },
  }),
  timerColor: field.color({
    label: 'Màu đồng hồ',
    visibleWhen: field.when<{ showTimer: boolean }>((c) => c.showTimer),
  }),
  items: field.list({
    label: 'Vật phẩm',
    min: 1,
    max: 3,
    newItem: { symbol: { emoji: '🍎', image: null }, points: 1 },
    item: {
      symbol: field.emojiOrImage({ label: 'Hình' }),
      points: field.number({ label: 'Điểm', min: 1 }),
    },
  }),
};

const valid = {
  title: 'Hứng quà',
  duration: 30,
  showTimer: false,
  level: 'easy',
  look: { primary: '#ff0000', bg: img, font: { family: 'Nunito', media: null } },
  timerColor: '#000',
  items: [{ symbol: { emoji: '🍎', image: null }, points: 1 }],
};

describe('validateConfig', () => {
  it('cấu hình đúng thì không có lỗi', () => {
    expect(validateConfig(fields, valid)).toEqual({});
  });

  it('báo lỗi theo đường dẫn', () => {
    const errors = validateConfig(fields, {
      ...valid,
      title: '',
      duration: 4.5,
      level: 'x',
      look: { ...valid.look, primary: 'red' },
      items: [{ symbol: { emoji: '', image: null }, points: 0 }],
    });
    expect(Object.keys(errors).sort()).toEqual([
      'duration',
      'items.0.points',
      'items.0.symbol',
      'level',
      'look.primary',
      'title',
    ]);
    expect(errors.title).toBe('Không được để trống');
  });

  it('kiểm tra số lượng phần tử danh sách', () => {
    expect(validateConfig(fields, { ...valid, items: [] }).items).toBe('Cần ít nhất 1 mục');
  });

  it('bỏ qua trường đang ẩn', () => {
    expect(validateConfig(fields, { ...valid, timerColor: 'sai' })).toEqual({});
    expect(validateConfig(fields, { ...valid, showTimer: true, timerColor: 'sai' })).toHaveProperty('timerColor');
  });
});

describe('kiểm tra thêm (check)', () => {
  const quizFields: Fields = {
    answers: field.list<{ text: string; correct: boolean }>({
      label: 'Đáp án',
      newItem: { text: '', correct: false },
      item: { text: field.text({ label: 'Đáp án' }), correct: field.boolean({ label: 'Đúng' }) },
      check: field.check<{ correct: boolean }[]>((list) =>
        list.filter((a) => a.correct).length === 1 ? null : 'Cần đúng một đáp án đúng',
      ),
    }),
  };
  it('báo lỗi khi điều kiện riêng của module không thỏa', () => {
    expect(validateConfig(quizFields, { answers: [{ text: 'A', correct: false }] }).answers).toBe('Cần đúng một đáp án đúng');
    expect(validateConfig(quizFields, { answers: [{ text: 'A', correct: true }] })).toEqual({});
  });
});

describe('định dạng link', () => {
  const linkFields: Fields = { url: field.text({ label: 'Link', format: 'url' }) };
  it('chấp nhận link http(s) hoặc để trống', () => {
    expect(validateConfig(linkFields, { url: 'https://opes.vn/khuyen-mai' })).toEqual({});
    expect(validateConfig(linkFields, { url: '' })).toEqual({});
  });
  it('từ chối chữ không phải link', () => {
    expect(validateConfig(linkFields, { url: 'opes.vn' }).url).toBe('Cần là link bắt đầu bằng https://');
  });
});

describe('normalizeConfig', () => {
  it('điền giá trị thiếu từ mặc định và bỏ khóa thừa', () => {
    const out = normalizeConfig(fields, { title: 'Mới', extra: 1, look: { primary: 42 } }, valid);
    expect(out.title).toBe('Mới');
    expect(out.duration).toBe(30);
    expect(out.look.primary).toBe('#ff0000');
    expect(out).not.toHaveProperty('extra');
  });

  it('chuẩn hóa từng phần tử danh sách theo newItem', () => {
    const out = normalizeConfig(fields, { items: [{ points: 5 }] }, valid);
    expect(out.items).toEqual([{ symbol: { emoji: '🍎', image: null }, points: 5 }]);
  });

  it('không sửa đổi object mặc định', () => {
    const out = normalizeConfig(fields, {}, valid);
    out.look.primary = '#000000';
    expect(valid.look.primary).toBe('#ff0000');
  });
});

describe('collectMediaIds', () => {
  it('lấy mọi media được tham chiếu', () => {
    const cfg = {
      ...valid,
      items: [{ symbol: { emoji: '', image: { id: 'm2', url: 'u' } }, points: 1 }],
    };
    expect(collectMediaIds(fields, cfg).sort()).toEqual(['m1', 'm2']);
  });
});
