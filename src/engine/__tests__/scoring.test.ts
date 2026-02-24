import { describe, it, expect } from 'vitest';
import { computePanel, computeChips, computeMult, computeFinalScore, type Panel } from '../scoring.js';
import type { Component, Pattern } from '../../schemas/index.js';

// Helper to build a minimal Component with only the fields scoring cares about
function makeComponent(delta: { perf: number; rel: number; cx: number }): Component {
  return {
    id: 'test',
    name: 'test',
    desc: 'test',
    tags: [],
    delta,
    capacity_cost: 1,
    exposes: [],
    seals: [],
    requires_tags: [],
    conflicts_tags: [],
    rarity: 'common',
    category: 'functional',
  };
}

// Helper to build a minimal Pattern
function makePattern(mult_add: number, delta: { perf: number; rel: number; cx: number } = { perf: 0, rel: 0, cx: 0 }): Pattern {
  return {
    id: 'test_pattern',
    name: 'test',
    desc: 'test',
    requires_all_tags: [],
    requires_any_tags: [],
    effects: {
      mult_add,
      delta,
    },
  };
}

describe('computePanel', () => {
  it('sums baseline + component deltas correctly', () => {
    const baseline: Panel = { perf: 2, rel: 2, cx: 2 };
    const cdn = makeComponent({ perf: 2, rel: 0, cx: 0 });
    const cache = makeComponent({ perf: 3, rel: 0, cx: 1 });

    const result = computePanel([cdn, cache], baseline);
    expect(result).toEqual({ perf: 7, rel: 2, cx: 3 });
  });

  it('clamps values to [0, 10] when they exceed bounds', () => {
    const baseline: Panel = { perf: 8, rel: 1, cx: 9 };
    const bigComponent = makeComponent({ perf: 5, rel: -3, cx: 3 });

    const result = computePanel([bigComponent], baseline);
    expect(result.perf).toBe(10);
    expect(result.rel).toBe(0);
    expect(result.cx).toBe(10);
  });

  it('applies event penalties to reduce panel values', () => {
    const baseline: Panel = { perf: 5, rel: 5, cx: 5 };
    const penalties: Panel[] = [{ perf: -2, rel: -1, cx: 0 }];

    const result = computePanel([], baseline, [], penalties);
    expect(result).toEqual({ perf: 3, rel: 4, cx: 5 });
  });

  it('applies pattern deltas', () => {
    const baseline: Panel = { perf: 3, rel: 3, cx: 3 };
    const patternDeltas: Panel[] = [{ perf: 1, rel: 2, cx: -1 }];

    const result = computePanel([], baseline, patternDeltas);
    expect(result).toEqual({ perf: 4, rel: 5, cx: 2 });
  });
});

describe('computeChips', () => {
  it('computes chips = wP*Perf + wR*Rel - wX*Cx', () => {
    const panel: Panel = { perf: 7, rel: 2, cx: 3 };
    const weights = { perf: 1.0, rel: 1.0, cx: 0.5 };

    const result = computeChips(panel, weights);
    // 7*1.0 + 2*1.0 - 3*0.5 = 7 + 2 - 1.5 = 7.5
    expect(result).toBe(7.5);
  });

  it('adds Cx when cxPositive is true', () => {
    const panel: Panel = { perf: 7, rel: 2, cx: 3 };
    const weights = { perf: 1.0, rel: 1.0, cx: 0.5 };

    const result = computeChips(panel, weights, true);
    // 7*1.0 + 2*1.0 + 3*0.5 = 7 + 2 + 1.5 = 10.5
    expect(result).toBe(10.5);
  });
});

describe('computeMult', () => {
  it('computes (1 + pattern_mult_add) * joker_multiplier', () => {
    const patterns = [makePattern(2)];
    const result = computeMult(patterns, [], [1.2]);
    // (1 + 2) * 1.2 = 3.6
    expect(result).toBeCloseTo(3.6);
  });

  it('combines multiple patterns + super patterns + multiple jokers', () => {
    const patterns = [makePattern(1), makePattern(0.5)];
    const superPatterns = [{ mult_add: 0.5 }];
    const jokers = [1.5, 2.0];

    const result = computeMult(patterns, superPatterns, jokers);
    // additive = 1 + 1 + 0.5 + 0.5 = 3
    // mult = 3 * 1.5 * 2.0 = 9
    expect(result).toBeCloseTo(9);
  });

  it('returns 1 with no patterns, super patterns, or jokers', () => {
    const result = computeMult([], [], []);
    expect(result).toBe(1);
  });
});

describe('computeFinalScore', () => {
  it('computes round(chips * mult - penalty)', () => {
    // chips=7.5, mult=3.6 => 27, penalty=0 => 27
    const result = computeFinalScore(7.5, 3.6, 0);
    expect(result).toBe(27);
  });

  it('subtracts constraint penalty', () => {
    // chips=7.5, mult=3.6 => 27, penalty=10 => 17
    const result = computeFinalScore(7.5, 3.6, 10);
    expect(result).toBe(17);
  });

  it('rounds the result to nearest integer', () => {
    // 3.3 * 2.0 = 6.6, - 0 = 6.6 => rounds to 7
    const result = computeFinalScore(3.3, 2.0, 0);
    expect(result).toBe(7);
  });
});
