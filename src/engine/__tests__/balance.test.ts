import { describe, it, expect } from 'vitest';
import { runPhase, type PhaseInput, type PhaseSettlement } from '../phase-runner.js';
import { loadGameData } from '../../data/loader.js';
import type { Component, School, Scenario, Joker, Pattern, SuperPattern, Phase } from '../../schemas/index.js';
import type { Panel } from '../scoring.js';

// ── Load all game data once ─────────────────────────────────────────
const data = loadGameData();

// ── Lookup helpers ──────────────────────────────────────────────────
function comp(id: string): Component {
  const c = data.components.find(c => c.id === id);
  if (!c) throw new Error(`Component not found: ${id}`);
  return c;
}

function sch(id: string): School {
  const s = data.schools.find(s => s.id === id);
  if (!s) throw new Error(`School not found: ${id}`);
  return s;
}

function scen(id: string): Scenario {
  const s = data.scenarios.find(s => s.id === id);
  if (!s) throw new Error(`Scenario not found: ${id}`);
  return s;
}

function jk(id: string): Joker {
  const j = data.jokers.find(j => j.id === id);
  if (!j) throw new Error(`Joker not found: ${id}`);
  return j;
}

function baseline(s: School): Panel {
  const ov = (s.modifiers.baseline_overrides ?? {}) as Record<string, number>;
  return { perf: ov.perf ?? 2, rel: ov.rel ?? 2, cx: ov.cx ?? 2 };
}

// ── Simulation helper ───────────────────────────────────────────────
function simulate(
  scenarioId: string,
  phaseIdx: number,
  schoolId: string,
  deployed: Component[],
  jokers: Joker[] = [],
): PhaseSettlement {
  const sc = scen(scenarioId);
  const school = sch(schoolId);
  const phase = sc.phases[phaseIdx];

  return runPhase({
    phase,
    deployed,
    school,
    baseline: baseline(school),
    jokers,
    patterns: data.patterns,
    superPatterns: data.superPatterns,
  });
}

// Simple phase for isolated testing
function simplePhase(budget: number, target: number): Phase {
  return {
    blind: 'small',
    subtitle: 'Balance Test',
    capacity_budget: budget,
    target_score: target,
    constraints: { constraint_penalty: 0 },
    skippable: true,
  };
}

function simpleRun(
  deployed: Component[],
  jokers: Joker[] = [],
  phase?: Phase,
): PhaseSettlement {
  const school = sch('school_startup');
  return runPhase({
    phase: phase ?? simplePhase(200, 0),
    deployed,
    school,
    baseline: baseline(school),
    jokers,
    patterns: data.patterns,
    superPatterns: data.superPatterns,
  });
}

