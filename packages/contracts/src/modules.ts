import { z } from 'zod';

export const GameModuleSummarySchema = z.object({
  key: z.string(),
  kind: z.string(),
  name: z.string(),
  description: z.string(),
  latestVersion: z.string().nullable(),
  builtin: z.boolean(),
  versions: z.array(z.object({ version: z.string(), publishedAt: z.string(), notes: z.string().nullable() })),
  presets: z.array(z.object({ id: z.string(), name: z.string(), description: z.string().optional() })),
  updatedAt: z.string(),
});
export type GameModuleSummary = z.infer<typeof GameModuleSummarySchema>;

export const GameModuleListResponseSchema = z.object({ items: z.array(GameModuleSummarySchema) });
export type GameModuleListResponse = z.infer<typeof GameModuleListResponseSchema>;
