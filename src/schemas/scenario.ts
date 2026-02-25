import { z } from 'zod';

const SkipRewardSchema = z.object({
  type: z.string(),
  pick: z.number().optional(),
  from: z.union([z.number(), z.string()]).optional(),
});

const PhaseConstraintsSchema = z.object({
  min_perf: z.number().optional(),
  min_rel: z.number().optional(),
  max_cx: z.number().optional(),
  min_domains: z.number().optional(),
  required_tags: z.array(z.string()).optional(),
  constraint_penalty: z.number(),
});

const PhaseSchema = z.object({
  blind: z.enum(['small', 'big', 'boss']),
  subtitle: z.string(),
  capacity_budget: z.number(),
  target_score: z.number(),
  constraints: PhaseConstraintsSchema,
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
export type PhaseConstraints = z.infer<typeof PhaseConstraintsSchema>;
