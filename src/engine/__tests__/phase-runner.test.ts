import { describe, it, expect } from 'vitest';
import { runPhase, type PhaseInput, type PhaseSettlement } from '../phase-runner.js';
import { loadGameData } from '../../data/loader.js';
import type { Component, Pattern, SuperPattern, Joker, Phase, School, BossRule } from '../../schemas/index.js';

const data = loadGameData();

// ── Lookup helpers ──────────────────────────────────────────────────

function comp(id: string): Component {
  const c = data.components.find(c => c.id === id);
  if (!c) throw new Error(`Component not found: ${id}`);
  return c;
}
function pat(id: string): Pattern {
  const p = data.patterns.find(p => p.id === id);
  if (!p) throw new Error(`Pattern not found: ${id}`);
  return p;
}
function joker(id: string): Joker {
  const j = data.jokers.find(j => j.id === id);
  if (!j) throw new Error(`Joker not found: ${id}`);
  return j;
}
function school(id: string): School {
  const s = data.schools.find(s => s.id === id);
  if (!s) throw new Error(`School not found: ${id}`);
  return s;
}
function bossRule(id: string): BossRule {
  const br = data.bossRules.find(br => br.id === id);
  if (!br) throw new Error(`BossRule not found: ${id}`);
  return br;
}

const DEFAULT_BASELINE = { perf: 2, rel: 2, cx: 2 };

// A simple small-blind phase with lenient constraints
const PHASE_SMALL: Phase = {
  blind: 'small',
  subtitle: 'Test Small Blind',
  capacity_budget: 110,
  target_score: 30,
  constraints: { constraint_penalty: 10 },
  skippable: true,
};

// A big-blind phase with tighter constraints
const PHASE_BIG: Phase = {
  blind: 'big',
  subtitle: 'Test Big Blind',
  capacity_budget: 90,
  target_score: 60,
  constraints: { min_perf: 4, min_rel: 3, constraint_penalty: 15 },
  skippable: true,
};

// A boss phase with min_domains + required_tags
const PHASE_BOSS: Phase = {
  blind: 'boss',
  subtitle: 'Test Boss Blind',
  capacity_budget: 70,
  target_score: 100,
  constraints: {
    min_perf: 5,
    min_rel: 4,
    min_domains: 3,
    constraint_penalty: 20,
  },
  skippable: false,
};

