import { z } from 'zod';

const ConditionSchema = z.object({
  require_all_tags: z.array(z.string()),
  require_any_tags: z.array(z.string()),
  special: z.string().optional(),
});

const ReduceEventPenaltySchema = z.object({
  event_id: z.string(),
  factor: z.number(),
});

export const JokerSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  rarity: z.enum(['common', 'uncommon', 'rare']),
  multiplier: z.number().min(1),
  condition: ConditionSchema,
  reduce_event_penalty: z.array(ReduceEventPenaltySchema),
  shop_cost: z.number(),
});

export type Joker = z.infer<typeof JokerSchema>;
