import { defineModule } from '@opes/module-sdk';
import { catchDefaults, catchFields, type CatchConfig } from './config';
import { catchPresets } from './presets';
import { CatchRuntime } from './Runtime';

/** Game Hứng quà: kéo giỏ hứng vật phẩm rơi (xem docs/02-chuan-module.md). */
export const catchModule = defineModule<CatchConfig>({
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
  Runtime: CatchRuntime,
  scoring: { unit: 'điểm', higherIsBetter: true },
});
