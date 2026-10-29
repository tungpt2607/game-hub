import { field, type EmojiOrImage, type FontValue, type MediaRef } from '@opes/module-sdk';

export interface SampleItem extends Record<string, unknown> {
  symbol: EmojiOrImage;
  points: number;
}

export interface SampleConfig {
  content: { title: string; intro: string; startLabel: string; logo: MediaRef | null };
  look: {
    background: string;
    backgroundImage: MediaRef | null;
    text: string;
    primary: string;
    font: FontValue;
  };
  rules: { duration: number; showTimer: boolean; difficulty: 'easy' | 'normal' | 'hard' };
  items: SampleItem[];
  sound: { music: MediaRef | null; tap: MediaRef | null };
  end: { title: string; message: string; replayLabel: string };
}

export const sampleFields = {
  content: field.group({
    label: 'Nội dung',
    fields: {
      title: field.text({ label: 'Tiêu đề', required: true, maxLength: 60 }),
      intro: field.text({ label: 'Lời giới thiệu', multiline: true, maxLength: 300 }),
      startLabel: field.text({ label: 'Chữ trên nút bắt đầu', required: true, maxLength: 24 }),
      logo: field.image({ label: 'Logo', hint: 'PNG nền trong suốt, rộng khoảng 400 px' }),
    },
  }),
  look: field.group({
    label: 'Giao diện',
    fields: {
      background: field.color({ label: 'Màu nền' }),
      backgroundImage: field.image({ label: 'Ảnh nền', hint: 'Tỉ lệ dọc 9:16, 1080 × 1920 px' }),
      text: field.color({ label: 'Màu chữ' }),
      primary: field.color({ label: 'Màu nút' }),
      font: field.font({ label: 'Font chữ' }),
    },
  }),
  rules: field.group({
    label: 'Luật chơi',
    fields: {
      duration: field.number({ label: 'Thời gian chơi', min: 5, max: 120, integer: true, unit: 'giây' }),
      showTimer: field.boolean({ label: 'Hiện đồng hồ đếm ngược' }),
      difficulty: field.select({
        label: 'Độ khó',
        help: 'Càng khó, vật phẩm biến mất càng nhanh.',
        options: [
          { value: 'easy', label: 'Dễ' },
          { value: 'normal', label: 'Vừa' },
          { value: 'hard', label: 'Khó' },
        ],
      }),
    },
  }),
  items: field.list<SampleItem>({
    label: 'Vật phẩm',
    min: 1,
    max: 8,
    newItem: { symbol: { emoji: '⭐', image: null }, points: 1 },
    itemLabel: (item, i) => `${item.symbol.image ? '🖼️' : item.symbol.emoji} Vật phẩm ${i + 1} · ${item.points} điểm`,
    item: {
      symbol: field.emojiOrImage({ label: 'Hình' }),
      points: field.number({ label: 'Điểm', min: -10, max: 100, integer: true, help: 'Điểm âm là vật phẩm cần tránh.' }),
    },
  }),
  sound: field.group({
    label: 'Âm thanh',
    collapsed: true,
    fields: {
      music: field.audio({ label: 'Nhạc nền' }),
      tap: field.audio({ label: 'Tiếng khi chạm' }),
    },
  }),
  end: field.group({
    label: 'Màn kết thúc',
    collapsed: true,
    fields: {
      title: field.text({ label: 'Tiêu đề', required: true, maxLength: 60 }),
      message: field.text({
        label: 'Lời nhắn',
        multiline: true,
        maxLength: 200,
        help: 'Dùng {score} để chèn điểm của người chơi.',
      }),
      replayLabel: field.text({ label: 'Chữ trên nút chơi lại', required: true, maxLength: 24 }),
    },
  }),
};

export const sampleDefaults: SampleConfig = {
  content: {
    title: 'Chạm quà nhận điểm',
    intro: 'Chạm thật nhanh vào món quà xuất hiện trên màn hình. Tránh quả bom nhé!',
    startLabel: 'Bắt đầu',
    logo: null,
  },
  look: {
    background: '#1E3A8A',
    backgroundImage: null,
    text: '#FFFFFF',
    primary: '#F59E0B',
    font: { family: 'Baloo 2', media: null },
  },
  rules: { duration: 20, showTimer: true, difficulty: 'normal' },
  items: [
    { symbol: { emoji: '🎁', image: null }, points: 3 },
    { symbol: { emoji: '⭐', image: null }, points: 1 },
    { symbol: { emoji: '💣', image: null }, points: -5 },
  ],
  sound: { music: null, tap: null },
  end: { title: 'Hết giờ!', message: 'Bạn đạt {score} điểm.', replayLabel: 'Chơi lại' },
};
