import { describe, it, expect } from 'vitest';
import { computeRiskExposure, resolveEvent } from '../risk.js';
import { loadGameData } from '../../data/loader.js';

describe('risk + event system', () => {
  const data = loadGameData();

  // Helper to find components by id
  const findComponent = (id: string) => data.components.find(c => c.id === id)!;
  const findEvent = (id: string) => data.events.find(e => e.id === id)!;

  describe('computeRiskExposure', () => {
    it('exposes risks from functional components only (cache)', () => {
      // Redis Cache exposes: cache_avalanche, data_inconsistency
      const cache = findComponent('cmp_cache');
      const report = computeRiskExposure([cache]);

      expect(report.allExposed).toContain('cache_avalanche');
      expect(report.allExposed).toContain('data_inconsistency');
      expect(report.allSealed).toEqual([]);
      expect(report.exposed).toContain('cache_avalanche');
      expect(report.exposed).toContain('data_inconsistency');
      expect(report.sealed).toEqual([]);
    });

    it('seals risks when defensive component is deployed (cache + warmup)', () => {
      // Redis Cache exposes: cache_avalanche, data_inconsistency
      // Cache Warm-up seals: cache_avalanche
      const cache = findComponent('cmp_cache');
      const warmup = findComponent('cmp_cache_warmup');
      const report = computeRiskExposure([cache, warmup]);

      expect(report.allExposed).toContain('cache_avalanche');
      expect(report.allExposed).toContain('data_inconsistency');
      expect(report.allSealed).toContain('cache_avalanche');
      // cache_avalanche is sealed, so it should NOT be in exposed
      expect(report.exposed).not.toContain('cache_avalanche');
      // data_inconsistency is not sealed, so it should still be exposed
      expect(report.exposed).toContain('data_inconsistency');
      // cache_avalanche was exposed and then sealed
      expect(report.sealed).toContain('cache_avalanche');
    });

    it('handles multiple functional components aggregating risks', () => {
      // SQL DB exposes: db_single_point, slow_query
      // API Gateway exposes: gateway_bottleneck
      const sqlDb = findComponent('cmp_sql_db');
      const apiGw = findComponent('cmp_api_gw');
      const report = computeRiskExposure([sqlDb, apiGw]);

      expect(report.allExposed).toContain('db_single_point');
      expect(report.allExposed).toContain('slow_query');
      expect(report.allExposed).toContain('gateway_bottleneck');
      expect(report.exposed).toEqual(expect.arrayContaining([
        'db_single_point', 'slow_query', 'gateway_bottleneck',
      ]));
      expect(report.exposed.length).toBe(3);
    });

    it('deduplicates risks exposed by multiple components', () => {
      // Redis Cache exposes: cache_avalanche, data_inconsistency
      // Read Replica exposes: replication_lag, data_inconsistency
      // data_inconsistency appears in both but should only appear once
      const cache = findComponent('cmp_cache');
      const readReplica = findComponent('cmp_read_replica');
      const report = computeRiskExposure([cache, readReplica]);

      const dataInconsistencyCount = report.allExposed.filter(
        r => r === 'data_inconsistency',
      ).length;
      expect(dataInconsistencyCount).toBe(1);
      expect(report.allExposed).toContain('cache_avalanche');
      expect(report.allExposed).toContain('replication_lag');
    });

    it('handles empty deployment', () => {
      const report = computeRiskExposure([]);
      expect(report.allExposed).toEqual([]);
      expect(report.allSealed).toEqual([]);
      expect(report.exposed).toEqual([]);
      expect(report.sealed).toEqual([]);
    });

    it('handles components with no exposes or seals', () => {
      // Health Check: exposes: [], seals: []
      const healthCheck = findComponent('cmp_health_check');
      const report = computeRiskExposure([healthCheck]);

      expect(report.allExposed).toEqual([]);
      expect(report.allSealed).toEqual([]);
      expect(report.exposed).toEqual([]);
      expect(report.sealed).toEqual([]);
    });

    it('seals only count for risks that were actually exposed', () => {
      // Cache Warm-up seals cache_avalanche, but if no cache is deployed
      // there is nothing to seal. allSealed still shows it, but sealed
      // (intersection of allExposed and allSealed) should be empty.
      const warmup = findComponent('cmp_cache_warmup');
      const report = computeRiskExposure([warmup]);

      expect(report.allSealed).toContain('cache_avalanche');
      expect(report.allExposed).toEqual([]);
      // sealed = intersection of allExposed and allSealed = nothing
      expect(report.sealed).toEqual([]);
      expect(report.exposed).toEqual([]);
    });

    it('handles complex deployment with multiple seals', () => {
      // SQL DB exposes: db_single_point, slow_query
      // Read Replica exposes: replication_lag, data_inconsistency
      // Sharding seals: db_single_point
      // Consistency Checker seals: data_inconsistency, replication_lag
      const sqlDb = findComponent('cmp_sql_db');
      const readReplica = findComponent('cmp_read_replica');
      const sharding = findComponent('cmp_sharding');
      const consistencyChecker = findComponent('cmp_consistency_checker');

      const report = computeRiskExposure([sqlDb, readReplica, sharding, consistencyChecker]);

      // Sharding also exposes: cross_shard_query, rebalance_risk
      expect(report.allExposed).toContain('db_single_point');
      expect(report.allExposed).toContain('slow_query');
      expect(report.allExposed).toContain('replication_lag');
      expect(report.allExposed).toContain('data_inconsistency');
      expect(report.allExposed).toContain('cross_shard_query');
      expect(report.allExposed).toContain('rebalance_risk');

      // Sealed: db_single_point (by sharding), data_inconsistency + replication_lag (by checker)
      expect(report.sealed).toContain('db_single_point');
      expect(report.sealed).toContain('data_inconsistency');
      expect(report.sealed).toContain('replication_lag');

      // Still exposed: slow_query, cross_shard_query, rebalance_risk
      expect(report.exposed).toContain('slow_query');
      expect(report.exposed).toContain('cross_shard_query');
      expect(report.exposed).toContain('rebalance_risk');
      expect(report.exposed).not.toContain('db_single_point');
      expect(report.exposed).not.toContain('data_inconsistency');
      expect(report.exposed).not.toContain('replication_lag');
    });
  });

  describe('resolveEvent', () => {
    it('hits when event targets exposed risks', () => {
      // event_hot_key targets: cache_avalanche, data_inconsistency
      // If cache_avalanche is exposed, the event should hit
      const event = findEvent('event_hot_key');
      const result = resolveEvent(event, ['cache_avalanche', 'data_inconsistency']);

      expect(result.hit).toBe(true);
      expect(result.matchedRisks).toContain('cache_avalanche');
      expect(result.matchedRisks).toContain('data_inconsistency');
      expect(result.penalty).toEqual(event.penalty);
    });

    it('misses when risks are sealed (no exposed risks match)', () => {
      // event_hot_key targets: cache_avalanche, data_inconsistency
      // If both are sealed, exposed = [], event should miss
      const event = findEvent('event_hot_key');
      const result = resolveEvent(event, []);

      expect(result.hit).toBe(false);
      expect(result.matchedRisks).toEqual([]);
      expect(result.penalty).toEqual({ perf: 0, rel: 0, cx: 0 });
    });

    it('misses when no deployed components expose the targeted risks', () => {
      // event_az_outage targets: network_partition, db_single_point
      // If we only have gateway_bottleneck exposed, no match
      const event = findEvent('event_az_outage');
      const result = resolveEvent(event, ['gateway_bottleneck', 'cache_avalanche']);

      expect(result.hit).toBe(false);
      expect(result.matchedRisks).toEqual([]);
      expect(result.penalty).toEqual({ perf: 0, rel: 0, cx: 0 });
    });

    it('handles event with multiple target risks - only some exposed', () => {
      // event_db_slow targets: slow_query, db_single_point, replication_lag
      // Only slow_query is exposed
      const event = findEvent('event_db_slow');
      const result = resolveEvent(event, ['slow_query']);

      expect(result.hit).toBe(true);
      expect(result.matchedRisks).toEqual(['slow_query']);
      // Penalty should be applied (hit is true)
      expect(result.penalty).toEqual(event.penalty);
    });

    it('returns correct event reference in result', () => {
      const event = findEvent('event_traffic_spike');
      const result = resolveEvent(event, ['gateway_bottleneck']);

      expect(result.event).toBe(event);
      expect(result.event.id).toBe('event_traffic_spike');
      expect(result.event.severity).toBe(2);
    });

    it('applies penalty from event when hit (does not scale by matched count)', () => {
      // event_traffic_spike: targets gateway_bottleneck, db_single_point, slow_query
      // penalty: { perf: -3, rel: -1, cx: 0 }
      const event = findEvent('event_traffic_spike');

      // Match one risk
      const result1 = resolveEvent(event, ['gateway_bottleneck']);
      expect(result1.penalty).toEqual({ perf: -3, rel: -1, cx: 0 });

      // Match all three risks
      const result3 = resolveEvent(event, ['gateway_bottleneck', 'db_single_point', 'slow_query']);
      expect(result3.penalty).toEqual({ perf: -3, rel: -1, cx: 0 });

      // Penalty is the same regardless of how many risks matched
      expect(result1.penalty).toEqual(result3.penalty);
    });

    it('integrates with computeRiskExposure for end-to-end flow', () => {
      // Deploy cache only -> exposes cache_avalanche, data_inconsistency
      const cache = findComponent('cmp_cache');
      const riskReport = computeRiskExposure([cache]);

      // event_hot_key targets: cache_avalanche, data_inconsistency -> should hit
      const hotKeyEvent = findEvent('event_hot_key');
      const hitResult = resolveEvent(hotKeyEvent, riskReport.exposed);
      expect(hitResult.hit).toBe(true);
      expect(hitResult.matchedRisks).toContain('cache_avalanche');

      // Now add warmup -> seals cache_avalanche
      const warmup = findComponent('cmp_cache_warmup');
      const sealedReport = computeRiskExposure([cache, warmup]);

      // event_hot_key should still hit because data_inconsistency is exposed
      const partialResult = resolveEvent(hotKeyEvent, sealedReport.exposed);
      expect(partialResult.hit).toBe(true);
      expect(partialResult.matchedRisks).toContain('data_inconsistency');
      expect(partialResult.matchedRisks).not.toContain('cache_avalanche');

      // Add consistency checker -> seals data_inconsistency too
      const checker = findComponent('cmp_consistency_checker');
      const fullySealedReport = computeRiskExposure([cache, warmup, checker]);

      // Now event_hot_key should miss entirely
      const missResult = resolveEvent(hotKeyEvent, fullySealedReport.exposed);
      expect(missResult.hit).toBe(false);
      expect(missResult.penalty).toEqual({ perf: 0, rel: 0, cx: 0 });
    });
  });
});
