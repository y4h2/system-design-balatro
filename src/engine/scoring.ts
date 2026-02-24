import type { Component, Pattern } from '../schemas/index.js';

export interface Panel {
  perf: number;
  rel: number;
  cx: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Compute panel from baseline + component deltas + pattern deltas + event penalties.
 * Each dimension is clamped to [0, 10].
 */
export function computePanel(
  deployed: Component[],
  baseline: Panel,
  patternDeltas: Panel[] = [],
  eventPenalties: Panel[] = [],
): Panel {
  let perf = baseline.perf;
  let rel = baseline.rel;
  let cx = baseline.cx;

  for (const c of deployed) {
    perf += c.delta.perf;
    rel += c.delta.rel;
    cx += c.delta.cx;
  }

  for (const d of patternDeltas) {
    perf += d.perf;
    rel += d.rel;
    cx += d.cx;
  }

  for (const p of eventPenalties) {
    perf += p.perf;
    rel += p.rel;
    cx += p.cx;
  }

  return {
    perf: clamp(perf, 0, 10),
    rel: clamp(rel, 0, 10),
    cx: clamp(cx, 0, 10),
  };
}

/**
 * Chips = wP * Perf + wR * Rel - wX * Cx
 * When cxPositive is true, Cx adds instead of subtracts.
 */
export function computeChips(
  panel: Panel,
  weights: { perf: number; rel: number; cx: number },
  cxPositive: boolean = false,
): number {
  const cxContribution = cxPositive ? weights.cx * panel.cx : -weights.cx * panel.cx;
  return weights.perf * panel.perf + weights.rel * panel.rel + cxContribution;
}

/**
 * Mult = (1 + sum(pattern_mult_add) + sum(super_pattern_mult_add)) * product(joker_multipliers)
 */
export function computeMult(
  patterns: Pattern[],
  superPatternMultAdds: { mult_add?: number }[],
  jokerMultipliers: number[],
): number {
  let additive = 1;
  for (const p of patterns) {
    additive += p.effects.mult_add;
  }
  for (const sp of superPatternMultAdds) {
    if (sp.mult_add) additive += sp.mult_add;
  }
  let mult = additive;
  for (const jm of jokerMultipliers) {
    mult *= jm;
  }
  return mult;
}

/**
 * Final = round(Chips * Mult - ConstraintPenalty)
 */
export function computeFinalScore(
  chips: number,
  mult: number,
  constraintPenalty: number,
): number {
  return Math.round(chips * mult - constraintPenalty);
}
