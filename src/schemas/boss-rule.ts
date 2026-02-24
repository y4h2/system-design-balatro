import { z } from 'zod';

export const BossRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  effect: z.string(),
  modifier: z.record(z.string(), z.unknown()),
});

export type BossRule = z.infer<typeof BossRuleSchema>;
