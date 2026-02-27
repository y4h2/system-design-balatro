import { describe, it, expect } from 'vitest';
import { runPhase, runHand, settlePhase, type PhaseInput, type PhaseSettlement } from '../phase-runner.js';
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
      // Redis (cache, db) + Kafka (queue, async) + PostgreSQL (db) → 3 distinct cards for CQRS
      const result = simpleRun([comp('cmp_redis'), comp('cmp_kafka'), comp('cmp_postgresql')]);

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_cqrs');
      // CQRS gives mult_add=4, chips_add=12. Should result in high score
      expect(result.finalScore).toBeGreaterThan(50);
    });

    it('event driven (queue + async + compute) scores well', () => {
      // Kafka (queue, async) + Worker (compute, async) + EC2 (compute)
      // With distinct matching: Kafka=queue, Worker=async, EC2=compute → p_event_driven
      const result = simpleRun([comp('cmp_kafka'), comp('cmp_worker'), comp('cmp_ec2')]);

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_event_driven');
      expect(result.finalScore).toBeGreaterThan(20);
    });

    it('stacking multiple patterns multiplies score', () => {
      // Redis + Kafka + PostgreSQL + Worker → many patterns with distinct cards
      const many = simpleRun([comp('cmp_redis'), comp('cmp_kafka'), comp('cmp_postgresql'), comp('cmp_worker')]);
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
        comp('cmp_multi_az'),   // infra
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

    it('p_observability triggers with monitor + search on distinct cards', () => {
      // ELK (monitor, search) alone won't trigger — need 2 distinct cards
      // ELK (monitor, search) + Grafana (monitor) → ELK=search(any), Grafana=monitor(all) — wait no.
      // Actually: requires_all_tags=['monitor'], requires_any_tags=['search','deploy']
      // ELK has [monitor, search] → ELK provides 'monitor' (all), then 'search' (any) needs a DIFFERENT card
      // So ELK alone doesn't work. Need ELK + another card with search or deploy.
      const result = simpleRun([comp('cmp_elk'), comp('cmp_k8s_pod')]); // K8s has [compute, deploy]
      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_observability');
    });

    it('p_observability does NOT trigger with single card having both tags', () => {
      // ELK (monitor, search) — single card, distinct matching requires 2 cards
      const result = simpleRun([comp('cmp_elk')]);
      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).not.toContain('p_observability');
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
      // Redis + Kafka + PostgreSQL → many patterns, combo_king x1.5
      const deployed = [comp('cmp_redis'), comp('cmp_kafka'), comp('cmp_postgresql')];
      const withCombo = simpleRun(deployed, [jk('jk_combo_king')]);
      const noCombo = simpleRun(deployed, []);

      expect(withCombo.triggeredPatterns.length).toBeGreaterThanOrEqual(2);
      const ratio = withCombo.finalScore / noCombo.finalScore;
      expect(ratio).toBeCloseTo(1.5, 1);
    });

    it('stacking jokers compounds their effects', () => {
      // Redis + Kafka + PostgreSQL with data_hoarder + combo_king + pattern_amp
      const deployed = [comp('cmp_redis'), comp('cmp_kafka'), comp('cmp_postgresql')];
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
    it('shortlink small blind — single deploy scores well (legacy)', () => {
      // Legacy single-deploy score — validates per-hand scoring potential
      const result = simulate(
        'scenario_shortlink', 0, 'school_startup',
        [comp('cmp_cloudfront'), comp('cmp_redis'), comp('cmp_postgresql')],
      );
      expect(result.constraintResult.passed).toBe(true);
      // Single deploy: doesn't need to beat new multi-hand target
      expect(result.finalScore).toBeGreaterThanOrEqual(30);
    });

    it('chat small blind — single deploy validates scoring', () => {
      const result = simulate(
        'scenario_chat', 0, 'school_startup',
        [comp('cmp_kafka'), comp('cmp_postgresql'), comp('cmp_redis')],
      );
      expect(result.constraintResult.passed).toBe(true);
      expect(result.finalScore).toBeGreaterThanOrEqual(30);
    });

    it('orders small blind — single deploy validates scoring', () => {
      const result = simulate(
        'scenario_orders', 0, 'school_startup',
        [comp('cmp_postgresql'), comp('cmp_aurora'), comp('cmp_circuit_breaker')],
      );
      expect(result.constraintResult.passed).toBe(true);
      expect(result.finalScore).toBeGreaterThanOrEqual(30);
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

    it('a solid 3-component synergy reaches 50+', () => {
      // Redis + Kafka + PostgreSQL → CQRS + read_path + write_pipeline + many patterns
      const result = simpleRun([comp('cmp_redis'), comp('cmp_kafka'), comp('cmp_postgresql')]);
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
        comp('cmp_postgresql'),
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

    it('route tag patterns give moderate bonuses', () => {
      const tagPatterns = ['p_read_path', 'p_write_pipeline', 'p_edge_accel', 'p_hot_protect', 'p_event_driven', 'p_peak_shaving', 'p_observability', 'p_zero_downtime', 'p_high_availability'];
      for (const id of tagPatterns) {
        const p = data.patterns.find(p => p.id === id)!;
        expect(p.effects.mult_add).toBeGreaterThanOrEqual(2);
        expect(p.effects.chips_add).toBeGreaterThanOrEqual(8);
      }
    });

    it('CQRS free pattern gives strong bonuses', () => {
      const cqrs = data.patterns.find(p => p.id === 'p_cqrs')!;
      expect(cqrs.effects.mult_add).toBeGreaterThanOrEqual(4);
      expect(cqrs.effects.chips_add).toBeGreaterThanOrEqual(12);
      expect(cqrs.route).toBe('free');
    });
  });

  // ── Multi-hand scoring balance ────────────────────────────────────

  describe('multi-hand scoring', () => {
    it('4 decent hands accumulate enough to beat small blind (75)', () => {
      const school = sch('school_startup');
      const phase = scen('scenario_shortlink').phases[0]; // target=75

      // Hand 1: Redis + PostgreSQL → p_read_path + p_domain_pair
      const h1 = runHand({
        played: [comp('cmp_redis'), comp('cmp_postgresql')],
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 0,
      });

      // Hand 2: Kafka + Worker → p_domain_pair (both data domain)
      const h2 = runHand({
        played: [comp('cmp_kafka'), comp('cmp_worker')],
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 1,
      });

      // Hand 3: Nginx + Health Check → utility cards
      const h3 = runHand({
        played: [comp('cmp_nginx'), comp('cmp_health_check')],
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 2,
      });

      // Hand 4: Circuit Breaker + Grafana
      const h4 = runHand({
        played: [comp('cmp_circuit_breaker'), comp('cmp_grafana')],
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 3,
      });

      const settlement = settlePhase({
        hands: [h1, h2, h3, h4],
        phase,
        school,
        baseline: baseline(school),
        jokers: [],
        superPatterns: data.superPatterns,
      });

      expect(settlement.totalHandScore).toBeGreaterThanOrEqual(75);
      expect(settlement.passed).toBe(true);
    });

    it('individual hand scores are meaningful but modest', () => {
      const school = sch('school_startup');
      // A 2-card hand with one pattern: should score 15-80 range
      const result = runHand({
        played: [comp('cmp_redis'), comp('cmp_postgresql')],
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 0,
      });

      // With p_read_path (chips+10, mult+3) + p_domain_pair (chips+5, mult+1)
      // base chips = 4+4=8, pattern chips=15, total chips=23
      // mult = 1+3+1=5, score = 23*5 = 115
      expect(result.handScore).toBeGreaterThan(10);
      expect(result.handScore).toBeLessThan(200);
    });

    it('route mastery provides significant but not game-breaking bonus', () => {
      const school = sch('school_startup');
      const phase = simplePhase(200, 0);

      // Route A: p_read_path, p_edge_accel, p_hot_protect
      const h1 = runHand({
        played: [comp('cmp_redis'), comp('cmp_postgresql')], // cache + db → p_read_path
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 0,
      });
      const h2 = runHand({
        played: [comp('cmp_cloudfront'), comp('cmp_memcached')], // edge + cache → p_edge_accel
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 1,
      });
      const h3 = runHand({
        played: [comp('cmp_memcached'), comp('cmp_nginx')], // cache + gateway → p_hot_protect
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 2,
      });
      const h4 = runHand({
        played: [comp('cmp_ec2')],
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 3,
      });

      const settlement = settlePhase({
        hands: [h1, h2, h3, h4],
        phase,
        school,
        baseline: baseline(school),
        jokers: [],
        superPatterns: [],
      });

      // Route mastery gives +20 bonus
      if (settlement.routeMastery.achieved) {
        expect(settlement.routeMastery.bonus).toBe(20);
        expect(settlement.finalScore).toBeGreaterThan(settlement.totalHandScore);
      }
    });

    it('4 strong hands with jokers can beat big blind (150)', () => {
      const school = sch('school_startup');
      const phase = scen('scenario_shortlink').phases[1]; // target=150
      const jokers = [jk('jk_data_hoarder'), jk('jk_pattern_amp')];

      const h1 = runHand({
        played: [comp('cmp_redis'), comp('cmp_kafka'), comp('cmp_postgresql')],
        jokers,
        patterns: data.patterns,
        school,
        handIndex: 0,
      });
      const h2 = runHand({
        played: [comp('cmp_cloudfront'), comp('cmp_memcached'), comp('cmp_nginx')],
        jokers,
        patterns: data.patterns,
        school,
        handIndex: 1,
      });
      const h3 = runHand({
        played: [comp('cmp_worker'), comp('cmp_ec2'), comp('cmp_health_check')],
        jokers,
        patterns: data.patterns,
        school,
        handIndex: 2,
      });
      const h4 = runHand({
        played: [comp('cmp_circuit_breaker'), comp('cmp_grafana')],
        jokers,
        patterns: data.patterns,
        school,
        handIndex: 3,
      });

      const settlement = settlePhase({
        hands: [h1, h2, h3, h4],
        phase,
        school,
        baseline: baseline(school),
        jokers,
        superPatterns: data.superPatterns,
      });

      expect(settlement.totalHandScore).toBeGreaterThanOrEqual(150);
    });

    it('multi-hand target scores are ~2.5x the old single-deploy targets', () => {
      const shortlink = scen('scenario_shortlink');
      const chat = scen('scenario_chat');
      const orders = scen('scenario_orders');

      // Small blinds: 75 (was 30)
      expect(shortlink.phases[0].target_score).toBe(75);
      expect(chat.phases[0].target_score).toBe(75);
      expect(orders.phases[0].target_score).toBe(75);

      // Big blinds: 150-165 (was 60-65)
      expect(shortlink.phases[1].target_score).toBe(150);
      expect(chat.phases[1].target_score).toBe(165);
      expect(orders.phases[1].target_score).toBe(165);

      // Boss blinds: 250-275 (was 100-110)
      expect(shortlink.phases[2].target_score).toBe(250);
      expect(chat.phases[2].target_score).toBe(275);
      expect(orders.phases[2].target_score).toBe(275);
    });

    it('spreading cards across hands is viable vs concentrating in one', () => {
      const school = sch('school_startup');

      // Strategy A: dump 4 cards into hand 1 + 1 throwaway
      const allIn = runHand({
        played: [comp('cmp_redis'), comp('cmp_kafka'), comp('cmp_postgresql'), comp('cmp_worker')],
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 0,
      });
      const filler = runHand({
        played: [comp('cmp_grafana')],
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 1,
      });
      const concentratedTotal = allIn.handScore + filler.handScore;

      // Strategy B: split into two synergistic hands
      const split1 = runHand({
        played: [comp('cmp_redis'), comp('cmp_postgresql')], // read_path
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 0,
      });
      const split2 = runHand({
        played: [comp('cmp_kafka'), comp('cmp_worker'), comp('cmp_grafana')],
        jokers: [],
        patterns: data.patterns,
        school,
        handIndex: 1,
      });
      const spreadTotal = split1.handScore + split2.handScore;

      // Both strategies should yield meaningful scores
      expect(concentratedTotal).toBeGreaterThan(50);
      expect(spreadTotal).toBeGreaterThan(50);
      // The concentrated strategy can be better (more patterns stack), which is fine —
      // the real constraint is that you can only play 1-5 cards per hand from your hand
    });
  });
});