describe('balance', () => {
  // ── Base hand scoring (no patterns, no jokers) ────────────────────

  describe('base hand scores', () => {
    it('single common component scores its base_chips', () => {
      // EC2: base_chips=3
      const result = simpleRun([comp('cmp_ec2')]);
      expect(result.baseChips).toBe(3);
      expect(result.finalScore).toBe(3); // 3 chips * 1 mult
    });

    it('single rare component scores higher base_chips', () => {
      // GPU: base_chips=5
      const result = simpleRun([comp('cmp_gpu')]);
      expect(result.baseChips).toBe(5);
      expect(result.finalScore).toBeGreaterThanOrEqual(5);
    });

    it('more components = more base chips linearly', () => {
      const one = simpleRun([comp('cmp_ec2')]);
      const two = simpleRun([comp('cmp_ec2'), comp('cmp_lambda')]);
      const three = simpleRun([comp('cmp_ec2'), comp('cmp_lambda'), comp('cmp_worker')]);

      expect(one.baseChips).toBe(3);
      expect(two.baseChips).toBe(3 + 2); // 5
      expect(three.baseChips).toBe(3 + 2 + 3); // 8
    });

    it('rare components have base_chips >= 4', () => {
      const rares = data.components.filter(c => c.rarity === 'rare');
      for (const r of rares) {
        expect(r.base_chips).toBeGreaterThanOrEqual(4);
      }
    });

    it('common components have base_chips 2-4', () => {
      const commons = data.components.filter(c => c.rarity === 'common');
      for (const c of commons) {
        expect(c.base_chips).toBeGreaterThanOrEqual(2);
        expect(c.base_chips).toBeLessThanOrEqual(4);
      }
    });
  });

  // ── Good hands with patterns ──────────────────────────────────────

  describe('good hands with patterns', () => {
    it('read path (cache + db) significantly boosts score', () => {
      // Redis (cache, db) + PostgreSQL (db) triggers p_read_path
      const withPattern = simpleRun([comp('cmp_redis'), comp('cmp_postgresql')]);
      const noPattern = simpleRun([comp('cmp_ec2'), comp('cmp_lambda')]);

      // Pattern provides mult_add + chips_add on top of base
      expect(withPattern.finalScore).toBeGreaterThan(noPattern.finalScore * 2);
    });

    it('CQRS (db + queue + cache) is a top-tier pattern', () => {
      // Redis (cache, db) + Kafka (queue, async, realtime) -> CQRS
      const result = simpleRun([comp('cmp_redis'), comp('cmp_kafka')]);

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_cqrs');
      // CQRS gives mult_add=5, chips_add=15. Should result in high score
      expect(result.finalScore).toBeGreaterThan(50);
    });

    it('event driven (queue + async + compute) scores well', () => {
      // Kafka (queue, async) + Worker Fleet (compute, async) -> event_driven
      const result = simpleRun([comp('cmp_kafka'), comp('cmp_worker')]);

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_event_driven');
      expect(result.finalScore).toBeGreaterThan(20);
    });

    it('stacking multiple patterns multiplies score', () => {
      // Redis + Kafka triggers: CQRS, read_path, write_pipeline, event_driven, domain_pair
      const many = simpleRun([comp('cmp_redis'), comp('cmp_kafka')]);
      // Just PostgreSQL alone
      const single = simpleRun([comp('cmp_postgresql')]);

      // Many patterns should give massive score boost
      expect(many.triggeredPatterns.length).toBeGreaterThanOrEqual(4);
      expect(many.finalScore).toBeGreaterThan(single.finalScore * 10);
    });

    it('p_wide_spectrum requires 4+ distinct domains', () => {
      const fourDomains = simpleRun([
        comp('cmp_ec2'),       // compute
        comp('cmp_postgresql'), // data
        comp('cmp_nginx'),      // network
        comp('cmp_multi_az'),   // defense
      ]);

      const threeDomains = simpleRun([
        comp('cmp_ec2'),
        comp('cmp_postgresql'),
        comp('cmp_nginx'),
      ]);

      const fourPatterns = fourDomains.triggeredPatterns.map(p => p.id);
      const threePatterns = threeDomains.triggeredPatterns.map(p => p.id);

      expect(fourPatterns).toContain('p_wide_spectrum');
      expect(threePatterns).not.toContain('p_wide_spectrum');
    });

    it('p_observability triggers with monitor + search or deploy', () => {
      // ELK (monitor, search) provides both monitor + search
      const result = simpleRun([comp('cmp_elk')]);
      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_observability');
    });

    it('p_fortress triggers with security + gateway', () => {
      // Kong (gateway, security) provides both
      const result = simpleRun([comp('cmp_kong')]);
      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_fortress');
    });
  });

  // ── Joker effects on balance ──────────────────────────────────────

  describe('joker effects on score', () => {
    it('jk_sla_maniac (x1.3 mult) increases score by ~30%', () => {
      // Multi-AZ (ha) + Circuit Breaker (ha) to activate SLA maniac
      const deployed = [comp('cmp_multi_az'), comp('cmp_circuit_breaker')];
      const withJoker = simpleRun(deployed, [jk('jk_sla_maniac')]);
      const withoutJoker = simpleRun(deployed, []);

      // SLA Maniac: x1.3 multiplicative
      expect(withJoker.activeJokers.map(j => j.id)).toContain('jk_sla_maniac');
      // Score should be roughly 1.3x higher
      const ratio = withJoker.finalScore / withoutJoker.finalScore;
      expect(ratio).toBeGreaterThanOrEqual(1.2);
      expect(ratio).toBeLessThanOrEqual(1.4);
    });

    it('jk_data_hoarder scales with number of db components', () => {
      const oneDb = simpleRun([comp('cmp_postgresql')], [jk('jk_data_hoarder')]);
      const threeDb = simpleRun(
        [comp('cmp_postgresql'), comp('cmp_mysql'), comp('cmp_mongodb')],
        [jk('jk_data_hoarder')],
      );

      // 1 db comp -> 3 extra chips; 3 db comps -> 9 extra chips
      expect(oneDb.jokerChips).toBe(3);
      expect(threeDb.jokerChips).toBe(9);
    });

    it('jk_combo_king provides massive boost with multiple patterns', () => {
      // Redis + Kafka -> many patterns, combo_king x1.5
      const deployed = [comp('cmp_redis'), comp('cmp_kafka')];
      const withCombo = simpleRun(deployed, [jk('jk_combo_king')]);
      const noCombo = simpleRun(deployed, []);

      expect(withCombo.triggeredPatterns.length).toBeGreaterThanOrEqual(2);
      const ratio = withCombo.finalScore / noCombo.finalScore;
      expect(ratio).toBeCloseTo(1.5, 1);
    });

    it('stacking jokers compounds their effects', () => {
      // Redis + Kafka with data_hoarder + combo_king + pattern_amp
      const deployed = [comp('cmp_redis'), comp('cmp_kafka')];
      const noJokers = simpleRun(deployed, []);
      const allJokers = simpleRun(deployed, [
        jk('jk_data_hoarder'),
        jk('jk_combo_king'),
        jk('jk_pattern_amp'),
      ]);

      // Should get significant boost (at least 50% more)
      expect(allJokers.finalScore).toBeGreaterThan(noJokers.finalScore * 1.5);
    });
  });

  // ── Scenario phase balance ────────────────────────────────────────

  describe('scenario balance', () => {
    it('shortlink small blind is beatable with a reasonable hand', () => {
      // shortlink small: target=30, min_perf=3
      // CloudFront (edge,cache, perf+2) + Redis (cache,db, perf+3) + PostgreSQL (db, perf+1)
      // perf = 2 + 2 + 3 + 1 = 8 (passes min_perf=3)
      // triggers: p_read_path, p_edge_accel, p_domain_pair, etc.
      const result = simulate(
        'scenario_shortlink', 0, 'school_startup',
        [comp('cmp_cloudfront'), comp('cmp_redis'), comp('cmp_postgresql')],
      );

      expect(result.constraintResult.passed).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.finalScore).toBeGreaterThanOrEqual(30);
    });

    it('chat small blind is beatable with async+db hand', () => {
      // chat small: target=30, min_perf=3, min_rel=2
      // Kafka (perf+2, rel+1) + PostgreSQL (perf+1, rel+1) + Redis (perf+3, rel+0)
      // perf=2+2+1+3=8, rel=2+1+1+0=4
      const result = simulate(
        'scenario_chat', 0, 'school_startup',
        [comp('cmp_kafka'), comp('cmp_postgresql'), comp('cmp_redis')],
      );

      expect(result.constraintResult.passed).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('orders small blind is beatable with db-focused hand', () => {
      // orders small: target=30, min_rel=3
      // PostgreSQL (rel+1) + Aurora (rel+2) + Circuit Breaker (rel+2)
      // rel = 2+1+2+2 = 7 (passes min_rel=3)
      const result = simulate(
        'scenario_orders', 0, 'school_startup',
        [comp('cmp_postgresql'), comp('cmp_aurora'), comp('cmp_circuit_breaker')],
      );

      expect(result.constraintResult.passed).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('big blind requires more sophisticated combos than small blind', () => {
      const sc = scen('scenario_shortlink');
      expect(sc.phases[1].target_score).toBeGreaterThan(sc.phases[0].target_score);
      expect(sc.phases[1].capacity_budget).toBeLessThan(sc.phases[0].capacity_budget);
    });

    it('boss blind has the highest target and tightest budget', () => {
      const sc = scen('scenario_shortlink');
      expect(sc.phases[2].target_score).toBeGreaterThan(sc.phases[1].target_score);
      expect(sc.phases[2].capacity_budget).toBeLessThan(sc.phases[1].capacity_budget);
    });
  });

  // ── Capacity budget as a limiting factor ──────────────────────────

  describe('capacity budget balance', () => {
    it('a 5-component hand fits within small-blind startup budget', () => {
      // 5 cheap components
      const deployed = [
        comp('cmp_lambda'),      // cost 5
        comp('cmp_memcached'),   // cost 6
        comp('cmp_nginx'),       // cost 6
        comp('cmp_health_check'),// cost 4
        comp('cmp_grafana'),     // cost 5
      ];
      const totalCost = deployed.reduce((s, c) => s + c.capacity_cost, 0);
      // startup adds +20: budget = 110 + 20 = 130
      expect(totalCost).toBeLessThanOrEqual(130);

      const result = simulate(
        'scenario_shortlink', 0, 'school_startup',
        deployed,
      );
      expect(result.capacityUsed).toBeLessThanOrEqual(result.capacityBudget);
    });

    it('rare components are expensive and limit hand size', () => {
      // GPU(15) + Aurora(18) + DR(20) + Istio(16) = 69 -> boss budget 70 is tight
      const deployed = [
        comp('cmp_gpu'),
        comp('cmp_aurora'),
        comp('cmp_dr'),
        comp('cmp_istio'),
      ];
      const totalCost = deployed.reduce((s, c) => s + c.capacity_cost, 0);
      expect(totalCost).toBeGreaterThan(60);
    });

    it('performance school makes cache/edge-tagged components cheaper', () => {
      // CloudFront (edge, cache, cost=10) + Memcached (cache, cost=6) + Redis (cache, db, cost=10)
      const cacheComps = [comp('cmp_cloudfront'), comp('cmp_memcached'), comp('cmp_redis')];
      const startup = sch('school_startup');
      const perf = sch('school_performance');

      const startupRun = runPhase({
        phase: simplePhase(200, 0),
        deployed: cacheComps,
        school: startup,
        baseline: baseline(startup),
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      const perfRun = runPhase({
        phase: simplePhase(200, 0),
        deployed: cacheComps,
        school: perf,
        baseline: baseline(perf),
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      // Performance school discounts cache/edge tags at 0.7x
      expect(perfRun.capacityUsed).toBeLessThan(startupRun.capacityUsed);
    });
  });

  // ── Score ranges ──────────────────────────────────────────────────

  describe('score ranges', () => {
    it('bare minimum hand (1 cheap component) scores single digits', () => {
      const result = simpleRun([comp('cmp_grafana')]); // base_chips=2, no patterns
      expect(result.finalScore).toBeLessThanOrEqual(10);
    });

    it('a solid 2-component synergy reaches 50+', () => {
      // Redis + Kafka -> CQRS + many patterns
      const result = simpleRun([comp('cmp_redis'), comp('cmp_kafka')]);
      expect(result.finalScore).toBeGreaterThan(50);
    });

    it('a well-built 4-5 component hand with jokers can reach 200+', () => {
      // CloudFront(edge,cache) + Redis(cache,db) + Kafka(queue,async,realtime) + PostgreSQL(db)
      // + Worker(compute,async)
      // Patterns: CQRS, read_path, write_pipeline, event_driven, edge_accel, domain_pair, wide_spectrum, etc.
      const deployed = [
        comp('cmp_cloudfront'),
        comp('cmp_redis'),
        comp('cmp_kafka'),
        comp('cmp_postgresql'),
        comp('cmp_worker'),
      ];
      const jokers = [jk('jk_combo_king'), jk('jk_pattern_amp'), jk('jk_data_hoarder')];
      const result = simpleRun(deployed, jokers);

      expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(5);
      expect(result.finalScore).toBeGreaterThan(200);
    });

    it('super patterns can push scores even higher', () => {
      const deployed = [
        comp('cmp_redis'),
        comp('cmp_kafka'),
        comp('cmp_worker'),
      ];

      // Without super patterns
      const school = sch('school_startup');
      const withoutSP = runPhase({
        phase: simplePhase(200, 0),
        deployed,
        school,
        baseline: baseline(school),
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      const withSP = runPhase({
        phase: simplePhase(200, 0),
        deployed,
        school,
        baseline: baseline(school),
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
      });

      // With 4+ patterns, sp_full_stack (mult_add=8) should fire
      if (withSP.triggeredSuperPatterns.length > 0) {
        expect(withSP.finalScore).toBeGreaterThan(withoutSP.finalScore);
      }
    });
  });

  // ── Pattern chip/mult values ──────────────────────────────────────

  describe('pattern numerical values', () => {
    it('tier-1 patterns (domain_pair) give small bonuses', () => {
      const dp = data.patterns.find(p => p.id === 'p_domain_pair')!;
      expect(dp.effects.mult_add).toBeLessThanOrEqual(2);
      expect(dp.effects.chips_add).toBeLessThanOrEqual(10);
    });

    it('tier-2 tag patterns give moderate bonuses', () => {
      const tagPatterns = ['p_read_path', 'p_write_pipeline', 'p_fortress', 'p_edge_accel'];
      for (const id of tagPatterns) {
        const p = data.patterns.find(p => p.id === id)!;
        expect(p.effects.mult_add).toBeGreaterThanOrEqual(2);
        expect(p.effects.chips_add).toBeGreaterThanOrEqual(6);
      }
    });

    it('legendary patterns (CQRS, zero_downtime) give the largest bonuses', () => {
      const legendaries = ['p_cqrs', 'p_zero_downtime'];
      for (const id of legendaries) {
        const p = data.patterns.find(p => p.id === id)!;
        expect(p.effects.mult_add).toBeGreaterThanOrEqual(5);
        expect(p.effects.chips_add).toBeGreaterThanOrEqual(15);
      }
    });

    it('p_full_stack meta-pattern has the highest mult_add', () => {
      const fs = data.patterns.find(p => p.id === 'p_full_stack')!;
      const maxMult = Math.max(...data.patterns.filter(p => p.id !== 'p_full_stack').map(p => p.effects.mult_add));
      expect(fs.effects.mult_add).toBeGreaterThanOrEqual(maxMult);
    });
  });
});
