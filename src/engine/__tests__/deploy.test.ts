import { describe, it, expect } from 'vitest';
import { getEffectiveCapacityCost, validateDeployment } from '../deploy.js';
import { loadGameData } from '../../data/loader.js';

describe('deploy + capacity system', () => {
  const data = loadGameData();
  const sreSchool = data.schools.find(s => s.id === 'school_sre')!;
  const performanceSchool = data.schools.find(s => s.id === 'school_performance')!;
  const startupSchool = data.schools.find(s => s.id === 'school_startup')!;

  describe('getEffectiveCapacityCost', () => {
    it('applies school discount for matching tags (SRE school)', () => {
      // SRE discount tags: multi_az, health_check, circuit_breaker, failover
      // SRE discount factor: 0.7
      const multiAz = data.components.find(c => c.id === 'cmp_multi_az')!;
      expect(multiAz.capacity_cost).toBe(22);
      // 22 * 0.7 = 15.4 -> ceil -> 16
      expect(getEffectiveCapacityCost(multiAz, sreSchool.modifiers)).toBe(16);

      const healthCheck = data.components.find(c => c.id === 'cmp_health_check')!;
      expect(healthCheck.capacity_cost).toBe(5);
      // 5 * 0.7 = 3.5 -> ceil -> 4
      expect(getEffectiveCapacityCost(healthCheck, sreSchool.modifiers)).toBe(4);

      const circuitBreaker = data.components.find(c => c.id === 'cmp_circuit_breaker')!;
      expect(circuitBreaker.capacity_cost).toBe(8);
      // 8 * 0.7 = 5.6 -> ceil -> 6
      expect(getEffectiveCapacityCost(circuitBreaker, sreSchool.modifiers)).toBe(6);

      const failover = data.components.find(c => c.id === 'cmp_failover')!;
      expect(failover.capacity_cost).toBe(18);
      // 18 * 0.7 = 12.6 -> ceil -> 13
      expect(getEffectiveCapacityCost(failover, sreSchool.modifiers)).toBe(13);
    });

    it('applies school discount for matching tags (Performance school)', () => {
      // Performance discount tags: cache, cdn, read_replica, edge
      // Performance discount factor: 0.7
      const cdn = data.components.find(c => c.id === 'cmp_cdn')!;
      // cdn has tags: ["cdn", "edge"] - both match
      expect(cdn.capacity_cost).toBe(8);
      // 8 * 0.7 = 5.6 -> ceil -> 6
      expect(getEffectiveCapacityCost(cdn, performanceSchool.modifiers)).toBe(6);

      const cache = data.components.find(c => c.id === 'cmp_cache')!;
      expect(cache.capacity_cost).toBe(15);
      // 15 * 0.7 = 10.5 -> ceil -> 11
      expect(getEffectiveCapacityCost(cache, performanceSchool.modifiers)).toBe(11);

      const readReplica = data.components.find(c => c.id === 'cmp_read_replica')!;
      expect(readReplica.capacity_cost).toBe(14);
      // 14 * 0.7 = 9.8 -> ceil -> 10
      expect(getEffectiveCapacityCost(readReplica, performanceSchool.modifiers)).toBe(10);
    });

    it('returns original cost for non-matching tags', () => {
      // API Gateway has tag "gateway" which is NOT in SRE discount tags
      const apiGw = data.components.find(c => c.id === 'cmp_api_gw')!;
      expect(getEffectiveCapacityCost(apiGw, sreSchool.modifiers)).toBe(10);

      // SQL DB has tags ["db", "sql", "primary_db"] - not in SRE discount tags
      const sqlDb = data.components.find(c => c.id === 'cmp_sql_db')!;
      expect(getEffectiveCapacityCost(sqlDb, sreSchool.modifiers)).toBe(18);

      // Startup school has no discount tags, so everything is full cost
      const multiAz = data.components.find(c => c.id === 'cmp_multi_az')!;
      expect(getEffectiveCapacityCost(multiAz, startupSchool.modifiers)).toBe(22);
    });
  });

  describe('validateDeployment', () => {
    it('calculates correct total and reports not over budget when within limits', () => {
      // Pick a few small components: health_check (5), rate_limiter (6), feature_flag (5)
      const healthCheck = data.components.find(c => c.id === 'cmp_health_check')!;
      const rateLimiter = data.components.find(c => c.id === 'cmp_rate_limit')!;
      const featureFlag = data.components.find(c => c.id === 'cmp_feature_flag')!;

      const components = [healthCheck, rateLimiter, featureFlag];
      // With startup school (no discounts): 5 + 6 + 5 = 16
      const budget = 20;
      const result = validateDeployment(components, budget, startupSchool.modifiers);

      expect(result.totalCost).toBe(16);
      expect(result.overBudget).toBe(false);
      expect(result.penalty).toBe(0);
    });

    it('reports exactly at budget as not over budget', () => {
      const healthCheck = data.components.find(c => c.id === 'cmp_health_check')!;
      const featureFlag = data.components.find(c => c.id === 'cmp_feature_flag')!;

      const components = [healthCheck, featureFlag];
      // With startup school (no discounts): 5 + 5 = 10
      const budget = 10;
      const result = validateDeployment(components, budget, startupSchool.modifiers);

      expect(result.totalCost).toBe(10);
      expect(result.overBudget).toBe(false);
      expect(result.penalty).toBe(0);
    });

    it('calculates over-budget penalty as (totalCost - budget) * 5', () => {
      const multiAz = data.components.find(c => c.id === 'cmp_multi_az')!;
      const sqlDb = data.components.find(c => c.id === 'cmp_sql_db')!;
      const cache = data.components.find(c => c.id === 'cmp_cache')!;

      const components = [multiAz, sqlDb, cache];
      // With startup school (no discounts): 22 + 18 + 15 = 55
      const budget = 50;
      const result = validateDeployment(components, budget, startupSchool.modifiers);

      expect(result.totalCost).toBe(55);
      expect(result.overBudget).toBe(true);
      // (55 - 50) * 5 = 25
      expect(result.penalty).toBe(25);
    });

    it('applies school discounts when calculating deployment total', () => {
      // SRE school: multi_az (22->16), health_check (5->4), circuit_breaker (8->6)
      const multiAz = data.components.find(c => c.id === 'cmp_multi_az')!;
      const healthCheck = data.components.find(c => c.id === 'cmp_health_check')!;
      const circuitBreaker = data.components.find(c => c.id === 'cmp_circuit_breaker')!;

      const components = [multiAz, healthCheck, circuitBreaker];
      // With SRE discounts: 16 + 4 + 6 = 26
      const budget = 30;
      const result = validateDeployment(components, budget, sreSchool.modifiers);

      expect(result.totalCost).toBe(26);
      expect(result.overBudget).toBe(false);
      expect(result.penalty).toBe(0);
    });

    it('handles empty deployment', () => {
      const result = validateDeployment([], 100, startupSchool.modifiers);

      expect(result.totalCost).toBe(0);
      expect(result.overBudget).toBe(false);
      expect(result.penalty).toBe(0);
    });
  });
});
