import { field } from '@opes/module-sdk/core';
import {
  type ItemSymbol,
  type ItemGroup,
  type Phase,
  type Answer,
  type Question,
  type CatchQuizConfig,
} from './types';

const when = field.when<CatchQuizConfig>;
const px = 'px (khung 1080 × 1920)';

export const catchQuizFields = {
  start: field.group({
    label: 'Màn bắt đầu',
    collapsed: true,
    help: 'Màn có nút bắt đầu. Nên bật để nhạc nền phát được (trình duyệt chỉ cho phát nhạc sau khi người chơi chạm).',
    fields: {
      enabled: field.boolean({ label: 'Hiện màn bắt đầu' }),
      logo: field.image({ label: 'Logo', visibleWhen: when((c) => c.start.enabled) }),
      title: field.text({
        label: 'Tiêu đề',
        maxLength: 80,
        visibleWhen: when((c) => c.start.enabled),
      }),
      text: field.text({
        label: 'Lời giới thiệu',
        multiline: true,
        maxLength: 300,
        visibleWhen: when((c) => c.start.enabled),
      }),
      buttonLabel: field.text({
        label: 'Chữ trên nút bắt đầu',
        required: true,
        maxLength: 24,
        visibleWhen: when((c) => c.start.enabled),
      }),
    },
  }),
  look: field.group({
    label: 'Giao diện',
    fields: {
      background: field.color({ label: 'Màu nền' }),
      backgroundImage: field.image({ label: 'Ảnh nền', hint: 'Tỉ lệ 9:16, ví dụ 1080 × 1920 px' }),
      text: field.color({ label: 'Màu chữ' }),
      font: field.font({ label: 'Font chữ' }),
      numberFont: field.font({ label: 'Font số (điểm, đồng hồ)' }),
      buttonFrom: field.color({ label: 'Màu nút (đầu dải)' }),
      buttonTo: field.color({ label: 'Màu nút (cuối dải)' }),
      buttonText: field.color({ label: 'Màu chữ trên nút' }),
      overlayTint: field.color({
        label: 'Màu phủ khi hiện bảng',
        help: 'Nên có độ trong, ví dụ #2B2F7640.',
      }),
    },
  }),
  hud: field.group({
    label: 'Thanh điểm, đồng hồ, mạng',
    collapsed: true,
    fields: {
      timerBoard: field.image({
        label: 'Khung đồng hồ và mạng',
        hint: 'Để trống thì dùng khung bo tròn đơn giản',
      }),
      timerIcon: field.image({ label: 'Biểu tượng đồng hồ' }),
      scoreBoard: field.image({ label: 'Khung điểm', hint: 'Dùng cả ở màn kết thúc' }),
      heart: field.emojiOrImage({ label: 'Biểu tượng mạng' }),
      warnColor: field.color({ label: 'Màu cảnh báo (sắp hết giờ, còn 1 mạng)' }),
      timerWarnAt: field.number({
        label: 'Đổi màu đồng hồ khi còn',
        min: 0,
        max: 300,
        integer: true,
        unit: 'giây',
      }),
    },
  }),
  catcher: field.group({
    label: 'Nhân vật hứng',
    fields: {
      normal: field.emojiOrImage({ label: 'Hình bình thường' }),
      hurt: field.emojiOrImage({ label: 'Hình khi dính vật xấu' }),
      width: field.number({ label: 'Chiều ngang', min: 100, max: 900, integer: true, unit: px }),
      height: field.number({ label: 'Chiều cao', min: 100, max: 900, integer: true, unit: px }),
      bottom: field.number({
        label: 'Cách đáy màn hình',
        min: 0,
        max: 800,
        integer: true,
        unit: px,
      }),
      insetX: field.number({
        label: 'Bỏ bớt mỗi bên khi tính vùng hứng',
        min: 0,
        max: 45,
        integer: true,
        unit: '%',
        help: 'Ảnh thường có khoảng trống hai bên; tăng số này để chỉ phần thân mới hứng được.',
      }),
      catchTop: field.number({
        label: 'Vùng hứng bắt đầu từ',
        min: 0,
        max: 100,
        integer: true,
        unit: '% chiều cao',
      }),
      catchBottom: field.number({
        label: 'Vùng hứng kết thúc ở',
        min: 0,
        max: 100,
        integer: true,
        unit: '% chiều cao',
      }),
      keyboardSpeed: field.number({
        label: 'Tốc độ khi dùng phím mũi tên',
        min: 100,
        max: 3000,
        integer: true,
        unit: 'px/giây',
      }),
    },
  }),
  groups: field.list<ItemGroup>({
    label: 'Nhóm vật phẩm',
    min: 1,
    max: 8,
    help: 'Mỗi lần rơi, game chọn một nhóm theo tỉ lệ rồi chọn ngẫu nhiên một hình trong nhóm.',
    newItem: {
      name: 'Nhóm mới',
      symbols: [{ symbol: { emoji: '⭐', image: null } }],
      points: 10,
      ratio: 10,
      effect: 'score',
      glow: '#FFFFFF',
      pulse: true,
    },
    itemLabel: (g) => {
      const effect =
        g.effect === 'question'
          ? 'hiện câu hỏi'
          : g.effect === 'life'
            ? 'mất mạng'
            : `+${g.points} điểm`;
      return `${g.name} · ${g.ratio}% · ${effect} · ${g.symbols.length} hình`;
    },
    item: {
      name: field.text({ label: 'Tên nhóm', required: true, maxLength: 40 }),
      symbols: field.list<ItemSymbol>({
        label: 'Hình trong nhóm',
        min: 1,
        max: 12,
        newItem: { symbol: { emoji: '⭐', image: null } },
        itemLabel: (s, i) =>
          `${s.symbol.image ? (s.symbol.image.name ?? 'Ảnh') : s.symbol.emoji} (hình ${i + 1})`,
        item: { symbol: field.emojiOrImage({ label: 'Hình' }) },
      }),
      effect: field.select({
        label: 'Khi hứng được',
        options: [
          { value: 'score', label: 'Cộng điểm' },
          { value: 'question', label: 'Dừng game, hiện câu hỏi' },
          { value: 'life', label: 'Mất 1 mạng' },
        ],
      }),
      points: field.number({
        label: 'Điểm',
        min: -1000,
        max: 1000,
        integer: true,
        help: 'Cộng (hoặc trừ, nếu âm) khi hứng được.',
      }),
      ratio: field.number({ label: 'Tỉ lệ xuất hiện', min: 0, max: 100, integer: true, unit: '%' }),
      glow: field.color({
        label: 'Màu viền phát sáng',
        help: 'Đặt độ trong 00 ở cuối (ví dụ #FFFFFF00) để tắt viền.',
      }),
      pulse: field.boolean({ label: 'Nhịp phóng to – thu nhỏ' }),
    },
    check: field.check<ItemGroup[]>((groups) =>
      groups.reduce((sum, g) => sum + Math.max(0, g.ratio), 0) > 0
        ? null
        : 'Cần ít nhất một nhóm có tỉ lệ lớn hơn 0',
    ),
  }),
  rules: field.group({
    label: 'Luật chơi',
    fields: {
      duration: field.number({
        label: 'Thời gian chơi',
        min: 10,
        max: 600,
        integer: true,
        unit: 'giây',
      }),
      lives: field.number({ label: 'Số mạng', min: 1, max: 10, integer: true }),
      lanes: field.number({ label: 'Số làn rơi', min: 2, max: 10, integer: true }),
      itemSize: field.number({
        label: 'Kích thước vật phẩm',
        min: 50,
        max: 400,
        integer: true,
        unit: px,
      }),
      countdown: field.boolean({ label: 'Đếm ngược trước khi chơi' }),
      countdownFrom: field.number({
        label: 'Đếm ngược từ',
        min: 1,
        max: 10,
        integer: true,
        visibleWhen: when((c) => c.rules.countdown),
      }),
      startText: field.text({
        label: 'Chữ sau đếm ngược',
        maxLength: 16,
        visibleWhen: when((c) => c.rules.countdown),
      }),
    },
  }),
  phases: field.list<Phase>({
    label: 'Giai đoạn độ khó',
    min: 1,
    max: 10,
    help: 'Game đi lần lượt qua các giai đoạn; giai đoạn cuối kéo dài tới hết giờ.',
    newItem: { until: 60, speed: 450, interval: 1150, waveSize: 3 },
    itemLabel: (p, i) =>
      `Giai đoạn ${i + 1}: tới giây ${p.until} · ${p.waveSize} vật / ${p.interval} ms · tốc độ ${p.speed}`,
    item: {
      until: field.number({ label: 'Kéo dài tới giây thứ', min: 1, max: 600, integer: true }),
      speed: field.number({
        label: 'Tốc độ rơi',
        min: 50,
        max: 3000,
        integer: true,
        unit: 'px/giây',
      }),
      interval: field.number({
        label: 'Nhịp thả',
        min: 200,
        max: 10000,
        integer: true,
        unit: 'mili giây',
      }),
      waveSize: field.number({ label: 'Số vật phẩm mỗi đợt', min: 1, max: 10, integer: true }),
    },
    check: field.check<Phase[]>((phases) =>
      phases.every((p, i) => i === 0 || p.until > phases[i - 1]!.until)
        ? null
        : '"Kéo dài tới giây thứ" phải tăng dần',
    ),
  }),
  quiz: field.group({
    label: 'Câu hỏi',
    fields: {
      questions: field.list<Question>({
        label: 'Danh sách câu hỏi',
        min: 1,
        max: 50,
        help: 'Mỗi lần dính vật phẩm "hiện câu hỏi", game chọn ngẫu nhiên một câu chưa hỏi.',
        newItem: {
          text: 'Câu hỏi mới?',
          answers: [
            { text: 'Đáp án A', correct: true },
            { text: 'Đáp án B', correct: false },
          ],
        },
        itemLabel: (q, i) => `${i + 1}. ${q.text || '…'}`,
        item: {
          text: field.text({ label: 'Câu hỏi', required: true, multiline: true, maxLength: 200 }),
          answers: field.list<Answer>({
            label: 'Đáp án',
            min: 2,
            max: 6,
            newItem: { text: '', correct: false },
            itemLabel: (a, i) =>
              `${String.fromCharCode(65 + i)}. ${a.text || '…'}${a.correct ? ' ✓' : ''}`,
            item: {
              text: field.text({ label: 'Nội dung', required: true, maxLength: 120 }),
              correct: field.boolean({ label: 'Là đáp án đúng' }),
            },
            check: field.check<Answer[]>((answers) =>
              answers.filter((a) => a.correct).length === 1
                ? null
                : 'Đánh dấu đúng một đáp án đúng',
            ),
          }),
        },
      }),
      shuffleAnswers: field.boolean({ label: 'Xáo thứ tự đáp án' }),
      card: field.image({
        label: 'Khung câu hỏi',
        hint: 'Tỉ lệ khoảng 935 × 1169 px; để trống thì dùng khung đơn giản',
      }),
      hurtSeconds: field.number({
        label: 'Nhân vật đau bao lâu trước khi hỏi',
        min: 0,
        max: 10,
        step: 0.5,
        unit: 'giây',
      }),
      correctBonus: field.number({
        label: 'Trả lời đúng được cộng',
        min: 0,
        max: 1000,
        integer: true,
        unit: 'điểm',
      }),
      wrongPenalty: field.select({
        label: 'Trả lời sai thì',
        options: [
          { value: 'life', label: 'Mất 1 mạng' },
          { value: 'points', label: 'Bị trừ điểm' },
          { value: 'none', label: 'Không sao' },
        ],
      }),
      wrongPoints: field.number({
        label: 'Số điểm bị trừ',
        min: 0,
        max: 1000,
        integer: true,
        visibleWhen: when((c) => c.quiz.wrongPenalty === 'points'),
      }),
      continueLabel: field.text({ label: 'Chữ trên nút tiếp tục', required: true, maxLength: 20 }),
      continueCountdown: field.boolean({ label: 'Đếm ngược 3-2-1 trước khi chơi tiếp' }),
    },
  }),
  end: field.group({
    label: 'Màn kết thúc',
    collapsed: true,
    fields: {
      title: field.text({
        label: 'Lời chúc mừng',
        multiline: true,
        maxLength: 120,
        help: 'Dùng {score} để chèn điểm.',
      }),
      mascot: field.emojiOrImage({ label: 'Hình nhân vật khi kết thúc' }),
      ctaEnabled: field.boolean({ label: 'Hiện nút kêu gọi (ví dụ "Nhận quà ngay!")' }),
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
      ctaAppendScore: field.boolean({
        label: 'Gắn điểm vào link (?score=…)',
        visibleWhen: when((c) => c.end.ctaEnabled),
      }),
      replayEnabled: field.boolean({ label: 'Hiện nút chơi lại' }),
      replayLabel: field.text({
        label: 'Chữ trên nút chơi lại',
        required: true,
        maxLength: 24,
        visibleWhen: when((c) => c.end.replayEnabled),
      }),
    },
  }),
  sound: field.group({
    label: 'Âm thanh',
    collapsed: true,
    fields: {
      music: field.audio({ label: 'Nhạc nền' }),
      catch: field.audio({ label: 'Tiếng khi hứng được' }),
      bad: field.audio({ label: 'Tiếng khi dính vật xấu' }),
      correct: field.audio({ label: 'Tiếng trả lời đúng' }),
      wrong: field.audio({ label: 'Tiếng trả lời sai' }),
      end: field.audio({ label: 'Tiếng khi kết thúc' }),
    },
  }),
};
