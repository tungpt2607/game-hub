import type { ModuleSchema } from '@opes/module-sdk/core';
import { catchSchema } from './catch/schema';
import { catchQuizSchema } from './catch-quiz/schema';
import { sampleSchema } from './sample/schema';

/**
 * Mô tả các module, không gồm phần chạy React: dùng ở API để kiểm tra cấu hình template.
 * Thứ tự và danh sách phải khớp với MODULES trong index.ts (có test kiểm tra).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MODULE_SCHEMAS: ModuleSchema<any>[] = [catchSchema, catchQuizSchema, sampleSchema];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModuleSchema(key: string): ModuleSchema<any> | undefined {
  return MODULE_SCHEMAS.find((m) => m.key === key);
}
