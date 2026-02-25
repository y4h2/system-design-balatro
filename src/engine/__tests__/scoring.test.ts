import { describe, it, expect } from 'vitest';
import { computePanel, computeChips, computeMult, computeFinalScore, type Panel } from '../scoring.js';
import type { Component, Pattern } from '../../schemas/index.js';

// Helper to build a minimal Component with only the fields scoring cares about
function makeComponent(
  overrides: Partial<Component> & { delta: { perf: number; rel: number; cx: number } },
): Component {
  return {
    id: 'test',
    name: 'test',
    desc: 'test',
    domain: 'compute',
    tags: [],
    base_chips: 3,
    delta: overrides.delta,
    capacity_cost: 1,
    rarity: 'common',
    ...overrides,
  };
}

// Helper to build a minimal Pattern
function makePattern(mult_add: number, chips_add: number = 0): Pattern {
  return {
    id: 'test_pattern',
    name: 'test',
    desc: 'test',
    requires_all_tags: [],
    requires_any_tags: [],
    effects: {
      mult_add,
      chips_add,
    },
  };
}

// ── computePanel ─────────────────────────────────────────────────────────

describe('computePanel', () => {
  it('sums baseline + component deltas correctly', () => {
    const baseline: Panel = { perf: 2, rel: 2, cx: 2 };
    const cdn = makeComponent({ delta: { perf: 2, rel: 0, cx: 0 } });
    const cache = makeComponent({ delta: { perf: 3, rel: 0, cx: 1 } });

    const result = computePanel([cdn, cache], baseline);
    expect(result).toEqual({ perf: 7, rel: 2, cx: 3 });
  });

  it('returns baseline unchanged when no components are deployed', () => {
    const baseline: Panel = { perf: 5, rel: 5, cx: 5 };
    const result = computePanel([], baseline);
    expect(result).toEqual({ perf: 5, rel: 5, cx: 5 });
  });

  it('clamps values to [0, 10] when they exceed upper bounds', () => {
    const baseline: Panel = { perf: 8, rel: 9, cx: 9 };
    const bigComponent = makeComponent({ delta: { perf: 5, rel: 3, cx: 3 } });

    const result = computePanel([bigComponent], baseline);
    expect(result.perf).toBe(10);
    expect(result.rel).toBe(10);
    expect(result.cx).toBe(10);
  });

  it('clamps values to [0, 10] when they go below zero', () => {
    const baseline: Panel = { perf: 1, rel: 1, cx: 1 };
    const negComponent = makeComponent({ delta: { perf: -3, rel: -5, cx: -2 } });

    const result = computePanel([negComponent], baseline);
    expect(result.perf).toBe(0);
    expect(result.rel).toBe(0);
    expect(result.cx).toBe(0);
  });

  it('accumulates deltas from multiple components', () => {
    const baseline: Panel = { perf: 0, rel: 0, cx: 0 };
    const a = makeComponent({ delta: { perf: 1, rel: 2, cx: 0 } });
    const b = makeComponent({ delta: { perf: 2, rel: 1, cx: 3 } });
    const c = makeComponent({ delta: { perf: 0, rel: 0, cx: 1 } });

    const result = computePanel([a, b, c], baseline);
    expect(result).toEqual({ perf: 3, rel: 3, cx: 4 });
  });
});

// ── computeChips ─────────────────────────────────────────────────────────

