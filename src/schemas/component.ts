import { z } from 'zod';

const RaritySchema = z.enum(['common', 'uncommon', 'rare']);

const DeltaSchema = z.object({
  perf: z.number(),
  rel: z.number(),
  cx: z.number(),
});

export const ComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  tags: z.array(z.string()),
  delta: DeltaSchema,
  capacity_cost: z.number().min(1),
  exposes: z.array(z.string()),
  seals: z.array(z.string()),
  requires_tags: z.array(z.string()),
  conflicts_tags: z.array(z.string()),
  rarity: RaritySchema,
  category: z.enum(['functional', 'defensive']),
});

export type Component = z.infer<typeof ComponentSchema>;
