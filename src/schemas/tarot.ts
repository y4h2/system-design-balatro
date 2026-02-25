import { z } from 'zod';

const AddTagEffect = z.object({
  type: z.literal('add_tag'),
  target_tag: z.string(),
  add_tag: z.string(),
});

const AddChipsEffect = z.object({
  type: z.literal('add_chips'),
  target_tag: z.string(),
  chips: z.number(),
});

const ChangeDomainEffect = z.object({
  type: z.literal('change_domain'),
  from_domain: z.string(),
  to_domain: z.string(),
});

const ReduceCostEffect = z.object({
  type: z.literal('reduce_cost'),
  target_tag: z.string(),
  amount: z.number(),
});

const TarotEffectSchema = z.discriminatedUnion('type', [
  AddTagEffect,
  AddChipsEffect,
  ChangeDomainEffect,
  ReduceCostEffect,
]);

export const TarotSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  effect: TarotEffectSchema,
  shop_cost: z.number(),
  rarity: z.enum(['common', 'uncommon', 'rare']),
});

export type Tarot = z.infer<typeof TarotSchema>;
export type TarotEffect = z.infer<typeof TarotEffectSchema>;
