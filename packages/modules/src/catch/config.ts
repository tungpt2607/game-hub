import { field, type EmojiOrImage, type FontValue, type MediaRef } from '@opes/module-sdk/core';

export type EndMode = 'time' | 'lives' | 'either';
export type DifficultyMode = 'ramp' | 'levels';
export type BasketSize = 'small' | 'medium' | 'large';

export interface CatchItem extends Record<string, unknown> {
  symbol: EmojiOrImage;
  points: number;
  /** Tần suất xuất hiện tương đối (1–10). */
  weight: number;
  loseLifeOnCatch: boolean;
  loseLifeOnMiss: boolean;
}

export interface EndMessage extends Record<string, unknown> {
  minScore: number;
  message: string;
}

export interface CatchConfig {
  content: {
    title: string;
    intro: string;
    startLabel: string;
    logo: MediaRef | null;
  };
  guide: {
    enabled: boolean;
    text: string;
    image: MediaRef | null;
    playLabel: string;
  };
  look: {
    background: string;
    backgroundImage: MediaRef | null;
    text: string;
    primary: string;
    buttonText: string;
    font: FontValue;
  };
  basket: {
    symbol: EmojiOrImage;
    size: BasketSize;
  };
  rules: {
    endMode: EndMode;
    duration: number;
    lives: number;
    countdown: boolean;
  };
  difficulty: {
    mode: DifficultyMode;
    fallStart: number;
    fallEnd: number;
    spawnStart: number;
    spawnEnd: number;
    rampSeconds: number;
    pointsPerLevel: number;
    maxLevel: number;
  };
  items: CatchItem[];
  sound: {
    music: MediaRef | null;
    catch: MediaRef | null;
    bad: MediaRef | null;
    end: MediaRef | null;
  };
  end: {
    title: string;
    messages: EndMessage[];
    showBest: boolean;
    replayLabel: string;
    ctaEnabled: boolean;
    ctaLabel: string;
    ctaUrl: string;
    shareEnabled: boolean;
    shareText: string;
  };
}

const when = field.when<CatchConfig>;

