import { z } from 'zod';

const EffectsSchema = z.object({
  mult_add: z.number(),
  delta: z.object({
    perf: z.number(),
    rel: z.number(),
    cx: z.number(),
  }),
  global_event_penalty_factor: z.number().optional(),
});

export const PatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  requires_all_tags: z.array(z.string()),
  requires_any_tags: z.array(z.string()),
  effects: EffectsSchema,
});

export type Pattern = z.infer<typeof PatternSchema>;
