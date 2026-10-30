import type { ModuleSchema } from '@opes/module-sdk/core';
import { catchDefaults, catchFields, type CatchConfig } from './config';
import { catchPresets } from './presets';

/** Mô tả game Hứng quà, không gồm phần chạy (API dùng để kiểm tra cấu hình). */
export const catchSchema: ModuleSchema<CatchConfig> = {
  key: 'game.catch',
  kind: 'game',
  version: '1.0.0',
  name: 'Hứng quà',
  description: 'Kéo giỏ sang trái, sang phải để hứng vật phẩm rơi; tránh vật xấu.',
  fields: catchFields,
  defaults: catchDefaults,
  presets: catchPresets,
  screens: [
    { id: 'intro', label: 'Mở đầu' },
    { id: 'guide', label: 'Hướng dẫn' },
    { id: 'play', label: 'Đang chơi' },
    { id: 'end', label: 'Kết thúc' },
  ],
  scoring: { unit: 'điểm', higherIsBetter: true },
};

export default catchSchema;
