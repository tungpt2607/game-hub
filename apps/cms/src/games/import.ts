import type { SerializedSchema } from '@opes/module-sdk';
import { inspectGame } from '../module-ui/game-client';
import { placeholderAssets, uploadAssets } from './assets';
import { compileGame, type BuildError } from './compiler';
import type { GameAssets, GameFiles, PendingAsset } from './types';

export class CompileFailed extends Error {
  constructor(readonly errors: BuildError[]) {
    super(errors.map((e) => (e.file ? `${e.file}:${e.line}:${e.column} ${e.text}` : e.text)).join('\n'));
  }
}

export interface PreparedGame {
  schema: SerializedSchema;
  files: GameFiles;
  assets: GameAssets;
  schemaJs: string;
  runtimeJs: string;
}

/**
 * Chuẩn bị gói game mới: biên dịch thử (địa chỉ file kèm tạm) để đọc key, tải file kèm lên kho theo key,
 * rồi biên dịch lại với địa chỉ thật.
 */
export async function prepareNewGame(
  files: GameFiles,
  pending: Record<string, PendingAsset>,
  onStep: (text: string) => void,
  checkKey: (key: string) => void,
): Promise<PreparedGame> {
  onStep('Đang biên dịch…');
  const trial = await compileGame(files, await placeholderAssets(pending));
  if (!trial.ok) throw new CompileFailed(trial.errors);
  onStep('Đang đọc mô tả game…');
  const probe = await inspectGame({ kind: 'code', code: trial.runtimeJs });
  checkKey(probe.key);
  const assets = await uploadAssets(probe.key, pending, (done, total) => {
    if (total > 0) onStep(`Đang tải file kèm lên kho (${done}/${total})…`);
  });
  onStep('Đang biên dịch…');
  const final = await compileGame(files, assets);
  if (!final.ok) throw new CompileFailed(final.errors);
  return { schema: probe, files, assets, schemaJs: final.schemaJs, runtimeJs: final.runtimeJs };
}
