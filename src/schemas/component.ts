import { z } from 'zod';

const RaritySchema = z.enum(['common', 'uncommon', 'rare']);

export const DomainSchema = z.enum(['compute', 'data', 'network', 'defense', 'platform']);

const DeltaSchema = z.object({
  perf: z.number(),
  rel: z.number(),
  cx: z.number(),
});

export const ComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  domain: DomainSchema,
  tags: z.array(z.string()),
  base_chips: z.number(),
  delta: DeltaSchema,
  capacity_cost: z.number().min(1),
  rarity: RaritySchema,
});

export type Component = z.infer<typeof ComponentSchema>;
export type Domain = z.infer<typeof DomainSchema>;
