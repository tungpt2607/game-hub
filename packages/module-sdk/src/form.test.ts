import { describe, expect, it } from 'vitest';
import { field, type Fields } from './fields';
import { describeForm, serializeSchema } from './form';

const fields: Fields = {
  showCta: field.boolean({ label: 'Nút' }),
  ctaUrl: field.text({ label: 'Link', visibleWhen: field.when<{ showCta: boolean }>((c) => c.showCta) }),
  items: field.list({
    label: 'Vật phẩm',
    newItem: { name: '', points: 1 },
    itemLabel: (it, i) => it.name || `Mục ${i + 1}`,
    item: {
      name: field.text({ label: 'Tên' }),
      points: field.number({ label: 'Điểm', visibleWhen: field.when<{ showCta: boolean }>((c) => !c.showCta) }),
    },
  }),
};

describe('describeForm', () => {
  it('liệt kê trường bị ẩn (cả trong danh sách) và tên từng phần tử', () => {
    const state = describeForm(fields, { showCta: true, ctaUrl: '', items: [{ name: 'Vàng' }, { name: '' }] });
    expect(state.hidden).toEqual(['items.0.points', 'items.1.points']);
    expect(state.labels).toEqual({ items: ['Vàng', 'Mục 2'] });
    expect(describeForm(fields, { showCta: false, items: [] }).hidden).toEqual(['ctaUrl']);
  });
});

describe('serializeSchema', () => {
  it('bỏ các hàm, giữ phần còn lại', () => {
    const s = serializeSchema({
      key: 'game.x',
      kind: 'game',
      version: '1.0.0',
      name: 'X',
      description: '',
      fields,
      defaults: { showCta: false },
      screens: [{ id: 'start', label: 'Mở đầu' }],
    });
    expect(s.fields.ctaUrl).toEqual({ type: 'text', label: 'Link' });
    expect(s.presets).toEqual([]);
    expect(s.scoring).toBeNull();
  });
});
