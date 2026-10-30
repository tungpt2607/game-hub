import type { ModuleDefinition } from '@opes/module-sdk';
import { catchModule } from './catch';
import { catchQuizModule } from './catch-quiz';
import { sampleModule } from './sample';

/** Danh sách module có sẵn. Thêm module mới: tạo thư mục trong src/ rồi đăng ký ở đây. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MODULES: ModuleDefinition<any>[] = [catchModule, catchQuizModule, sampleModule];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModule(key: string): ModuleDefinition<any> | undefined {
  return MODULES.find((m) => m.key === key);
}

export { catchModule, catchQuizModule, sampleModule };
export type { CatchQuizConfig } from './catch-quiz/config';
export type { CatchConfig } from './catch/config';
export type { SampleConfig } from './sample/config';
