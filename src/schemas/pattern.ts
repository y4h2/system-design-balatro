import { z } from 'zod';

const DomainRequirementSchema = z.object({
  domain: z.string(),
  count: z.number(),
});

const EffectsSchema = z.object({
  mult_add: z.number(),
  chips_add: z.number(),
});

export const PatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  requires_all_tags: z.array(z.string()),
  requires_any_tags: z.array(z.string()),
  requires_domain: DomainRequirementSchema.nullable().optional(),
  platform: z.string().optional(),
  effects: EffectsSchema,
});

export type Pattern = z.infer<typeof PatternSchema>;
