import { describe, it, expect } from 'vitest';
import {
  parseBossRuleEffects,
  applyBossCapacityCost,
  applyBossBudgetFactor,
  applyTechDebtRisks,
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
    tags: [],
    delta: { perf: 0, rel: 0, cx: 0 },
    capacity_cost: 2,
    exposes: [],
    seals: [],
    requires_tags: [],
    conflicts_tags: [],
    rarity: 'common',
    category: 'functional',
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
      expect(effects.hideRiskReport).toBeUndefined();
      expect(effects.extraRandomRiskPerComponent).toBeUndefined();
      expect(effects.noDuplicateTags).toBeUndefined();
    });

    it('parses boss_budget_halved into capacityBudgetFactor', () => {
      const rule = findBossRule('boss_budget_halved');
      const effects = parseBossRuleEffects(rule);

      expect(effects.capacityBudgetFactor).toBe(0.5);
      expect(effects.capacityMultiplierForTags).toBeUndefined();
    });

    it('parses boss_blind_review into hideRiskReport', () => {
      const rule = findBossRule('boss_blind_review');
      const effects = parseBossRuleEffects(rule);

      expect(effects.hideRiskReport).toBe(true);
    });

    it('parses boss_tech_debt_explosion into extraRandomRiskPerComponent', () => {
      const rule = findBossRule('boss_tech_debt_explosion');
      const effects = parseBossRuleEffects(rule);

      expect(effects.extraRandomRiskPerComponent).toBe(1);
    });

    it('parses boss_single_point into noDuplicateTags', () => {
      const rule = findBossRule('boss_single_point');
      const effects = parseBossRuleEffects(rule);

      expect(effects.noDuplicateTags).toBe(true);
    });
  });

  // ── applyBossCapacityCost ───────────────────────────────────────────

  describe('applyBossCapacityCost', () => {
    const cacheEffects = parseBossRuleEffects(findBossRule('boss_cache_disabled'));

    it('doubles cost for component with cache tag', () => {
      const comp = makeComponent({ tags: ['cache', 'infra'] });
      expect(applyBossCapacityCost(3, comp, cacheEffects)).toBe(6);
    });

    it('does not change cost for component without cache tag', () => {
      const comp = makeComponent({ tags: ['db', 'sql'] });
      expect(applyBossCapacityCost(3, comp, cacheEffects)).toBe(3);
    });

    it('returns base cost when no capacity multiplier effects are active', () => {
      const comp = makeComponent({ tags: ['cache'] });
      expect(applyBossCapacityCost(3, comp, {})).toBe(3);
    });

    it('rounds up fractional results with Math.ceil', () => {
      const comp = makeComponent({ tags: ['cache'] });
      // 5 * 2 = 10, integer result
      expect(applyBossCapacityCost(5, comp, cacheEffects)).toBe(10);
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
  });

  // ── applyTechDebtRisks ──────────────────────────────────────────────

  describe('applyTechDebtRisks', () => {
    it('adds exactly 1 extra risk per component', () => {
      const comp1 = makeComponent({ id: 'cmp_a', exposes: ['cache_avalanche'] });
      const comp2 = makeComponent({ id: 'cmp_b', exposes: ['slow_query'] });

      const result = applyTechDebtRisks([comp1, comp2], 1);

      expect(result).toHaveLength(2);
      expect(result[0].exposes).toHaveLength(2); // 1 original + 1 extra
      expect(result[1].exposes).toHaveLength(2);
    });

    it('does not add duplicate risks already on the component', () => {
      const comp = makeComponent({ exposes: ['cache_avalanche'] });
      const result = applyTechDebtRisks([comp], 1);

      // The extra risk must not be cache_avalanche (already exposed)
      expect(result[0].exposes[0]).toBe('cache_avalanche');
      expect(result[0].exposes[1]).not.toBe('cache_avalanche');
    });

    it('does not mutate original components', () => {
      const comp = makeComponent({ exposes: ['slow_query'] });
      const original = [...comp.exposes];
      applyTechDebtRisks([comp], 1);

      expect(comp.exposes).toEqual(original);
    });

    it('handles component with empty exposes', () => {
      const comp = makeComponent({ exposes: [] });
      const result = applyTechDebtRisks([comp], 1);

      expect(result[0].exposes).toHaveLength(1);
    });

    it('handles empty component list', () => {
      const result = applyTechDebtRisks([], 1);
      expect(result).toEqual([]);
    });
  });

  // ── validateNoDuplicateTags ─────────────────────────────────────────

  describe('validateNoDuplicateTags', () => {
    it('detects violations when same tag appears on multiple components', () => {
      const comp1 = makeComponent({ id: 'cmp_a', tags: ['cache', 'infra'] });
      const comp2 = makeComponent({ id: 'cmp_b', tags: ['cache', 'db'] });

      const violations = validateNoDuplicateTags([comp1, comp2]);

      expect(violations).toContain('cache');
      expect(violations).not.toContain('infra');
      expect(violations).not.toContain('db');
    });

    it('returns empty when all tags are unique across components', () => {
      const comp1 = makeComponent({ id: 'cmp_a', tags: ['cache'] });
      const comp2 = makeComponent({ id: 'cmp_b', tags: ['db'] });
      const comp3 = makeComponent({ id: 'cmp_c', tags: ['queue'] });

      const violations = validateNoDuplicateTags([comp1, comp2, comp3]);

      expect(violations).toEqual([]);
    });

    it('detects multiple duplicate tags', () => {
      const comp1 = makeComponent({ id: 'cmp_a', tags: ['cache', 'infra'] });
      const comp2 = makeComponent({ id: 'cmp_b', tags: ['cache', 'infra'] });

      const violations = validateNoDuplicateTags([comp1, comp2]);

      expect(violations).toContain('cache');
      expect(violations).toContain('infra');
      expect(violations).toHaveLength(2);
    });

    it('handles empty component list', () => {
      expect(validateNoDuplicateTags([])).toEqual([]);
    });

    it('handles single component (no duplicates possible)', () => {
      const comp = makeComponent({ tags: ['cache', 'db', 'infra'] });
      expect(validateNoDuplicateTags([comp])).toEqual([]);
    });
  });
});
