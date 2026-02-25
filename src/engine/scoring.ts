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
 * Compute panel from baseline + component deltas.
 * Each dimension is clamped to [0, 10].
 * Used for constraint checking (P/R/CX thresholds).
 */
export function computePanel(
  deployed: Component[],
  baseline: Panel,
): Panel {
  let perf = baseline.perf;
  let rel = baseline.rel;
  let cx = baseline.cx;

  for (const c of deployed) {
    perf += c.delta.perf;
    rel += c.delta.rel;
    cx += c.delta.cx;
  }

  return {
    perf: clamp(perf, 0, 10),
    rel: clamp(rel, 0, 10),
    cx: clamp(cx, 0, 10),
  };
}

/**
 * New scoring formula:
 * chips = Σ deployed.base_chips + Σ pattern.chips_add + jokerChipBonus
 */
export function computeChips(
  deployed: Component[],
  patternChips: number,
  jokerChips: number,
): number {
  const baseChips = deployed.reduce((sum, c) => sum + c.base_chips, 0);
  return baseChips + patternChips + jokerChips;
}

/**
 * mult = (1 + Σ pattern.mult_add + jokerMultAdds) × Π jokerMultipliers
 */
export function computeMult(
  patterns: Pattern[],
  jokerMultAdds: number,
  jokerMultipliers: number[],
): number {
  let additive = 1;
  for (const p of patterns) {
    additive += p.effects.mult_add;
  }
  additive += jokerMultAdds;

  let mult = additive;
  for (const jm of jokerMultipliers) {
    mult *= jm;
  }
  return mult;
}

/**
 * Final = round(chips × mult - constraintPenalty)
 */
export function computeFinalScore(
  chips: number,
  mult: number,
  constraintPenalty: number,
): number {
  return Math.round(chips * mult - constraintPenalty);
}
