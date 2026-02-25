import { describe, it, expect } from 'vitest';
import { validateConstraints, type ConstraintResult } from '../constraints.js';
import type { Panel } from '../scoring.js';
import type { Component, PhaseConstraints } from '../../schemas/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'test',
    name: 'test',
    desc: 'test',
    domain: 'compute',
    tags: [],
    base_chips: 3,
    delta: { perf: 0, rel: 0, cx: 0 },
    capacity_cost: 1,
    rarity: 'common',
    ...overrides,
  };
}

function makeConstraints(overrides: Partial<PhaseConstraints> = {}): PhaseConstraints {
  return {
    constraint_penalty: 10,
    ...overrides,
  };
}

// ── min_perf ─────────────────────────────────────────────────────────────

describe('validateConstraints – min_perf', () => {
  it('passes when perf meets the minimum', () => {
    const panel: Panel = { perf: 5, rel: 5, cx: 5 };
    const result = validateConstraints(panel, [], makeConstraints({ min_perf: 5 }));
    expect(result.passed).toBe(true);
    expect(result.penalty).toBe(0);
  });

  it('fails when perf is below the minimum', () => {
    const panel: Panel = { perf: 3, rel: 5, cx: 5 };
    const result = validateConstraints(panel, [], makeConstraints({ min_perf: 5 }));
    expect(result.passed).toBe(false);
    expect(result.penalty).toBe(10);
    expect(result.failures.length).toBe(1);
    expect(result.failures[0]).toContain('P');
  });
});

// ── min_rel ──────────────────────────────────────────────────────────────

describe('validateConstraints – min_rel', () => {
  it('passes when rel meets the minimum', () => {
    const panel: Panel = { perf: 5, rel: 6, cx: 5 };
    const result = validateConstraints(panel, [], makeConstraints({ min_rel: 6 }));
    expect(result.passed).toBe(true);
    expect(result.penalty).toBe(0);
  });

  it('fails when rel is below the minimum', () => {
    const panel: Panel = { perf: 5, rel: 3, cx: 5 };
    const result = validateConstraints(panel, [], makeConstraints({ min_rel: 5 }));
    expect(result.passed).toBe(false);
    expect(result.penalty).toBe(10);
    expect(result.failures[0]).toContain('R');
  });
});

// ── max_cx ───────────────────────────────────────────────────────────────

describe('validateConstraints – max_cx', () => {
  it('passes when cx is at or below the maximum', () => {
    const panel: Panel = { perf: 5, rel: 5, cx: 4 };
    const result = validateConstraints(panel, [], makeConstraints({ max_cx: 4 }));
    expect(result.passed).toBe(true);
    expect(result.penalty).toBe(0);
  });

  it('fails when cx exceeds the maximum', () => {
    const panel: Panel = { perf: 5, rel: 5, cx: 7 };
    const result = validateConstraints(panel, [], makeConstraints({ max_cx: 5 }));
    expect(result.passed).toBe(false);
    expect(result.penalty).toBe(10);
    expect(result.failures[0]).toContain('CX');
  });
});

// ── min_domains ──────────────────────────────────────────────────────────

describe('validateConstraints – min_domains', () => {
  it('passes when enough distinct domains are deployed', () => {
    const panel: Panel = { perf: 5, rel: 5, cx: 5 };
    const deployed = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'network' }),
    ];
    const result = validateConstraints(panel, deployed, makeConstraints({ min_domains: 3 }));
    expect(result.passed).toBe(true);
    expect(result.penalty).toBe(0);
  });

  it('fails when fewer distinct domains than required', () => {
    const panel: Panel = { perf: 5, rel: 5, cx: 5 };
    const deployed = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'compute' }),
    ];
    const result = validateConstraints(panel, deployed, makeConstraints({ min_domains: 2 }));
    expect(result.passed).toBe(false);
    expect(result.penalty).toBe(10);
    expect(result.failures[0]).toContain('domains');
  });
});

// ── required_tags ────────────────────────────────────────────────────────

