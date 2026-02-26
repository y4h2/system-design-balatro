import { z } from 'zod';

export const PlatformIdSchema = z.enum(['aws', 'gcp', 'azure', 'selfhosted']);

export const PlatformPassiveSchema = z.object({
  type: z.enum(['capacity_discount', 'chips_bonus']),
  /** For capacity_discount: factor applied to matching components (e.g. 0.9 = -10%) */
  factor: z.number().optional(),
  /** For chips_bonus: extra chips added */
  bonus: z.number().optional(),
  /** Tags that trigger this passive */
  match_tags: z.array(z.string()).optional(),
  /** Description for UI display */
  desc: z.string(),
});

export const PlatformMechanicSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
});

export const PlatformSchema = z.object({
  id: PlatformIdSchema,
  name: z.string(),
  desc: z.string(),
  positioning: z.string(),
  icon: z.string(),
  accent: z.string(),
  glow: z.string(),
  passive: PlatformPassiveSchema,
  mechanic: PlatformMechanicSchema,
  exclusive_pattern_id: z.string(),
});

export type Platform = z.infer<typeof PlatformSchema>;
export type PlatformId = z.infer<typeof PlatformIdSchema>;
