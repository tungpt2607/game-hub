import type { ModulePreset } from '@opes/module-sdk/core';
import { asset } from 'opes:assets';
import { sampleDefaults, type SampleConfig } from './config';

/**
 * Các mẫu có sẵn: người dùng chọn khi tạo template.
 * Ảnh trong thư mục assets/ của gói được dùng qua `asset('đường-dẫn', 'tên hiển thị')`.
 */
export const presets: ModulePreset<SampleConfig>[] = [
  {
    id: 'mua-le-hoi',
    name: 'Mùa lễ hội',
    description: 'Nền đêm sao, hộp quà vẽ sẵn trong gói.',
    config: {
      ...sampleDefaults,
      content: { ...sampleDefaults.content, title: 'Săn quà lễ hội' },
      look: {
        ...sampleDefaults.look,
        background: '#0F172A',
        backgroundImage: asset('nen-dem.svg', 'Nền đêm sao'),
        primary: '#E11D48',
      },
      items: [
        { symbol: { emoji: '', image: asset('hop-qua.svg', 'Hộp quà') }, points: 3 },
        { symbol: { emoji: '⭐', image: null }, points: 1 },
        { symbol: { emoji: '💣', image: null }, points: -5 },
      ],
    },
  },
];
