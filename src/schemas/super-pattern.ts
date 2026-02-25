import { z } from 'zod';

// Trigger discriminated union
const PatternCountTrigger = z.object({
  type: z.literal('pattern_count'),
  min_patterns: z.number(),
});

const BudgetAndPatternTrigger = z.object({
  type: z.literal('budget_and_pattern'),
  min_patterns: z.number(),
  max_budget_usage_percent: z.number(),
});

const DomainCountTrigger = z.object({
  type: z.literal('domain_count'),
  min_domains: z.number(),
  min_patterns: z.number(),
});

const TriggerSchema = z.discriminatedUnion('type', [
  PatternCountTrigger,
  BudgetAndPatternTrigger,
  DomainCountTrigger,
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

const ChipsBurstReward = z.object({
  type: z.literal('chips_burst'),
  chips_add: z.number(),
});

const GoldBurstReward = z.object({
  type: z.literal('gold_burst'),
  gold: z.number(),
});

const RewardSchema = z.discriminatedUnion('type', [
  MultBurstReward,
  CapacityRefundReward,
  ChipsBurstReward,
  GoldBurstReward,
]);

export const SuperPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  trigger: TriggerSchema,
  reward: RewardSchema,
});

export type SuperPattern = z.infer<typeof SuperPatternSchema>;
