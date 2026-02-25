import { describe, it, expect } from 'vitest';
import {
  parseBossRuleEffects,
  applyBossCapacityCost,
  applyBossBudgetFactor,
  validateNoDuplicateTags,
} from '../boss-rules.js';
import { loadGameData } from '../../data/loader.js';
import type { Component } from '../../schemas/index.js';

/** Helper to build a minimal Component for testing */
function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'cmp_test',
    name: 'Test Component',
    desc: 'A test component',
    domain: 'compute',
    tags: [],
    base_chips: 3,
    delta: { perf: 0, rel: 0, cx: 0 },
    capacity_cost: 2,
    rarity: 'common',
    ...overrides,
  };
}

describe('boss-rules', () => {
  const data = loadGameData();
  const findBossRule = (id: string) => data.bossRules.find(r => r.id === id)!;

  // ── parseBossRuleEffects ────────────────────────────────────────────

  describe('parseBossRuleEffects', () => {
    it('parses boss_cache_disabled into capacityMultiplierForTags', () => {
      const rule = findBossRule('boss_cache_disabled');
      const effects = parseBossRuleEffects(rule);

      expect(effects.capacityMultiplierForTags).toEqual({
        tags: ['cache'],
        factor: 2.0,
      });
      expect(effects.capacityBudgetFactor).toBeUndefined();
      expect(effects.noDuplicateTags).toBeUndefined();
      expect(effects.extraConstraintPenalty).toBeUndefined();
    });

    it('parses boss_budget_halved into capacityBudgetFactor', () => {
      const rule = findBossRule('boss_budget_halved');
      const effects = parseBossRuleEffects(rule);

      expect(effects.capacityBudgetFactor).toBe(0.5);
      expect(effects.capacityMultiplierForTags).toBeUndefined();
    });

    it('parses boss_single_point into noDuplicateTags', () => {
      const rule = findBossRule('boss_single_point');
      const effects = parseBossRuleEffects(rule);

      expect(effects.noDuplicateTags).toBe(true);
    });

    it('returns empty effects for unrecognized modifiers', () => {
      const effects = parseBossRuleEffects({
        id: 'boss_custom',
        name: 'Custom Boss',
        desc: 'Something novel',
        effect: 'unique effect',
        modifier: { custom_field: 'xyz' },
      });

      expect(effects.capacityMultiplierForTags).toBeUndefined();
      expect(effects.capacityBudgetFactor).toBeUndefined();
      expect(effects.noDuplicateTags).toBeUndefined();
      expect(effects.extraConstraintPenalty).toBeUndefined();
    });
  });

  // ── applyBossCapacityCost ───────────────────────────────────────────

  describe('applyBossCapacityCost', () => {
    const cacheEffects = parseBossRuleEffects(findBossRule('boss_cache_disabled'));

    it('doubles cost for component with cache tag', () => {
      const c = makeComponent({ tags: ['cache', 'infra'], domain: 'data' });
      expect(applyBossCapacityCost(3, c, cacheEffects)).toBe(6);
    });

    it('does not change cost for component without cache tag', () => {
      const c = makeComponent({ tags: ['db', 'ha'], domain: 'data' });
      expect(applyBossCapacityCost(3, c, cacheEffects)).toBe(3);
    });

    it('returns base cost when no capacity multiplier effects are active', () => {
      const c = makeComponent({ tags: ['cache'], domain: 'data' });
      expect(applyBossCapacityCost(3, c, {})).toBe(3);
    });

    it('rounds up fractional results with Math.ceil', () => {
      const c = makeComponent({ tags: ['cache'], domain: 'data' });
      // 5 * 2 = 10, integer result
      expect(applyBossCapacityCost(5, c, cacheEffects)).toBe(10);
    });

    it('applies to real Redis component', () => {
      const redis = data.components.find(c => c.id === 'cmp_redis')!;
      // Redis has cache tag, base cost 10 -> 10 * 2 = 20
      expect(applyBossCapacityCost(redis.capacity_cost, redis, cacheEffects)).toBe(20);
    });

    it('does not affect non-cache real components', () => {
      const ec2 = data.components.find(c => c.id === 'cmp_ec2')!;
      // EC2 has no cache tag, cost stays 8
      expect(applyBossCapacityCost(ec2.capacity_cost, ec2, cacheEffects)).toBe(8);
    });
  });

  // ── applyBossBudgetFactor ───────────────────────────────────────────

  describe('applyBossBudgetFactor', () => {
    const budgetEffects = parseBossRuleEffects(findBossRule('boss_budget_halved'));

    it('halves budget (floors the result)', () => {
      expect(applyBossBudgetFactor(20, budgetEffects)).toBe(10);
    });

    it('floors odd budget when halved', () => {
      expect(applyBossBudgetFactor(15, budgetEffects)).toBe(7);
    });

    it('returns original budget when no budget factor effect active', () => {
      expect(applyBossBudgetFactor(20, {})).toBe(20);
    });

    it('handles zero budget', () => {
      expect(applyBossBudgetFactor(0, budgetEffects)).toBe(0);
    });

    it('handles large budgets', () => {
      expect(applyBossBudgetFactor(200, budgetEffects)).toBe(100);
    });
  });

  // ── validateNoDuplicateTags ─────────────────────────────────────────

  describe('validateNoDuplicateTags', () => {
    it('detects violations when same tag appears on multiple components', () => {
      const comp1 = makeComponent({ id: 'cmp_a', tags: ['cache', 'infra'], domain: 'data' });
      const comp2 = makeComponent({ id: 'cmp_b', tags: ['cache', 'db'], domain: 'data' });

      const violations = validateNoDuplicateTags([comp1, comp2]);

      expect(violations).toContain('cache');
      expect(violations).not.toContain('infra');
      expect(violations).not.toContain('db');
    });

    it('returns empty when all tags are unique across components', () => {
      const comp1 = makeComponent({ id: 'cmp_a', tags: ['cache'], domain: 'data' });
      const comp2 = makeComponent({ id: 'cmp_b', tags: ['db'], domain: 'data' });
      const comp3 = makeComponent({ id: 'cmp_c', tags: ['queue'], domain: 'data' });

      const violations = validateNoDuplicateTags([comp1, comp2, comp3]);

      expect(violations).toEqual([]);
    });

    it('detects multiple duplicate tags', () => {
      const comp1 = makeComponent({ id: 'cmp_a', tags: ['cache', 'infra'], domain: 'data' });
      const comp2 = makeComponent({ id: 'cmp_b', tags: ['cache', 'infra'], domain: 'network' });

      const violations = validateNoDuplicateTags([comp1, comp2]);

      expect(violations).toContain('cache');
      expect(violations).toContain('infra');
      expect(violations).toHaveLength(2);
    });

    it('handles empty component list', () => {
      expect(validateNoDuplicateTags([])).toEqual([]);
    });

    it('handles single component (no duplicates possible)', () => {
      const c = makeComponent({ tags: ['cache', 'db', 'infra'], domain: 'data' });
      expect(validateNoDuplicateTags([c])).toEqual([]);
    });

    it('detects duplicates in real game data components', () => {
      // Redis (cache, db) + Memcached (cache) -> duplicate "cache"
      const redis = data.components.find(c => c.id === 'cmp_redis')!;
      const memcached = data.components.find(c => c.id === 'cmp_memcached')!;

      const violations = validateNoDuplicateTags([redis, memcached]);
      expect(violations).toContain('cache');
    });

    it('no duplicates when components have disjoint tags', () => {
      // EC2 (compute) + S3 (storage) -> no overlap
      const ec2 = data.components.find(c => c.id === 'cmp_ec2')!;
      const s3 = data.components.find(c => c.id === 'cmp_s3')!;

      const violations = validateNoDuplicateTags([ec2, s3]);
      expect(violations).toEqual([]);
    });
  });
});
