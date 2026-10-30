import type { ModuleSchema } from '@opes/module-sdk/core';
import { sampleDefaults, sampleFields, type SampleConfig } from './config';

/**
 * Module mẫu "Chạm quà": vật phẩm hiện ngẫu nhiên, chạm để ghi điểm trước khi hết giờ.
 * Dùng mọi loại trường để kiểm tra form tự sinh và khung xem trước.
 */
export const sampleSchema: ModuleSchema<SampleConfig> = {
  key: 'game.sample',
  kind: 'game',
  version: '0.1.0',
  name: 'Chạm quà (module mẫu)',
  description: 'Chạm vào vật phẩm xuất hiện trên màn hình để ghi điểm trước khi hết giờ.',
  fields: sampleFields,
  defaults: sampleDefaults,
  screens: [
    { id: 'intro', label: 'Mở đầu' },
    { id: 'play', label: 'Đang chơi' },
    { id: 'end', label: 'Kết thúc' },
  ],
  scoring: { unit: 'điểm', higherIsBetter: true },
};
