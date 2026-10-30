import type { ModulePreset } from '@opes/module-sdk/core';
import { catchDefaults, type CatchConfig, type CatchItem } from './config';

const item = (
  emoji: string,
  points: number,
  weight: number,
  flags: Partial<Pick<CatchItem, 'loseLifeOnCatch' | 'loseLifeOnMiss'>> = {},
): CatchItem => ({
  symbol: { emoji, image: null },
  points,
  weight,
  loseLifeOnCatch: flags.loseLifeOnCatch ?? false,
  loseLifeOnMiss: flags.loseLifeOnMiss ?? false,
});

/** Tạo mẫu từ cấu hình mặc định, chỉ ghi đè phần khác. */
function preset(id: string, name: string, description: string, patch: (c: CatchConfig) => void): ModulePreset<CatchConfig> {
  const config = structuredClone(catchDefaults);
  patch(config);
  return { id, name, description, config };
}

export const catchPresets: ModulePreset<CatchConfig>[] = [
  preset('tet', 'Tết', 'Đỏ vàng, hứng lì xì và hoa mai, tránh pháo.', (c) => {
    c.content.title = 'Hứng lộc đầu xuân';
    c.content.intro = 'Kéo giỏ hứng thật nhiều lì xì và hoa mai để rước lộc về nhà. Tránh pháo nhé!';
    c.look = { ...c.look, background: '#B91C1C', text: '#FEF3C7', primary: '#F59E0B', buttonText: '#7F1D1D', font: { family: 'Baloo 2', media: null } };
    c.basket.symbol = { emoji: '🧺', image: null };
    c.items = [item('🧧', 3, 5), item('🌼', 1, 7), item('💰', 5, 2), item('🧨', 0, 3, { loseLifeOnCatch: true })];
    c.end.title = 'Chúc mừng năm mới!';
    c.end.messages = [
      { minScore: 0, message: 'Bạn hứng được {score} điểm lộc. Thử lại để rước thêm lộc nhé!' },
      { minScore: 30, message: 'Lộc đầy giỏ: {score} điểm! An khang thịnh vượng!' },
      { minScore: 80, message: '{score} điểm – lộc lá ngập tràn cả năm!' },
    ];
    c.end.shareText = 'Mình vừa hứng được {score} điểm lộc đầu xuân, vào thử nhé!';
  }),
  preset('trung-thu', 'Trung thu', 'Đêm trăng tím, hứng bánh và đèn lồng.', (c) => {
    c.content.title = 'Hứng bánh đêm trăng';
    c.content.intro = 'Chị Hằng thả bánh trung thu xuống! Kéo giỏ hứng bánh và đèn lồng, đừng để rơi bánh nhé.';
    c.look = { ...c.look, background: '#312E81', text: '#FDE68A', primary: '#F59E0B', buttonText: '#1E1B4B', font: { family: 'Quicksand', media: null } };
    c.basket.symbol = { emoji: '🧺', image: null };
    c.rules.endMode = 'either';
    c.items = [item('🥮', 3, 6, { loseLifeOnMiss: true }), item('🏮', 2, 5), item('🌕', 10, 1), item('☁️', -2, 3)];
    c.end.title = 'Trung thu vui vẻ!';
    c.end.shareText = 'Mình hứng được {score} điểm bánh trung thu, chơi thử không?';
  }),
  preset('giang-sinh', 'Giáng sinh', 'Xanh đỏ tuyết trắng, hứng quà và kẹo gậy.', (c) => {
    c.content.title = 'Hứng quà Giáng sinh';
    c.content.intro = 'Ông già Noel đang thả quà! Kéo giỏ hứng quà và kẹo gậy, tránh cục than đen nhé.';
    c.look = { ...c.look, background: '#166534', text: '#FFFFFF', primary: '#DC2626', buttonText: '#FFFFFF', font: { family: 'Nunito', media: null } };
    c.basket.symbol = { emoji: '🛷', image: null };
    c.items = [item('🎁', 3, 5), item('🍬', 1, 7), item('⛄', 5, 2), item('⚫', 0, 3, { loseLifeOnCatch: true })];
    c.end.title = 'Giáng sinh an lành!';
    c.end.shareText = 'Mình hứng được {score} điểm quà Giáng sinh, thử sức với mình nhé!';
  }),
  preset('trai-cay', 'Trái cây / F&B', 'Màu tươi, hứng trái cây, tránh sâu. Hợp nhãn hàng đồ uống, thực phẩm.', (c) => {
    c.content.title = 'Hứng trái cây tươi';
    c.content.intro = 'Kéo giỏ hứng trái cây tươi ngon. Cẩn thận con sâu!';
    c.look = { ...c.look, background: '#84CC16', text: '#14532D', primary: '#EA580C', buttonText: '#FFFFFF', font: { family: 'Baloo 2', media: null } };
    c.basket.symbol = { emoji: '🧺', image: null };
    c.difficulty.mode = 'levels';
    c.difficulty.pointsPerLevel = 15;
    c.items = [item('🍓', 2, 6), item('🍊', 2, 6), item('🍉', 5, 2), item('🐛', -3, 3, { loseLifeOnCatch: true })];
    c.end.title = 'Tươi ngon quá!';
    c.end.shareText = 'Mình hứng được {score} điểm trái cây, vào chơi thử nhé!';
  }),
];
