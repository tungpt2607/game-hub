import type { ModuleSchema } from '@opes/module-sdk/core';
import { sampleDefaults, sampleFields, type SampleConfig } from './config';
import { presets } from './presets';

/**
 * Mô tả game: CMS đọc file này để biết game tên gì, phiên bản nào, form cấu hình có những trường nào,
 * cấu hình mặc định và các mẫu có sẵn.
 *
 * - key: định danh duy nhất, dạng "game.ten-game" (chữ thường, số, dấu -). Không đổi sau khi tạo.
 * - version: tăng mỗi lần phát hành (1.0.0 → 1.0.1 sửa lỗi nhỏ, → 1.1.0 thêm tính năng, → 2.0.0 đổi lớn).
 */
export const schema: ModuleSchema<SampleConfig> = {
  key: 'game.mau',
  kind: 'game',
  version: '1.0.0',
  name: 'Game mẫu: Chạm quà',
  description: 'Gói mẫu để học cách viết game: chạm vào món quà xuất hiện để ghi điểm trước khi hết giờ.',
  fields: sampleFields,
  defaults: sampleDefaults,
  // Các màn hình để nhảy tới khi xem trước; màn hình đầu tiên là màn hình mở đầu.
  screens: [
    { id: 'intro', label: 'Mở đầu' },
    { id: 'play', label: 'Đang chơi' },
    { id: 'end', label: 'Kết thúc' },
  ],
  presets,
  scoring: { unit: 'điểm', higherIsBetter: true },
};

export default schema;
