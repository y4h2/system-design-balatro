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
      // SRE discount tags: ["ha"], factor: 0.7
      const multiAz = data.components.find(c => c.id === 'cmp_multi_az')!;
      expect(multiAz.capacity_cost).toBe(16);
      expect(multiAz.tags).toContain('ha');
      // 16 * 0.7 = 11.2 -> ceil -> 12
      expect(getEffectiveCapacityCost(multiAz, sreSchool.modifiers)).toBe(12);

      const healthCheck = data.components.find(c => c.id === 'cmp_health_check')!;
      expect(healthCheck.capacity_cost).toBe(4);
      // 4 * 0.7 = 2.8 -> ceil -> 3
      expect(getEffectiveCapacityCost(healthCheck, sreSchool.modifiers)).toBe(3);

      const circuitBreaker = data.components.find(c => c.id === 'cmp_circuit_breaker')!;
      expect(circuitBreaker.capacity_cost).toBe(7);
      // 7 * 0.7 = 4.9 -> ceil -> 5
      expect(getEffectiveCapacityCost(circuitBreaker, sreSchool.modifiers)).toBe(5);

      const failover = data.components.find(c => c.id === 'cmp_failover')!;
      expect(failover.capacity_cost).toBe(14);
      // 14 * 0.7 = 9.8 -> ceil -> 10
      expect(getEffectiveCapacityCost(failover, sreSchool.modifiers)).toBe(10);
    });

    it('applies school discount for matching tags (Performance school)', () => {
      // Performance discount tags: ["cache", "edge"], factor: 0.7
      const redis = data.components.find(c => c.id === 'cmp_redis')!;
      expect(redis.tags).toContain('cache');
      expect(redis.capacity_cost).toBe(10);
      // 10 * 0.7 = 7 -> ceil -> 7
      expect(getEffectiveCapacityCost(redis, performanceSchool.modifiers)).toBe(7);

      const cloudfront = data.components.find(c => c.id === 'cmp_cloudfront')!;
      expect(cloudfront.tags).toContain('edge');
      expect(cloudfront.capacity_cost).toBe(10);
      // 10 * 0.7 = 7
      expect(getEffectiveCapacityCost(cloudfront, performanceSchool.modifiers)).toBe(7);

      const memcached = data.components.find(c => c.id === 'cmp_memcached')!;
      expect(memcached.tags).toContain('cache');
      expect(memcached.capacity_cost).toBe(6);
      // 6 * 0.7 = 4.2 -> ceil -> 5
      expect(getEffectiveCapacityCost(memcached, performanceSchool.modifiers)).toBe(5);
    });

    it('returns original cost for non-matching tags', () => {
      // Nginx has tag "gateway" which is NOT in SRE discount tags
      const nginx = data.components.find(c => c.id === 'cmp_nginx')!;
      expect(nginx.tags).not.toContain('ha');
      expect(getEffectiveCapacityCost(nginx, sreSchool.modifiers)).toBe(nginx.capacity_cost);

      // PostgreSQL has tag "db" - not in SRE discount tags
      const pg = data.components.find(c => c.id === 'cmp_postgresql')!;
      expect(pg.tags).not.toContain('ha');
      expect(getEffectiveCapacityCost(pg, sreSchool.modifiers)).toBe(pg.capacity_cost);

      // Startup school has no discount tags, so everything is full cost
      const multiAz = data.components.find(c => c.id === 'cmp_multi_az')!;
      expect(getEffectiveCapacityCost(multiAz, startupSchool.modifiers)).toBe(16);
    });
  });

  describe('validateDeployment', () => {
    it('calculates correct total and reports not over budget when within limits', () => {
      const healthCheck = data.components.find(c => c.id === 'cmp_health_check')!; // 4
      const nginx = data.components.find(c => c.id === 'cmp_nginx')!; // 6
      const featureFlag = data.components.find(c => c.id === 'cmp_feature_flag')!; // 4

      const components = [healthCheck, nginx, featureFlag];
      // With startup school (no discounts): 4 + 6 + 4 = 14
      const budget = 20;
      const result = validateDeployment(components, budget, startupSchool.modifiers);

      expect(result.totalCost).toBe(14);
      expect(result.overBudget).toBe(false);
      expect(result.penalty).toBe(0);
    });

    it('reports exactly at budget as not over budget', () => {
      const healthCheck = data.components.find(c => c.id === 'cmp_health_check')!; // 4
      const featureFlag = data.components.find(c => c.id === 'cmp_feature_flag')!; // 4

      const components = [healthCheck, featureFlag];
      // 4 + 4 = 8
      const budget = 8;
      const result = validateDeployment(components, budget, startupSchool.modifiers);

      expect(result.totalCost).toBe(8);
      expect(result.overBudget).toBe(false);
      expect(result.penalty).toBe(0);
    });

    it('calculates over-budget penalty as (totalCost - budget) * 5', () => {
      const multiAz = data.components.find(c => c.id === 'cmp_multi_az')!; // 16
      const pg = data.components.find(c => c.id === 'cmp_postgresql')!; // 14
      const aurora = data.components.find(c => c.id === 'cmp_aurora')!; // 18

      const components = [multiAz, pg, aurora];
      // With startup school (no discounts): 16 + 14 + 18 = 48
      const budget = 40;
      const result = validateDeployment(components, budget, startupSchool.modifiers);

      expect(result.totalCost).toBe(48);
      expect(result.overBudget).toBe(true);
      // (48 - 40) * 5 = 40
      expect(result.penalty).toBe(40);
    });

    it('applies school discounts when calculating deployment total', () => {
      // SRE school: discount ha components
      const multiAz = data.components.find(c => c.id === 'cmp_multi_az')!; // 16 -> 12
      const healthCheck = data.components.find(c => c.id === 'cmp_health_check')!; // 4 -> 3
      const circuitBreaker = data.components.find(c => c.id === 'cmp_circuit_breaker')!; // 7 -> 5

      const components = [multiAz, healthCheck, circuitBreaker];
      // With SRE discounts: 12 + 3 + 5 = 20
      const budget = 30;
      const result = validateDeployment(components, budget, sreSchool.modifiers);

      expect(result.totalCost).toBe(20);
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