describe('computeChips', () => {
  it('sums base_chips from deployed components', () => {
    const a = makeComponent({ base_chips: 3, delta: { perf: 0, rel: 0, cx: 0 } });
    const b = makeComponent({ base_chips: 5, delta: { perf: 0, rel: 0, cx: 0 } });

    const result = computeChips([a, b], 0, 0);
    expect(result).toBe(8);
  });

  it('adds patternChips to the total', () => {
    const a = makeComponent({ base_chips: 3, delta: { perf: 0, rel: 0, cx: 0 } });

    const result = computeChips([a], 10, 0);
    expect(result).toBe(13);
  });

  it('adds jokerChips to the total', () => {
    const a = makeComponent({ base_chips: 4, delta: { perf: 0, rel: 0, cx: 0 } });

    const result = computeChips([a], 0, 7);
    expect(result).toBe(11);
  });

  it('sums all three sources: base_chips + patternChips + jokerChips', () => {
    const a = makeComponent({ base_chips: 3, delta: { perf: 0, rel: 0, cx: 0 } });
    const b = makeComponent({ base_chips: 5, delta: { perf: 0, rel: 0, cx: 0 } });

    const result = computeChips([a, b], 10, 7);
    // 3 + 5 + 10 + 7 = 25
    expect(result).toBe(25);
  });

  it('returns 0 when no components, no pattern chips, no joker chips', () => {
    const result = computeChips([], 0, 0);
    expect(result).toBe(0);
  });
});

// ── computeMult ──────────────────────────────────────────────────────────

describe('computeMult', () => {
  it('returns base mult of 1 with no patterns or jokers', () => {
    const result = computeMult([], 0, []);
    expect(result).toBe(1);
  });

  it('adds pattern mult_add to the base 1', () => {
    const patterns = [makePattern(2)];
    const result = computeMult(patterns, 0, []);
    // 1 + 2 = 3
    expect(result).toBe(3);
  });

  it('adds jokerMultAdds to the additive portion', () => {
    const result = computeMult([], 3, []);
    // 1 + 3 = 4
    expect(result).toBe(4);
  });

  it('multiplies by jokerMultipliers', () => {
    const patterns = [makePattern(2)];
    const result = computeMult(patterns, 0, [1.5]);
    // (1 + 2) * 1.5 = 4.5
    expect(result).toBeCloseTo(4.5);
  });

  it('combines multiple patterns + jokerMultAdds + multiple jokerMultipliers', () => {
    const patterns = [makePattern(1), makePattern(0.5)];
    const jokerMultAdds = 0.5;
    const jokerMultipliers = [1.5, 2.0];

    const result = computeMult(patterns, jokerMultAdds, jokerMultipliers);
    // additive = 1 + 1 + 0.5 + 0.5 = 3
    // mult = 3 * 1.5 * 2.0 = 9
    expect(result).toBeCloseTo(9);
  });

  it('applies jokerMultipliers sequentially (product)', () => {
    const result = computeMult([], 0, [2, 3, 4]);
    // (1) * 2 * 3 * 4 = 24
    expect(result).toBe(24);
  });
});

// ── computeFinalScore ────────────────────────────────────────────────────

describe('computeFinalScore', () => {
  it('computes round(chips * mult) with zero penalty', () => {
    const result = computeFinalScore(10, 3, 0);
    expect(result).toBe(30);
  });

  it('subtracts constraint penalty', () => {
    const result = computeFinalScore(10, 3, 5);
    // 10 * 3 - 5 = 25
    expect(result).toBe(25);
  });

  it('rounds the result to nearest integer', () => {
    // 3.3 * 2.0 = 6.6, - 0 = 6.6 => rounds to 7
    const result = computeFinalScore(3.3, 2.0, 0);
    expect(result).toBe(7);
  });

  it('rounds down when fraction < 0.5', () => {
    // 7 * 1.2 = 8.4 => rounds to 8
    const result = computeFinalScore(7, 1.2, 0);
    expect(result).toBe(8);
  });

  it('can produce a negative score when penalty exceeds chips*mult', () => {
    // 5 * 2 = 10, - 20 = -10
    const result = computeFinalScore(5, 2, 20);
    expect(result).toBe(-10);
  });

  it('handles a realistic full pipeline: chips + mult + penalty', () => {
    // chips = base 8 + pattern 10 + joker 7 = 25 (via computeChips)
    // mult = (1+2+0.5) * 1.5 = 5.25 (via computeMult)
    // final = round(25 * 5.25 - 10) = round(131.25 - 10) = round(121.25) = 121
    const result = computeFinalScore(25, 5.25, 10);
    expect(result).toBe(121);
  });
});
