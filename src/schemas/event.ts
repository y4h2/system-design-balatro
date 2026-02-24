import { z } from 'zod';

const PenaltySchema = z.object({
  perf: z.number(),
  rel: z.number(),
  cx: z.number(),
});

export const EventSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  severity: z.number().min(1).max(5),
  targets_risks: z.array(z.string()),
  penalty: PenaltySchema,
  flavor_text: z.string(),
});

export type Event = z.infer<typeof EventSchema>;
