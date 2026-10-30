import type { MediaRef, ModulePreset } from '@opes/module-sdk/core';
import { catchQuizDefaults, type CatchQuizConfig, type Question } from './config';

/**
 * Tài nguyên đi kèm mẫu, nằm trong packages/modules/assets và được chép vào /module-assets/ của CMS và
 * trang chơi khi build. `id` bắt đầu bằng "asset:" để phân biệt với file trong thư viện Media.
 */
const asset = (file: string, name = file): MediaRef => ({
  id: `asset:catch-quiz/ome/${file}`,
  url: `/module-assets/catch-quiz/ome/${file}`,
  name,
});
const img = (file: string) => ({ symbol: { emoji: '', image: asset(file) } });

const q = (text: string, answers: string[], correct: number): Question => ({
  text,
  answers: answers.map((a, i) => ({ text: a, correct: i === correct })),
});

/** Bộ câu hỏi của game OME Catch gốc. */
const omeQuestions: Question[] = [
  q('OPES là gì?', ['Hệ thống tích - đổi điểm.', 'Nền tảng đa dịch vụ.', 'Bảo hiểm số phi nhân thọ.', 'Ngân hàng số.'], 2),
  q(
    'Sản phẩm nào là sản phẩm Bảo hiểm số của OPES?',
    ['Bảo hiểm nhà - O.HOUSE.', 'Bảo hiểm tai nạn - O.LIFE.', 'Bảo hiểm vật chất ô tô - O.CAR.', 'Tất cả các đáp án trên.'],
    3,
  ),
  q('Slogan của OPES là gì?', ['Bảo hiểm số cho trải nghiệm mới.', 'Sống chủ động cùng OPES.', 'Bảo hiểm Một chạm.', 'Lái xe an toàn.'], 0),
  q('Đặc điểm của OPES là gì?', ['Đổi điểm nhận quà.', 'Nhiều ưu đãi hấp dẫn.', 'DNA công nghệ, tiên phong số hóa.', 'Bảo hiểm truyền thống.'], 2),
  q(
    'Rủi ro nào thuộc phạm vi bảo vệ của Bảo hiểm vật chất ôtô O.CAR?',
    ['Mất kết nối internet.', 'Va chạm, tai nạn xe.', 'Hỏng điều hòa gia đình.', 'Trễ chuyến bay.'],
    1,
  ),
  q('Tên viết tắt của Bảo hiểm nhà An Gia là gì?', ['O.HOUSE', 'O.CAR', 'O.FLIGHT', 'O.LIFE'], 0),
];

function preset(
  id: string,
  name: string,
  description: string,
  patch: (c: CatchQuizConfig) => void,
): ModulePreset<CatchQuizConfig> {
  const config = structuredClone(catchQuizDefaults);
  patch(config);
  return { id, name, description, config };
}

export const catchQuizPresets: ModulePreset<CatchQuizConfig>[] = [
  preset('ome-catch', 'OME Catch', 'Game gốc của OPES: mascot O-ME, đường chạy, 6 câu hỏi về OPES.', (c) => {
    c.start = {
      enabled: true,
      title: 'O-ME Catch',
      text: 'Kéo O-ME sang trái, sang phải để hứng vật phẩm. Dính lửa, đinh hay virus thì phải trả lời đúng câu hỏi!',
      logo: null,
      buttonLabel: 'Bắt đầu',
    };
    c.look = {
      background: '#081026',
      backgroundImage: asset('background.webp', 'Nền đường chạy'),
      text: '#FFFFFF',
      font: { family: 'Montserrat', media: null },
      numberFont: { family: 'DSEG7', media: asset('DSEG7Classic-Bold.woff2', 'DSEG7Classic-Bold.woff2') },
      buttonFrom: '#FD6B03',
      buttonTo: '#AC0E28',
      buttonText: '#FFFFFF',
      overlayTint: '#2B2F7640',
    };
    c.hud = {
      timerBoard: asset('board-hud.webp', 'Khung đồng hồ'),
      timerIcon: asset('timer.svg', 'Đồng hồ'),
      scoreBoard: asset('board-score.webp', 'Khung điểm'),
      heart: { emoji: '', image: asset('heart.webp', 'Tim') },
      warnColor: '#FF4757',
      timerWarnAt: 10,
    };
    c.catcher = {
      normal: { emoji: '', image: asset('o-me.webp', 'O-ME') },
      hurt: { emoji: '', image: asset('o-me-dau.webp', 'O-ME bị điện giật') },
      width: 440,
      height: 382,
      bottom: 118,
      insetX: 30,
      catchTop: 5,
      catchBottom: 60,
      keyboardSpeed: 360,
    };
    c.groups = [
      {
        name: 'Bảo hiểm',
        symbols: [
          img('good-phone.webp'),
          img('good-car.webp'),
          img('good-bike.webp'),
          img('good-home.webp'),
          img('good-health.webp'),
          img('good-luggage.webp'),
        ],
        points: 10,
        ratio: 70,
        effect: 'score',
        glow: '#FFFFFF',
        pulse: true,
      },
      { name: 'Vàng', symbols: [img('gold.webp')], points: 50, ratio: 10, effect: 'score', glow: '#FED645', pulse: true },
      {
        name: 'Rủi ro',
        symbols: [img('fire.webp'), img('dinh.webp'), img('virus.webp')],
        points: 0,
        ratio: 20,
        effect: 'question',
        glow: '#FF0000BD',
        pulse: true,
      },
    ];
    c.rules = { duration: 60, lives: 3, lanes: 5, itemSize: 135, countdown: true, countdownFrom: 3, startText: 'START' };
    c.phases = [
      { until: 20, speed: 300, interval: 1300, waveSize: 2 },
      { until: 40, speed: 380, interval: 1150, waveSize: 2 },
      { until: 60, speed: 450, interval: 1150, waveSize: 3 },
    ];
    c.quiz = {
      questions: omeQuestions,
      shuffleAnswers: false,
      card: asset('question-card.webp', 'Khung câu hỏi'),
      hurtSeconds: 3,
      correctBonus: 0,
      wrongPenalty: 'life',
      wrongPoints: 10,
      continueLabel: 'Tiếp tục',
      continueCountdown: true,
    };
    c.end = {
      title: 'Chúc mừng bạn đã\nhoàn thành thử thách!',
      mascot: { emoji: '', image: asset('o-me-thang.webp', 'O-ME vui') },
      ctaEnabled: false,
      ctaLabel: 'Nhận quà ngay!',
      ctaUrl: '',
      ctaAppendScore: true,
      replayEnabled: true,
      replayLabel: 'Chơi lại',
    };
  }),
];
