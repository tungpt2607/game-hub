import type { GameVersionDetail } from '@opes/contracts';
import { api } from '../lib/api';

/** Mã nguồn và file kèm của một phiên bản game đã phát hành. */
export const fetchGameVersion = (moduleKey: string, version: string) =>
  api<GameVersionDetail>(
    `/modules/${encodeURIComponent(moduleKey)}/versions/${encodeURIComponent(version)}`,
  );
