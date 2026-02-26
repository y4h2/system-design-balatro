import { z } from 'zod';

const ConditionSchema = z.object({
  require_all_tags: z.array(z.string()),
  require_any_tags: z.array(z.string()),
  special: z.string().nullable().optional(),
});

const MultEffect = z.object({
  type: z.literal('mult'),
  value: z.number(),
});

const ChipsEffect = z.object({
  type: z.literal('chips'),
  value: z.number(),
  per_tag: z.string().optional(),
});

const PatternEnhanceEffect = z.object({
  type: z.literal('pattern_enhance'),
  extra_mult: z.number(),
});

const HandSizeEffect = z.object({
  type: z.literal('hand_size'),
  value: z.number(),
});

const DiscardEffect = z.object({
  type: z.literal('discard'),
  value: z.number(),
});

const GoldEffect = z.object({
  type: z.literal('gold'),
  value: z.number(),
  per: z.enum(['pattern', 'phase']),
});

const ComboMultEffect = z.object({
  type: z.literal('combo_mult'),
  min_patterns: z.number(),
  value: z.number(),
});

const JokerEffectSchema = z.discriminatedUnion('type', [
  MultEffect,
  ChipsEffect,
  PatternEnhanceEffect,
  HandSizeEffect,
  DiscardEffect,
  GoldEffect,
  ComboMultEffect,
]);

export const JokerSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  rarity: z.enum(['common', 'uncommon', 'rare']),
  condition: ConditionSchema,
  effect: JokerEffectSchema,
  shop_cost: z.number(),
});

export type Joker = z.infer<typeof JokerSchema>;
export type JokerEffect = z.infer<typeof JokerEffectSchema>;
