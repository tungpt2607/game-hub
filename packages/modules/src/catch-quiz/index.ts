import { defineModule } from '@opes/module-sdk';
import type { CatchQuizConfig } from './config';
import { CatchQuizRuntime } from './Runtime';
import { catchQuizSchema } from './schema';

/** Game Hứng quà + câu hỏi (dựa trên game OME Catch). */
export const catchQuizModule = defineModule<CatchQuizConfig>({ ...catchQuizSchema, Runtime: CatchQuizRuntime });

export default catchQuizModule;
