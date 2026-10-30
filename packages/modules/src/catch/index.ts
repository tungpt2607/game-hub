import { defineModule } from '@opes/module-sdk';
import type { CatchConfig } from './config';
import { CatchRuntime } from './Runtime';
import { catchSchema } from './schema';

/** Game Hứng quà: kéo giỏ hứng vật phẩm rơi (xem docs/02-chuan-module.md). */
export const catchModule = defineModule<CatchConfig>({ ...catchSchema, Runtime: CatchRuntime });

export default catchModule;