export const catchFields = {
  content: field.group({
    label: 'Màn mở đầu',
    fields: {
      title: field.text({ label: 'Tiêu đề', required: true, maxLength: 60 }),
      intro: field.text({ label: 'Lời giới thiệu', multiline: true, maxLength: 300 }),
      startLabel: field.text({ label: 'Chữ trên nút bắt đầu', required: true, maxLength: 24 }),
      logo: field.image({ label: 'Logo', hint: 'PNG nền trong suốt, rộng khoảng 400 px' }),
    },
  }),
  guide: field.group({
    label: 'Màn hướng dẫn',
    collapsed: true,
    help: 'Tự liệt kê các vật phẩm và điểm; thêm lời dẫn và ảnh minh họa nếu cần.',
    fields: {
      enabled: field.boolean({ label: 'Hiện màn hướng dẫn trước khi chơi' }),
      text: field.text({
        label: 'Lời dẫn',
        multiline: true,
        maxLength: 300,
        visibleWhen: when((c) => c.guide.enabled),
      }),
      image: field.image({
        label: 'Ảnh minh họa',
        hint: 'Tùy chọn, ví dụ ảnh chỉ cách kéo giỏ',
        visibleWhen: when((c) => c.guide.enabled),
      }),
      playLabel: field.text({
        label: 'Chữ trên nút chơi',
        required: true,
        maxLength: 24,
        visibleWhen: when((c) => c.guide.enabled),
      }),
    },
  }),
  look: field.group({
    label: 'Giao diện',
    fields: {
      background: field.color({ label: 'Màu nền' }),
      backgroundImage: field.image({ label: 'Ảnh nền', hint: 'Tỉ lệ dọc 9:16, 1080 × 1920 px' }),
      text: field.color({ label: 'Màu chữ' }),
      primary: field.color({ label: 'Màu nút' }),
      buttonText: field.color({ label: 'Màu chữ trên nút' }),
      font: field.font({ label: 'Font chữ' }),
    },
  }),
  basket: field.group({
    label: 'Giỏ hứng',
    fields: {
      symbol: field.emojiOrImage({ label: 'Hình giỏ' }),
      size: field.select({
        label: 'Kích thước giỏ',
        help: 'Giỏ càng nhỏ càng khó hứng.',
        options: [
          { value: 'small', label: 'Nhỏ' },
          { value: 'medium', label: 'Vừa' },
          { value: 'large', label: 'Lớn' },
        ],
      }),
    },
  }),
  rules: field.group({
    label: 'Luật chơi',
    fields: {
      endMode: field.select({
        label: 'Kết thúc khi',
        options: [
          { value: 'time', label: 'Hết giờ' },
          { value: 'lives', label: 'Hết mạng' },
          { value: 'either', label: 'Hết giờ hoặc hết mạng (cái nào đến trước)' },
        ],
      }),
      duration: field.number({
        label: 'Thời gian chơi',
        min: 10,
        max: 300,
        integer: true,
        unit: 'giây',
        visibleWhen: when((c) => c.rules.endMode !== 'lives'),
      }),
      lives: field.number({
        label: 'Số mạng',
        min: 1,
        max: 10,
        integer: true,
        visibleWhen: when((c) => c.rules.endMode !== 'time'),
      }),
      countdown: field.boolean({ label: 'Đếm ngược 3-2-1 trước khi chơi' }),
    },
  }),
  difficulty: field.group({
    label: 'Độ khó',
    collapsed: true,
    fields: {
      mode: field.select({
        label: 'Cách tăng độ khó',
        options: [
          { value: 'ramp', label: 'Tăng dần theo thời gian' },
          { value: 'levels', label: 'Theo màn: đủ điểm thì lên màn' },
        ],
      }),
      fallStart: field.number({
        label: 'Thời gian rơi hết màn hình lúc đầu',
        help: 'Số giây để một vật phẩm rơi từ trên xuống dưới. Càng nhỏ càng nhanh.',
        min: 0.6,
        max: 10,
        step: 0.1,
        unit: 'giây',
      }),
      fallEnd: field.number({ label: 'Thời gian rơi lúc khó nhất', min: 0.6, max: 10, step: 0.1, unit: 'giây' }),
      spawnStart: field.number({ label: 'Số vật phẩm mỗi giây lúc đầu', min: 0.2, max: 6, step: 0.1 }),
      spawnEnd: field.number({ label: 'Số vật phẩm mỗi giây lúc khó nhất', min: 0.2, max: 6, step: 0.1 }),
      rampSeconds: field.number({
        label: 'Sau bao lâu thì khó nhất',
        min: 5,
        max: 600,
        integer: true,
        unit: 'giây',
        visibleWhen: when((c) => c.difficulty.mode === 'ramp'),
      }),
      pointsPerLevel: field.number({
        label: 'Số điểm để lên màn',
        min: 1,
        max: 1000,
        integer: true,
        visibleWhen: when((c) => c.difficulty.mode === 'levels'),
      }),
      maxLevel: field.number({
        label: 'Màn khó nhất',
        min: 2,
        max: 50,
        integer: true,
        visibleWhen: when((c) => c.difficulty.mode === 'levels'),
      }),
    },
  }),
  items: field.list<CatchItem>({
    label: 'Vật phẩm rơi',
    min: 1,
    max: 10,
    newItem: { symbol: { emoji: '⭐', image: null }, points: 1, weight: 5, loseLifeOnCatch: false, loseLifeOnMiss: false },
    itemLabel: (item, i) => {
      const symbol = item.symbol.image ? '🖼️' : item.symbol.emoji;
      const tags = [
        `${item.points > 0 ? '+' : ''}${item.points} điểm`,
        item.loseLifeOnCatch ? 'hứng mất mạng' : '',
        item.loseLifeOnMiss ? 'rơi mất mạng' : '',
      ].filter(Boolean);
      return `${symbol} Vật phẩm ${i + 1} · ${tags.join(' · ')}`;
    },
    item: {
      symbol: field.emojiOrImage({ label: 'Hình' }),
      points: field.number({
        label: 'Điểm khi hứng',
        min: -100,
        max: 100,
        integer: true,
        help: 'Điểm âm là vật phẩm cần tránh.',
      }),
      weight: field.number({
        label: 'Tần suất xuất hiện',
        min: 1,
        max: 10,
        integer: true,
        help: '1 = hiếm, 10 = rất thường gặp (so với các vật phẩm khác).',
      }),
      loseLifeOnCatch: field.boolean({
        label: 'Hứng phải thì mất mạng',
        visibleWhen: when((c) => c.rules.endMode !== 'time'),
      }),
      loseLifeOnMiss: field.boolean({
        label: 'Để rơi thì mất mạng',
        visibleWhen: when((c) => c.rules.endMode !== 'time'),
      }),
    },
  }),
  sound: field.group({
    label: 'Âm thanh',
    collapsed: true,
    fields: {
      music: field.audio({ label: 'Nhạc nền' }),
      catch: field.audio({ label: 'Tiếng khi hứng được' }),
      bad: field.audio({ label: 'Tiếng khi mất mạng / hứng vật xấu' }),
      end: field.audio({ label: 'Tiếng khi kết thúc' }),
    },
  }),
  end: field.group({
    label: 'Màn kết thúc',
    collapsed: true,
    fields: {
      title: field.text({ label: 'Tiêu đề', required: true, maxLength: 60 }),
      messages: field.list<EndMessage>({
        label: 'Lời nhắn theo mức điểm',
        help: 'Hiện lời nhắn của mức cao nhất mà người chơi đạt. Dùng {score} để chèn điểm.',
        min: 1,
        max: 6,
        newItem: { minScore: 0, message: 'Bạn đạt {score} điểm.' },
        itemLabel: (m) => `Từ ${m.minScore} điểm: ${m.message || '…'}`,
        item: {
          minScore: field.number({ label: 'Từ số điểm', min: -1000, max: 100000, integer: true }),
          message: field.text({ label: 'Lời nhắn', required: true, multiline: true, maxLength: 200 }),
        },
      }),
      showBest: field.boolean({ label: 'Hiện điểm cao nhất trên máy người chơi' }),
      replayLabel: field.text({ label: 'Chữ trên nút chơi lại', required: true, maxLength: 24 }),
      ctaEnabled: field.boolean({ label: 'Hiện nút kêu gọi (ví dụ "Mua ngay")' }),
      ctaLabel: field.text({
        label: 'Chữ trên nút kêu gọi',
        required: true,
        maxLength: 30,
        visibleWhen: when((c) => c.end.ctaEnabled),
      }),
      ctaUrl: field.text({
        label: 'Link của nút kêu gọi',
        required: true,
        format: 'url',
        placeholder: 'https://',
        visibleWhen: when((c) => c.end.ctaEnabled),
      }),
      shareEnabled: field.boolean({ label: 'Hiện nút chia sẻ' }),
      shareText: field.text({
        label: 'Lời chia sẻ',
        maxLength: 160,
        help: 'Dùng {score} để chèn điểm.',
        visibleWhen: when((c) => c.end.shareEnabled),
      }),
    },
  }),
};

