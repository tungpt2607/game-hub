import { defineModule } from '@opes/module-sdk';
import { sampleDefaults, sampleFields, type SampleConfig } from './config';
import { SampleRuntime } from './Runtime';

/**
 * Module mẫu "Chạm quà": vật phẩm hiện ngẫu nhiên, chạm để ghi điểm trước khi hết giờ.
 * Dùng mọi loại trường để kiểm tra form tự sinh và khung xem trước; module thật đầu tiên là "game.catch" (Bước 6).
 */
export const sampleModule = defineModule<SampleConfig>({
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
  Runtime: SampleRuntime,
  scoring: { unit: 'điểm', higherIsBetter: true },
});
