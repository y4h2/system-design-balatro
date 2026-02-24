import { z } from 'zod';

// Trigger discriminated union
const PatternCountTrigger = z.object({
  type: z.literal('pattern_count'),
  min_patterns: z.number(),
});

const RiskAndPatternTrigger = z.object({
  type: z.literal('risk_and_pattern'),
  min_patterns: z.number(),
  min_exposed_risks: z.number().optional(),
  max_exposed_risks: z.number().optional(),
});

const BudgetAndPatternTrigger = z.object({
  type: z.literal('budget_and_pattern'),
  min_patterns: z.number(),
  max_budget_usage_percent: z.number(),
});

const TriggerSchema = z.discriminatedUnion('type', [
  PatternCountTrigger,
  RiskAndPatternTrigger,
  BudgetAndPatternTrigger,
]);

// Reward discriminated union
const MultBurstReward = z.object({
  type: z.literal('mult_burst'),
  mult_add: z.number(),
});

const CapacityRefundReward = z.object({
  type: z.literal('capacity_refund'),
  refund_amount: z.number(),
});

const EventImmunityReward = z.object({
  type: z.literal('event_immunity'),
});

const DimensionFlipReward = z.object({
  type: z.literal('dimension_flip'),
  flip_dimension: z.string(),
  from: z.string(),
  to: z.string(),
});

const RewardSchema = z.discriminatedUnion('type', [
  MultBurstReward,
  CapacityRefundReward,
  EventImmunityReward,
  DimensionFlipReward,
]);

export const SuperPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  trigger: TriggerSchema,
  reward: RewardSchema,
});

export type SuperPattern = z.infer<typeof SuperPatternSchema>;