describe('validateConstraints – required_tags', () => {
  it('passes when all required tags are present in deployed components', () => {
    const panel: Panel = { perf: 5, rel: 5, cx: 5 };
    const deployed = [
      makeComponent({ tags: ['cache', 'ha'] }),
      makeComponent({ tags: ['db'] }),
    ];
    const result = validateConstraints(
      panel,
      deployed,
      makeConstraints({ required_tags: ['cache', 'db'] }),
    );
    expect(result.passed).toBe(true);
    expect(result.penalty).toBe(0);
  });

  it('fails for each missing required tag', () => {
    const panel: Panel = { perf: 5, rel: 5, cx: 5 };
    const deployed = [makeComponent({ tags: ['cache'] })];
    const result = validateConstraints(
      panel,
      deployed,
      makeConstraints({ required_tags: ['cache', 'db', 'ha'] }),
    );
    expect(result.passed).toBe(false);
    // Two missing tags (db, ha) => 2 failures => penalty = 2 * 10 = 20
    expect(result.failures.length).toBe(2);
    expect(result.penalty).toBe(20);
    expect(result.failures.some(f => f.includes('db'))).toBe(true);
    expect(result.failures.some(f => f.includes('ha'))).toBe(true);
  });

  it('passes when required_tags is an empty array', () => {
    const panel: Panel = { perf: 5, rel: 5, cx: 5 };
    const result = validateConstraints(
      panel,
      [],
      makeConstraints({ required_tags: [] }),
    );
    expect(result.passed).toBe(true);
    expect(result.penalty).toBe(0);
  });
});

// ── Multiple constraints ─────────────────────────────────────────────────

describe('validateConstraints – multiple constraints combined', () => {
  it('accumulates penalties from multiple failing constraints', () => {
    const panel: Panel = { perf: 2, rel: 2, cx: 8 };
    const deployed = [makeComponent({ domain: 'compute', tags: [] })];
    const constraints = makeConstraints({
      min_perf: 5,    // fails: perf 2 < 5
      min_rel: 5,     // fails: rel 2 < 5
      max_cx: 5,      // fails: cx 8 > 5
      min_domains: 2, // fails: only 1 domain
      constraint_penalty: 10,
    });

    const result = validateConstraints(panel, deployed, constraints);
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBe(4);
    // 4 failures * 10 = 40
    expect(result.penalty).toBe(40);
  });

  it('passes and returns zero penalty when all constraints are met', () => {
    const panel: Panel = { perf: 6, rel: 6, cx: 3 };
    const deployed = [
      makeComponent({ domain: 'compute', tags: ['cache'] }),
      makeComponent({ domain: 'data', tags: ['db'] }),
      makeComponent({ domain: 'network', tags: ['ha'] }),
    ];
    const constraints = makeConstraints({
      min_perf: 5,
      min_rel: 5,
      max_cx: 5,
      min_domains: 3,
      required_tags: ['cache', 'db'],
      constraint_penalty: 10,
    });

    const result = validateConstraints(panel, deployed, constraints);
    expect(result.passed).toBe(true);
    expect(result.penalty).toBe(0);
    expect(result.failures).toEqual([]);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────

describe('validateConstraints – edge cases', () => {
  it('returns passed=true when no constraint thresholds are set', () => {
    const panel: Panel = { perf: 1, rel: 1, cx: 9 };
    const result = validateConstraints(panel, [], makeConstraints({}));
    expect(result.passed).toBe(true);
    expect(result.penalty).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it('works with empty deployed array', () => {
    const panel: Panel = { perf: 0, rel: 0, cx: 0 };
    const result = validateConstraints(
      panel,
      [],
      makeConstraints({ min_perf: 3, constraint_penalty: 5 }),
    );
    expect(result.passed).toBe(false);
    expect(result.penalty).toBe(5);
  });

  it('uses constraint_penalty as the per-failure multiplier', () => {
    const panel: Panel = { perf: 1, rel: 1, cx: 9 };
    const constraints = makeConstraints({
      min_perf: 5,
      min_rel: 5,
      max_cx: 3,
      constraint_penalty: 25,
    });

    const result = validateConstraints(panel, [], constraints);
    // 3 failures * 25 = 75
    expect(result.penalty).toBe(75);
  });
});