export const catchDefaults: CatchConfig = {
  content: {
    title: 'Hứng quà rinh điểm',
    intro: 'Kéo giỏ sang trái, sang phải để hứng thật nhiều quà. Cẩn thận với quả bom!',
    startLabel: 'Bắt đầu',
    logo: null,
  },
  guide: {
    enabled: true,
    text: 'Dùng ngón tay kéo giỏ để hứng vật phẩm.',
    image: null,
    playLabel: 'Chơi ngay',
  },
  look: {
    background: '#0EA5E9',
    backgroundImage: null,
    text: '#FFFFFF',
    primary: '#F97316',
    buttonText: '#FFFFFF',
    font: { family: 'Baloo 2', media: null },
  },
  basket: { symbol: { emoji: '🧺', image: null }, size: 'medium' },
  rules: { endMode: 'either', duration: 45, lives: 3, countdown: true },
  difficulty: {
    mode: 'ramp',
    fallStart: 3.2,
    fallEnd: 1.6,
    spawnStart: 0.9,
    spawnEnd: 2.2,
    rampSeconds: 40,
    pointsPerLevel: 20,
    maxLevel: 8,
  },
  items: [
    { symbol: { emoji: '🎁', image: null }, points: 3, weight: 4, loseLifeOnCatch: false, loseLifeOnMiss: false },
    { symbol: { emoji: '⭐', image: null }, points: 1, weight: 8, loseLifeOnCatch: false, loseLifeOnMiss: false },
    { symbol: { emoji: '💎', image: null }, points: 10, weight: 1, loseLifeOnCatch: false, loseLifeOnMiss: false },
    { symbol: { emoji: '💣', image: null }, points: 0, weight: 3, loseLifeOnCatch: true, loseLifeOnMiss: false },
  ],
  sound: { music: null, catch: null, bad: null, end: null },
  end: {
    title: 'Kết thúc!',
    messages: [
      { minScore: 0, message: 'Bạn đạt {score} điểm. Thử lại nhé!' },
      { minScore: 30, message: 'Giỏi lắm! {score} điểm.' },
      { minScore: 80, message: 'Xuất sắc! {score} điểm – bạn là cao thủ hứng quà!' },
    ],
    showBest: true,
    replayLabel: 'Chơi lại',
    ctaEnabled: false,
    ctaLabel: 'Xem ưu đãi',
    ctaUrl: '',
    shareEnabled: true,
    shareText: 'Mình vừa đạt {score} điểm trong game Hứng quà, thử sức xem!',
  },
};
