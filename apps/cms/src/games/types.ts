import type { GameAsset } from '@opes/contracts';

export type GameFiles = Record<string, string>;
export type GameAssets = Record<string, GameAsset>;

/** File kèm chưa tải lên kho (vừa đọc từ .zip hoặc vừa chọn). */
export interface PendingAsset {
  blob: Blob;
  mime: string;
}
