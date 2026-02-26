import { z } from 'zod';

const ModifiersSchema = z.object({
  capacity_discount_tags: z.array(z.string()),
  capacity_discount_factor: z.number(),
  draft_rounds: z.number(),
  repair_count: z.number(),
  joker_slots: z.number(),
  tarot_hand_size: z.number().optional(),
  capacity_budget_offset: z.number(),
  deploy_slots_bonus: z.number().default(0),
  hand_size_bonus: z.number().default(0),
  discard_bonus: z.number().default(0),
  baseline_overrides: z.record(z.string(), z.number()).optional().default({}),
  free_components: z.array(z.string()).optional(),
  special_rules: z.record(z.string(), z.union([z.boolean(), z.number()])).optional(),
});

export const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  modifiers: ModifiersSchema,
});

export type School = z.infer<typeof SchoolSchema>;
export type SchoolInput = z.input<typeof SchoolSchema>;
