import { defineModule } from '@opes/module-sdk';
import type { SampleConfig } from './config';
import { SampleRuntime } from './Runtime';
import { sampleSchema } from './schema';

export const sampleModule = defineModule<SampleConfig>({ ...sampleSchema, Runtime: SampleRuntime });
