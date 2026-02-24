import { z } from 'zod';

export const TarotSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  type: z.enum(['info_reveal', 'state_modify']),
  effect: z.union([z.string(), z.record(z.string(), z.unknown())]),
  shop_cost: z.number(),
  rarity: z.enum(['common', 'uncommon', 'rare']),
});

export type Tarot = z.infer<typeof TarotSchema>;
