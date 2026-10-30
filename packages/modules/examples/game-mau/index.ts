import { defineModule } from '@opes/module-sdk';
import type { SampleConfig } from './config';
import { SampleRuntime } from './Runtime';
import { schema } from './schema';

/** Điểm vào của game: mô tả (schema) + phần chạy (Runtime). Phải export default. */
export default defineModule<SampleConfig>({ ...schema, Runtime: SampleRuntime });
