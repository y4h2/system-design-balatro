import { z } from 'zod';

const SkipRewardSchema = z.object({
  type: z.string(),
  pick: z.number().optional(),
  from: z.union([z.number(), z.string()]).optional(),
});

const ConstraintsSchema = z.object({
  sla: z.number(),
  budget_cost_max: z.number().optional(),
  compliance_level: z.enum(['low', 'medium', 'high']),
  delivery_weeks_max: z.number().optional(),
});

const WeightsSchema = z.object({
  perf: z.number(),
  rel: z.number(),
  cx: z.number(),
});

const PhaseSchema = z.object({
  blind: z.enum(['small', 'big', 'boss']),
  subtitle: z.string(),
  capacity_budget: z.number(),
  target_score: z.number(),
  weights: WeightsSchema,
  constraints: ConstraintsSchema,
  event_pool_severity: z.array(z.number()),
  skippable: z.boolean().optional().default(false),
  skip_reward: SkipRewardSchema.optional(),
  boss_rule: z.string().optional(),
});

const InitialSchema = z.object({
  target_qps: z.number(),
  peak_factor: z.number(),
  data_gb: z.number(),
});

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  tags: z.array(z.string()),
  initial: InitialSchema,
  phases: z.array(PhaseSchema).length(3),
});

export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioInput = z.input<typeof ScenarioSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type PhaseInput = z.input<typeof PhaseSchema>;