describe('phase-runner', () => {
  // ── Basic scoring ──────────────────────────────────────────────────

  describe('basic scoring (chips x mult - penalty)', () => {
    it('scores a single component with no patterns', () => {
      // EC2: base_chips=3, domain=compute, tags=[compute]
      const deployed = [comp('cmp_ec2')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      // chips = 3 (base) + 0 (pattern) + 0 (joker) = 3
      // mult = 1 (no patterns)
      // finalScore = round(3 * 1 - 0) = 3
      expect(result.baseChips).toBe(3);
      expect(result.patternChips).toBe(0);
      expect(result.jokerChips).toBe(0);
      expect(result.chips).toBe(3);
      expect(result.mult).toBe(1);
      expect(result.constraintPenalty).toBe(0);
      expect(result.finalScore).toBe(3);
    });

    it('accumulates base_chips from multiple components', () => {
      // EC2(3) + Lambda(2) + K8s Pod(4) = 9 base chips, all compute domain
      const deployed = [comp('cmp_ec2'), comp('cmp_lambda'), comp('cmp_k8s_pod')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.baseChips).toBe(3 + 2 + 4);
      // 3 compute-domain components triggers p_domain_triple (mult_add=3, chips_add=10)
      // also triggers p_domain_pair (mult_add=1, chips_add=5)
      expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(2);
    });

    it('final score formula is chips * mult - constraintPenalty', () => {
      const deployed = [comp('cmp_ec2')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.finalScore).toBe(
        Math.round(result.chips * result.mult - result.constraintPenalty - result.bossPenalty),
      );
    });
  });

  // ── Pattern detection ──────────────────────────────────────────────

  describe('pattern detection', () => {
    it('triggers p_read_path with cache + db tags', () => {
      // Redis (cache, db) + PostgreSQL (db) -> has cache + db -> p_read_path
      const deployed = [comp('cmp_redis'), comp('cmp_postgresql')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_read_path');
    });

    it('triggers p_write_pipeline with queue + db tags', () => {
      // Kafka (queue, async, realtime) + PostgreSQL (db) -> queue + db
      const deployed = [comp('cmp_kafka'), comp('cmp_postgresql')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_write_pipeline');
    });

    it('triggers p_domain_pair when 2 components share a domain', () => {
      // EC2 (compute) + Lambda (compute) -> 2 in same domain
      const deployed = [comp('cmp_ec2'), comp('cmp_lambda')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_domain_pair');
    });

    it('triggers p_domain_triple when 3 components share a domain', () => {
      // EC2 + Lambda + K8s Pod -> all compute
      const deployed = [comp('cmp_ec2'), comp('cmp_lambda'), comp('cmp_k8s_pod')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_domain_triple');
      expect(patternIds).toContain('p_domain_pair');
    });

    it('triggers p_wide_spectrum when 4+ distinct domains are present', () => {
      // EC2 (compute) + PostgreSQL (data) + Nginx (network) + Multi-AZ (defense)
      const deployed = [
        comp('cmp_ec2'),
        comp('cmp_postgresql'),
        comp('cmp_nginx'),
        comp('cmp_multi_az'),
      ];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_wide_spectrum');
    });

    it('triggers p_edge_accel with edge + cache tags', () => {
      // CloudFront CDN (edge, cache)
      const deployed = [comp('cmp_cloudfront')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_edge_accel');
    });

    it('triggers p_cqrs with db + queue + cache', () => {
      // Redis (cache, db) + Kafka (queue, async, realtime) -> db + queue + cache
      const deployed = [comp('cmp_redis'), comp('cmp_kafka')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      const patternIds = result.triggeredPatterns.map(p => p.id);
      expect(patternIds).toContain('p_cqrs');
    });

    it('adds pattern chips and mult to the score', () => {
      // p_read_path: mult_add=2, chips_add=8
      const deployed = [comp('cmp_redis'), comp('cmp_postgresql')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.patternChips).toBeGreaterThan(0);
      expect(result.mult).toBeGreaterThan(1);
      // chips = baseChips + patternChips + jokerChips
      expect(result.chips).toBe(result.baseChips + result.patternChips + result.jokerChips);
    });
  });

  // ── Joker activation ──────────────────────────────────────────────

  describe('joker activation', () => {
    it('activates jk_sla_maniac when ha tag is deployed', () => {
      // Multi-AZ (ha) should activate SLA Maniac (require_any_tags: ["ha"])
      const deployed = [comp('cmp_multi_az')];
      const startupSchool = school('school_startup');
      const jokers = [joker('jk_sla_maniac')];

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers,
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.activeJokers.map(j => j.id)).toContain('jk_sla_maniac');
      // SLA Maniac: mult effect value=1.3 (multiplicative)
      expect(result.mult).toBeGreaterThan(1);
    });

    it('does not activate jk_sla_maniac when no ha tag is deployed', () => {
      // EC2 (compute) has no ha tag
      const deployed = [comp('cmp_ec2')];
      const startupSchool = school('school_startup');
      const jokers = [joker('jk_sla_maniac')];

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers,
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.activeJokers.map(j => j.id)).not.toContain('jk_sla_maniac');
    });

    it('jk_data_hoarder adds chips per db-tagged component', () => {
      // PostgreSQL (db) + MySQL (db) = 2 db components, data_hoarder adds 3 per db
      const deployed = [comp('cmp_postgresql'), comp('cmp_mysql')];
      const startupSchool = school('school_startup');
      const jokers = [joker('jk_data_hoarder')];

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers,
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.activeJokers.map(j => j.id)).toContain('jk_data_hoarder');
      // 2 db components x 3 chips each = 6 joker chips
      expect(result.jokerChips).toBe(6);
    });

    it('jk_pattern_amp adds mult per triggered pattern', () => {
      // Redis (cache, db) + Kafka (queue, async, realtime)
      // Triggers: p_cqrs, p_read_path, p_write_pipeline, p_domain_pair, etc.
      const deployed = [comp('cmp_redis'), comp('cmp_kafka')];
      const startupSchool = school('school_startup');
      const jokers = [joker('jk_pattern_amp')];

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers,
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.activeJokers.map(j => j.id)).toContain('jk_pattern_amp');
      // pattern_amp adds 1 mult per pattern
      const patternCount = result.triggeredPatterns.length;
      expect(patternCount).toBeGreaterThanOrEqual(2);
      // mult should include patternCount extra from jk_pattern_amp
      expect(result.mult).toBeGreaterThan(1 + patternCount);
    });

    it('jk_combo_king activates multiplicative when 2+ patterns triggered', () => {
      // Redis + Kafka triggers multiple patterns
      const deployed = [comp('cmp_redis'), comp('cmp_kafka')];
      const startupSchool = school('school_startup');
      const jokersWithCombo = [joker('jk_combo_king')];

      const resultWith = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: jokersWithCombo,
        patterns: data.patterns,
        superPatterns: [],
      });

      const resultWithout = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(resultWith.triggeredPatterns.length).toBeGreaterThanOrEqual(2);
      expect(resultWith.activeJokers.map(j => j.id)).toContain('jk_combo_king');
      // combo_king x1.5 multiplier
      expect(resultWith.finalScore).toBeGreaterThan(resultWithout.finalScore);
    });

    it('jk_minimalist activates only when <=3 components deployed', () => {
      const deployed3 = [comp('cmp_ec2'), comp('cmp_redis'), comp('cmp_nginx')];
      const deployed4 = [...deployed3, comp('cmp_multi_az')];
      const startupSchool = school('school_startup');
      const jokers = [joker('jk_minimalist')];

      const result3 = runPhase({
        phase: PHASE_SMALL,
        deployed: deployed3,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers,
        patterns: data.patterns,
        superPatterns: [],
      });

      const result4 = runPhase({
        phase: PHASE_SMALL,
        deployed: deployed4,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers,
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result3.activeJokers.map(j => j.id)).toContain('jk_minimalist');
      expect(result4.activeJokers.map(j => j.id)).not.toContain('jk_minimalist');
    });

    it('jk_gold_mine earns gold per pattern', () => {
      const deployed = [comp('cmp_redis'), comp('cmp_kafka')];
      const startupSchool = school('school_startup');
      const jokers = [joker('jk_gold_mine')];

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers,
        patterns: data.patterns,
        superPatterns: [],
      });

      // gold_mine: 5 gold per pattern
      const patternCount = result.triggeredPatterns.length;
      expect(result.jokerGold).toBe(5 * patternCount);
    });
  });

  // ── Constraint penalties ──────────────────────────────────────────

  describe('constraint penalties', () => {
    it('applies constraint_penalty when min_perf is not met', () => {
      // Deploy something with low perf delta against a phase requiring min_perf=4
      // Lambda (perf delta: 0) -> baseline 2, panel perf = 2, needed 4
      const deployed = [comp('cmp_lambda')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_BIG,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.constraintResult.passed).toBe(false);
      expect(result.constraintPenalty).toBeGreaterThan(0);
      expect(result.constraintResult.failures.length).toBeGreaterThan(0);
    });

    it('no penalty when all constraints are satisfied', () => {
      // Deploy components that give high perf/rel
      // K8s Pod (perf+1,rel+1), GPU (perf+3), Aurora (perf+2,rel+2)
      const deployed = [comp('cmp_k8s_pod'), comp('cmp_gpu'), comp('cmp_aurora')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_BIG, // min_perf: 4, min_rel: 3
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      // perf = 2 + 1 + 3 + 2 = 8, rel = 2 + 1 + 0 + 2 = 5
      expect(result.constraintResult.passed).toBe(true);
      expect(result.constraintPenalty).toBe(0);
    });

    it('applies per-failure penalty for required_tags', () => {
      // Phase requires security tag but we deploy without it
      const phaseWithTags: Phase = {
        blind: 'boss',
        subtitle: 'Test Required Tags',
        capacity_budget: 100,
        target_score: 50,
        constraints: {
          required_tags: ['security', 'monitor'],
          constraint_penalty: 20,
        },
        skippable: false,
      };

      // EC2 has no security or monitor tags
      const deployed = [comp('cmp_ec2')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: phaseWithTags,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      // 2 missing tags x 20 penalty each = 40
      expect(result.constraintPenalty).toBe(40);
      expect(result.constraintResult.failures).toHaveLength(2);
    });

    it('penalty subtracts from finalScore', () => {
      const phaseStrict: Phase = {
        blind: 'big',
        subtitle: 'Strict',
        capacity_budget: 100,
        target_score: 50,
        constraints: { min_perf: 10, constraint_penalty: 100 },
        skippable: false,
      };

      const deployed = [comp('cmp_ec2')]; // perf = 2+1 = 3, way below 10
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: phaseStrict,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.constraintPenalty).toBe(100);
      // finalScore = chips * mult - 100
      expect(result.finalScore).toBe(
        Math.round(result.chips * result.mult - 100),
      );
    });
  });

  // ── School modifiers ──────────────────────────────────────────────

  describe('school modifiers', () => {
    it('startup school adds +20 capacity_budget_offset', () => {
      const deployed = [comp('cmp_ec2')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL, // budget=110
        deployed,
        school: startupSchool, // offset=+20
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.capacityBudget).toBe(110 + 20);
    });

    it('minimalist school subtracts capacity with offset=-30', () => {
      const deployed = [comp('cmp_ec2')];
      const minimalistSchool = school('school_minimalist');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: minimalistSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.capacityBudget).toBe(110 - 30);
    });

    it('performance school discounts capacity for cache-tagged components', () => {
      // Memcached: cost=6, tags=[cache] -> performance discount 0.7 -> ceil(4.2)=5
      const deployed = [comp('cmp_memcached')];
      const perfSchool = school('school_performance');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: perfSchool,
        baseline: { perf: 2, rel: 1, cx: 2 }, // perf school baseline_overrides: rel=1
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      // Performance school discounts cache tag: 6 * 0.7 = 4.2 -> ceil = 5
      expect(result.capacityUsed).toBe(5);
    });
  });

  // ── Super patterns ────────────────────────────────────────────────

  describe('super patterns', () => {
    it('triggers sp_full_stack when 3+ patterns are triggered', () => {
      // Redis + Kafka triggers: p_cqrs, p_read_path, p_write_pipeline, p_domain_pair, p_event_driven
      const deployed = [comp('cmp_redis'), comp('cmp_kafka')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
      });

      expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(3);
      const spIds = result.triggeredSuperPatterns.map(sp => sp.id);
      expect(spIds).toContain('sp_full_stack');
    });

    it('super pattern rewards affect scoring', () => {
      const deployed = [comp('cmp_redis'), comp('cmp_kafka')];
      const startupSchool = school('school_startup');

      const resultWith = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
      });

      const resultWithout = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      // sp_full_stack adds mult_add=8, should boost the score
      expect(resultWith.finalScore).toBeGreaterThan(resultWithout.finalScore);
    });
  });

  // ── Boss rule interaction ─────────────────────────────────────────

  describe('boss rule integration', () => {
    it('boss_cache_disabled doubles capacity cost for cache-tagged components', () => {
      // Redis: cost=10, has cache tag -> doubled to 20
      const deployed = [comp('cmp_redis')];
      const startupSchool = school('school_startup');

      const resultBoss = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
        bossRule: bossRule('boss_cache_disabled'),
      });

      const resultNoBoss = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(resultBoss.capacityUsed).toBeGreaterThan(resultNoBoss.capacityUsed);
      expect(resultBoss.bossEffects?.capacityMultiplierForTags).toBeDefined();
    });

    it('boss_budget_halved halves the effective capacity budget', () => {
      const deployed = [comp('cmp_ec2')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
        bossRule: bossRule('boss_budget_halved'),
      });

      // budget = floor((110 + 20) * 0.5) = 65
      expect(result.capacityBudget).toBe(Math.floor((110 + 20) * 0.5));
    });
  });

  // ── Passed/failed determination ───────────────────────────────────

  describe('passed determination', () => {
    it('passes when finalScore >= targetScore', () => {
      const easyPhase: Phase = {
        blind: 'small',
        subtitle: 'Easy',
        capacity_budget: 200,
        target_score: 1,
        constraints: { constraint_penalty: 0 },
        skippable: true,
      };

      const deployed = [comp('cmp_gpu')]; // base_chips=5
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: easyPhase,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.finalScore).toBeGreaterThanOrEqual(1);
      expect(result.passed).toBe(true);
    });

    it('fails when finalScore < targetScore', () => {
      const hardPhase: Phase = {
        blind: 'boss',
        subtitle: 'Impossible',
        capacity_budget: 200,
        target_score: 99999,
        constraints: { constraint_penalty: 0 },
        skippable: false,
      };

      const deployed = [comp('cmp_ec2')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: hardPhase,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: [],
      });

      expect(result.finalScore).toBeLessThan(99999);
      expect(result.passed).toBe(false);
    });
  });

  // ── Return shape completeness ─────────────────────────────────────

  describe('settlement shape', () => {
    it('returns all required fields in PhaseSettlement', () => {
      const deployed = [comp('cmp_ec2'), comp('cmp_redis')];
      const startupSchool = school('school_startup');

      const result = runPhase({
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [joker('jk_data_hoarder')],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
      });

      expect(result).toHaveProperty('deployedComponents');
      expect(result).toHaveProperty('deployedTags');
      expect(result).toHaveProperty('capacityUsed');
      expect(result).toHaveProperty('capacityBudget');
      expect(result).toHaveProperty('panel');
      expect(result).toHaveProperty('triggeredPatterns');
      expect(result).toHaveProperty('triggeredSuperPatterns');
      expect(result).toHaveProperty('superPatternRewards');
      expect(result).toHaveProperty('activeJokers');
      expect(result).toHaveProperty('baseChips');
      expect(result).toHaveProperty('patternChips');
      expect(result).toHaveProperty('jokerChips');
      expect(result).toHaveProperty('chips');
      expect(result).toHaveProperty('mult');
      expect(result).toHaveProperty('constraintResult');
      expect(result).toHaveProperty('constraintPenalty');
      expect(result).toHaveProperty('bossPenalty');
      expect(result).toHaveProperty('jokerGold');
      expect(result).toHaveProperty('finalScore');
      expect(result).toHaveProperty('targetScore');
      expect(result).toHaveProperty('passed');

      expect(result.constraintResult).toHaveProperty('passed');
      expect(result.constraintResult).toHaveProperty('penalty');
      expect(result.constraintResult).toHaveProperty('failures');
      expect(Array.isArray(result.deployedTags)).toBe(true);
      expect(Array.isArray(result.triggeredPatterns)).toBe(true);
      expect(Array.isArray(result.activeJokers)).toBe(true);
    });
  });
});
