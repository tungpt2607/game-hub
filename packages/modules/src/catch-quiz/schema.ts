import type { ModuleSchema } from '@opes/module-sdk/core';
import { catchQuizDefaults, catchQuizFields, type CatchQuizConfig } from './config';
import { catchQuizPresets } from './presets';

/** Mô tả game Hứng quà + câu hỏi, không gồm phần chạy (API dùng để kiểm tra cấu hình). */
export const catchQuizSchema: ModuleSchema<CatchQuizConfig> = {
  key: 'game.catch-quiz',
  kind: 'game',
  version: '1.0.0',
  name: 'Hứng quà + câu hỏi',
  description: 'Kéo nhân vật hứng vật phẩm theo làn; dính vật xấu thì phải trả lời câu hỏi để chơi tiếp.',
  fields: catchQuizFields,
  defaults: catchQuizDefaults,
  presets: catchQuizPresets,
  screens: [
    { id: 'start', label: 'Bắt đầu' },
    { id: 'play', label: 'Đang chơi' },
    { id: 'question', label: 'Câu hỏi' },
    { id: 'end', label: 'Kết thúc' },
  ],
  scoring: { unit: 'điểm', higherIsBetter: true },
};

export default catchQuizSchema;
