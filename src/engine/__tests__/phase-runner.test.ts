import { describe, it, expect } from 'vitest';
import { runPhase, type PhaseInput, type PhaseSettlement } from '../phase-runner.js';
import { loadGameData } from '../../data/loader.js';
import type { Component, Pattern, SuperPattern, Joker, Event, Phase, School, BossRule } from '../../schemas/index.js';

const data = loadGameData();

// Helpers to look up game data by ID
function comp(id: string): Component {
  return data.components.find(c => c.id === id)!;
}
function pattern(id: string): Pattern {
  return data.patterns.find(p => p.id === id)!;
}
function event(id: string): Event {
  return data.events.find(e => e.id === id)!;
}
function joker(id: string): Joker {
  return data.jokers.find(j => j.id === id)!;
}
function school(id: string): School {
  return data.schools.find(s => s.id === id)!;
}
function bossRule(id: string): BossRule {
  return data.bossRules.find(br => br.id === id)!;
}

const DEFAULT_BASELINE = { perf: 2, rel: 2, cx: 2 };

const PHASE_SMALL: Phase = {
  blind: 'small',
  subtitle: 'MVP',
  capacity_budget: 110,
  target_score: 12,
  weights: { perf: 1.0, rel: 0.6, cx: 0.4 },
  constraints: { sla: 99.0, compliance_level: 'low' },
  event_pool_severity: [1, 2],
  skippable: true,
};

describe('phase-runner', () => {
  describe('basic phase with CDN + Cache + SQL DB (Read Beast pattern)', () => {
    it('triggers Read Beast pattern and computes correct settlement', () => {
      const deployed = [comp('cmp_cdn'), comp('cmp_cache'), comp('cmp_sql_db')];
      const startupSchool = school('school_startup');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      // CDN tags: cdn, edge; Cache tags: cache; SQL DB tags: db, sql, primary_db
      expect(result.deployedTags).toEqual(
        expect.arrayContaining(['cdn', 'edge', 'cache', 'db', 'sql', 'primary_db']),
      );

      // Read Beast: requires_all_tags=["cache"], requires_any_tags=["cdn","read_replica"]
      // Deployed has cache AND cdn -> triggers
      expect(result.triggeredPatterns.map(p => p.id)).toContain('pattern_read_beast');

      // Capacity: CDN=8, Cache=15, SQL=20 = 43, budget = 110 + 20 (startup offset) = 130
      expect(result.capacityUsed).toBe(43);
      expect(result.capacityBudget).toBe(130);

      // No events -> no event penalties
      expect(result.eventResults).toHaveLength(0);

      // Panel computation:
      // baseline = {2,2,2}
      // CDN delta: {2,0,0}, Cache delta: {3,0,1}, SQL delta: {1,1,1}
      // pattern Read Beast delta: {1,0,0}
      // sum: perf=2+2+3+1+1=9, rel=2+0+0+1=3, cx=2+0+1+1=4
      expect(result.panel).toEqual({ perf: 9, rel: 3, cx: 4 });

      // Chips = 1.0*9 + 0.6*3 - 0.4*4 = 9 + 1.8 - 1.6 = 9.2
      expect(result.chips).toBeCloseTo(9.2);

      // Mult = (1 + 2) = 3, no jokers
      expect(result.mult).toBeCloseTo(3);

      // Constraint penalty: SLA 99.0 with rel=3 -> no penalty (rel >= 3)
      expect(result.constraintPenalty).toBe(0);

      // Final = round(9.2 * 3 - 0) = round(27.6) = 28
      expect(result.finalScore).toBe(28);
      expect(result.targetScore).toBe(12);
      expect(result.passed).toBe(true);
    });
  });

  describe('phase with no patterns triggered', () => {
    it('produces settlement with empty patterns and base mult', () => {
      // Deploy only API Gateway - tags: ["gateway"]
      // No pattern requires only gateway
      const deployed = [comp('cmp_api_gw')];
      const startupSchool = school('school_startup');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      expect(result.triggeredPatterns).toHaveLength(0);
      expect(result.triggeredSuperPatterns).toHaveLength(0);

      // Panel: baseline {2,2,2} + api_gw delta {0,1,1} = {2,3,3}
      expect(result.panel).toEqual({ perf: 2, rel: 3, cx: 3 });

      // Chips = 1.0*2 + 0.6*3 - 0.4*3 = 2 + 1.8 - 1.2 = 2.6
      expect(result.chips).toBeCloseTo(2.6);

      // Mult = 1 (no patterns, no super patterns, no jokers)
      expect(result.mult).toBe(1);

      // Final = round(2.6 * 1 - 0) = 3
      expect(result.finalScore).toBe(3);
    });
  });

  describe('phase with event hitting exposed risk', () => {
    it('applies event penalty when risk is exposed', () => {
      // SQL DB exposes "db_single_point" and "slow_query"
      // event_db_slow targets: ["slow_query", "db_single_point", "replication_lag"]
      const deployed = [comp('cmp_sql_db')];
      const startupSchool = school('school_startup');
      const dbSlowEvent = event('event_db_slow');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [dbSlowEvent],
      };

      const result = runPhase(input);

      // Risk: SQL DB exposes db_single_point, slow_query; seals nothing
      expect(result.riskReport.exposed).toEqual(
        expect.arrayContaining(['db_single_point', 'slow_query']),
      );

      // Event should hit
      expect(result.eventResults).toHaveLength(1);
      expect(result.eventResults[0].hit).toBe(true);
      expect(result.eventResults[0].matchedRisks).toEqual(
        expect.arrayContaining(['slow_query', 'db_single_point']),
      );

      // Event penalty: { perf: -3, rel: -2, cx: 1 }
      // Panel: baseline {2,2,2} + SQL delta {1,1,1} + event penalty {-3,-2,1}
      // = {0, 1, 4}
      expect(result.panel).toEqual({ perf: 0, rel: 1, cx: 4 });

      // Chips = 1.0*0 + 0.6*1 - 0.4*4 = 0 + 0.6 - 1.6 = -1.0
      expect(result.chips).toBeCloseTo(-1.0);

      // Final score is negative
      expect(result.finalScore).toBeLessThan(0);
    });
  });

  describe('phase with sealed risk -> event misses', () => {
    it('does not apply event penalty when risk is sealed', () => {
      // SQL DB exposes "db_single_point", "slow_query"
      // DB Sharding seals "db_single_point" (requires primary_db which SQL has)
      // event_traffic_spike targets: ["gateway_bottleneck", "db_single_point", "slow_query"]
      const deployed = [comp('cmp_sql_db'), comp('cmp_sharding')];
      const startupSchool = school('school_startup');
      // Use traffic spike event - it targets db_single_point (sealed) and slow_query (exposed)
      const trafficSpike = event('event_traffic_spike');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [trafficSpike],
      };

      const result = runPhase(input);

      // Sharding seals db_single_point
      expect(result.riskReport.sealed).toContain('db_single_point');
      // slow_query is still exposed
      expect(result.riskReport.exposed).toContain('slow_query');
      // db_single_point is not in exposed
      expect(result.riskReport.exposed).not.toContain('db_single_point');

      // Event still hits because slow_query is exposed
      expect(result.eventResults[0].hit).toBe(true);
      expect(result.eventResults[0].matchedRisks).toContain('slow_query');
      // But db_single_point is NOT in matched risks since it's sealed
      expect(result.eventResults[0].matchedRisks).not.toContain('db_single_point');
    });
  });

  describe('phase with event fully sealed -> event misses', () => {
    it('event does not hit when all targeted risks are sealed', () => {
      // Cache exposes "cache_avalanche", "data_inconsistency"
      // Cache Warm-up seals "cache_avalanche" (requires cache tag)
      // Consistency Checker seals "data_inconsistency", "replication_lag"
      // event_hot_key targets: ["cache_avalanche", "data_inconsistency"]
      const deployed = [
        comp('cmp_cache'),
        comp('cmp_cache_warmup'),
        comp('cmp_consistency_checker'),
      ];
      const startupSchool = school('school_startup');
      const hotKeyEvent = event('event_hot_key');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [hotKeyEvent],
      };

      const result = runPhase(input);

      // cache_avalanche is sealed by cache_warmup
      expect(result.riskReport.sealed).toContain('cache_avalanche');
      // data_inconsistency is sealed by consistency_checker
      expect(result.riskReport.sealed).toContain('data_inconsistency');

      // Event should NOT hit
      expect(result.eventResults[0].hit).toBe(false);
      expect(result.eventResults[0].matchedRisks).toHaveLength(0);
    });
  });

  describe('phase with Joker activation', () => {
    it('activates joker when tag conditions are met', () => {
      // jk_hotspot_tamer: require_all_tags=["cache"], require_any_tags=["cdn"]
      // multiplier: 1.2
      const deployed = [comp('cmp_cdn'), comp('cmp_cache'), comp('cmp_sql_db')];
      const startupSchool = school('school_startup');
      const hotspotTamer = joker('jk_hotspot_tamer');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [hotspotTamer],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      expect(result.activeJokers.map(j => j.id)).toContain('jk_hotspot_tamer');
      expect(result.jokerMultipliers).toContain(1.2);

      // Read Beast triggers with mult_add=2
      // Mult = (1 + 2) * 1.2 = 3.6
      expect(result.mult).toBeCloseTo(3.6);
    });
  });

  describe('phase that passes target score', () => {
    it('marks passed=true when finalScore >= targetScore', () => {
      // CDN + Cache + SQL -> Read Beast pattern with good score
      const deployed = [comp('cmp_cdn'), comp('cmp_cache'), comp('cmp_sql_db')];
      const startupSchool = school('school_startup');

      const lowTargetPhase: Phase = {
        ...PHASE_SMALL,
        target_score: 10, // easy target
      };

      const input: PhaseInput = {
        phase: lowTargetPhase,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      expect(result.finalScore).toBeGreaterThanOrEqual(10);
      expect(result.passed).toBe(true);
      expect(result.targetScore).toBe(10);
    });
  });

  describe('phase that fails target score', () => {
    it('marks passed=false when finalScore < targetScore', () => {
      // Minimal deployment with high target
      const deployed = [comp('cmp_api_gw')];
      const startupSchool = school('school_startup');

      const highTargetPhase: Phase = {
        ...PHASE_SMALL,
        target_score: 100, // impossibly high
      };

      const input: PhaseInput = {
        phase: highTargetPhase,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      expect(result.finalScore).toBeLessThan(100);
      expect(result.passed).toBe(false);
    });
  });

  describe('super pattern: pattern_count', () => {
    it('triggers sp_full_stack when 3+ patterns are triggered', () => {
      // We need 3 patterns simultaneously:
      // Read Beast: cache + (cdn or read_replica) -> CDN + Cache
      // Shock Absorber: rate_limit + queue + worker -> Rate Limiter + Queue + Worker
      // Debug Loop: metrics + tracing + alerting -> Observability Stack
      const deployed = [
        comp('cmp_cdn'),
        comp('cmp_cache'),
        comp('cmp_rate_limit'),
        comp('cmp_queue'),
        comp('cmp_worker'),
        comp('cmp_observability'),
      ];
      const startupSchool = school('school_startup');

      const input: PhaseInput = {
        phase: { ...PHASE_SMALL, capacity_budget: 200 },
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      // Should trigger Read Beast, Shock Absorber, Debug Loop = 3 patterns
      expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(3);
      expect(result.triggeredPatterns.map(p => p.id)).toEqual(
        expect.arrayContaining([
          'pattern_read_beast',
          'pattern_shock_absorber',
          'pattern_debug_loop',
        ]),
      );

      // sp_full_stack requires pattern_count >= 3 -> should trigger
      expect(result.triggeredSuperPatterns.map(sp => sp.id)).toContain('sp_full_stack');
    });
  });

  describe('super pattern: risk_and_pattern', () => {
    it('triggers sp_edge_dancer when patterns + exposed risks >= 3', () => {
      // Need >= 1 pattern + >= 3 exposed risks
      // CDN + Cache + SQL DB:
      //   Pattern: Read Beast
      //   Exposed risks: cache_invalidation, cache_avalanche, data_inconsistency,
      //                  db_single_point, slow_query (5 exposed risks)
      const deployed = [comp('cmp_cdn'), comp('cmp_cache'), comp('cmp_sql_db')];
      const startupSchool = school('school_startup');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(1);
      expect(result.riskReport.exposed.length).toBeGreaterThanOrEqual(3);

      // sp_edge_dancer: min_patterns=1, min_exposed_risks=3
      expect(result.triggeredSuperPatterns.map(sp => sp.id)).toContain('sp_edge_dancer');
    });
  });

  describe('super pattern: budget_and_pattern', () => {
    it('triggers sp_minimalist when patterns + budget usage <= 60%', () => {
      // Need >= 1 pattern + usage <= 60% of budget
      // Use a large budget phase so that CDN+Cache+SQL (43 cost) is < 60%
      // Budget needs to be > 43/0.6 = ~72
      const deployed = [comp('cmp_cdn'), comp('cmp_cache'), comp('cmp_sql_db')];
      const startupSchool = school('school_startup');

      const bigBudgetPhase: Phase = {
        ...PHASE_SMALL,
        capacity_budget: 200, // +20 startup offset = 220, 43/220 = ~19.5%
      };

      const input: PhaseInput = {
        phase: bigBudgetPhase,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(1);
      const usagePercent = (result.capacityUsed / result.capacityBudget) * 100;
      expect(usagePercent).toBeLessThanOrEqual(60);

      // sp_minimalist: min_patterns=1, max_budget_usage_percent=60
      expect(result.triggeredSuperPatterns.map(sp => sp.id)).toContain('sp_minimalist');
    });
  });

  describe('school modifiers', () => {
    it('applies capacity_budget_offset from school', () => {
      const deployed = [comp('cmp_api_gw')];
      const startupSchool = school('school_startup'); // offset = +20

      const input: PhaseInput = {
        phase: PHASE_SMALL, // budget = 110
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      // Effective budget = 110 + 20 = 130
      expect(result.capacityBudget).toBe(130);
    });

    it('applies cx_as_positive from minimalist school', () => {
      const deployed = [comp('cmp_cdn'), comp('cmp_cache'), comp('cmp_sql_db')];
      const minimalistSchool = school('school_minimalist'); // scoring_overrides: { cx_as_positive: true }, offset = -30

      const input: PhaseInput = {
        phase: { ...PHASE_SMALL, capacity_budget: 200 },
        deployed,
        school: minimalistSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      // With cx_as_positive, cx contributes positively to chips
      // Panel: {9, 3, 4} (same components + Read Beast)
      // Without cx_as_positive: chips = 1.0*9 + 0.6*3 - 0.4*4 = 9.2
      // With cx_as_positive: chips = 1.0*9 + 0.6*3 + 0.4*4 = 12.4
      expect(result.chips).toBeCloseTo(12.4);
    });
  });

  describe('constraint validation', () => {
    it('applies SLA penalty when rel is too low', () => {
      // Use a phase with high SLA requirement
      const deployed = [comp('cmp_api_gw')]; // small rel
      const startupSchool = school('school_startup');

      const highSlaPhase: Phase = {
        ...PHASE_SMALL,
        constraints: { sla: 99.9, compliance_level: 'low' },
      };

      const input: PhaseInput = {
        phase: highSlaPhase,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      // SLA 99.9 requires rel>=4 or HA component
      // Panel rel = 2 + 1 (api_gw) = 3, no HA tags -> penalty
      expect(result.constraintPenalty).toBeGreaterThan(0);
    });
  });

  // ── Boss Rule Integration ───────────────────────────────────────────

  describe('boss rule: budget_halved', () => {
    it('halves the capacity budget', () => {
      const deployed = [comp('cmp_cdn'), comp('cmp_cache'), comp('cmp_sql_db')];
      const startupSchool = school('school_startup');
      const budgetBoss = bossRule('boss_budget_halved');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
        bossRule: budgetBoss,
      };

      const result = runPhase(input);

      // Normal budget: 110 + 20 (startup offset) = 130
      // Halved: floor(130 * 0.5) = 65
      expect(result.capacityBudget).toBe(65);
      expect(result.bossEffects?.capacityBudgetFactor).toBe(0.5);
    });
  });

  describe('boss rule: cache_disabled', () => {
    it('doubles capacity cost for components with cache tag', () => {
      const deployed = [comp('cmp_cache'), comp('cmp_api_gw')];
      const startupSchool = school('school_startup');
      const cacheBoss = bossRule('boss_cache_disabled');

      // Run without boss rule to get baseline
      const baseInput: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };
      const baseResult = runPhase(baseInput);

      // Run with boss rule
      const bossInput: PhaseInput = {
        ...baseInput,
        bossRule: cacheBoss,
      };
      const bossResult = runPhase(bossInput);

      // Cache component (has "cache" tag) should have doubled cost
      // API Gateway (no "cache" tag) should be unchanged
      // Cache cost = 15, doubled = 30; API GW cost = 5
      // Base: 15 + 5 = 20; Boss: 30 + 5 = 35
      expect(bossResult.capacityUsed).toBeGreaterThan(baseResult.capacityUsed);
      expect(bossResult.bossEffects?.capacityMultiplierForTags).toEqual({
        tags: ['cache'],
        factor: 2.0,
      });
    });
  });

  describe('boss rule: tech_debt_explosion', () => {
    it('adds extra risks to risk report', () => {
      const deployed = [comp('cmp_api_gw')];
      const startupSchool = school('school_startup');
      const techDebtBoss = bossRule('boss_tech_debt_explosion');

      // Run without boss rule
      const baseInput: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };
      const baseResult = runPhase(baseInput);

      // Run with boss rule
      const bossInput: PhaseInput = {
        ...baseInput,
        bossRule: techDebtBoss,
      };
      const bossResult = runPhase(bossInput);

      // Tech debt adds 1 extra risk per component
      // API GW exposes "gateway_bottleneck" normally -> now has at least 1 more
      expect(bossResult.riskReport.allExposed.length).toBeGreaterThan(
        baseResult.riskReport.allExposed.length,
      );
      expect(bossResult.bossEffects?.extraRandomRiskPerComponent).toBe(1);
    });
  });

  describe('boss rule: single_point (no duplicate tags)', () => {
    it('applies penalty when components share tags', () => {
      // SQL DB has tags: ["db","sql","primary_db"]
      // Read Replica has tags: ["db","read_replica","primary_db"]
      // "db" and "primary_db" are shared -> 2 violations -> 10 penalty
      const deployed = [comp('cmp_sql_db'), comp('cmp_read_replica')];
      const startupSchool = school('school_startup');
      const singlePointBoss = bossRule('boss_single_point');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
        bossRule: singlePointBoss,
      };

      const result = runPhase(input);

      // Should have boss penalty for duplicate tags
      expect(result.bossPenalty).toBeGreaterThan(0);
      expect(result.bossEffects?.noDuplicateTags).toBe(true);
    });

    it('has zero boss penalty when no tags are shared', () => {
      // CDN has tags: ["cdn","edge"]
      // API GW has tags: ["gateway"]
      // No overlapping tags
      const deployed = [comp('cmp_cdn'), comp('cmp_api_gw')];
      const startupSchool = school('school_startup');
      const singlePointBoss = bossRule('boss_single_point');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
        bossRule: singlePointBoss,
      };

      const result = runPhase(input);

      expect(result.bossPenalty).toBe(0);
    });
  });

  describe('boss rule: blind_review', () => {
    it('returns hideRiskReport in bossEffects', () => {
      const deployed = [comp('cmp_api_gw')];
      const startupSchool = school('school_startup');
      const blindBoss = bossRule('boss_blind_review');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
        bossRule: blindBoss,
      };

      const result = runPhase(input);

      expect(result.bossEffects?.hideRiskReport).toBe(true);
      // Score calculation should be unaffected (blind_review is UI only)
      expect(result.bossPenalty).toBe(0);
    });
  });

  describe('no boss rule', () => {
    it('has zero bossPenalty and no bossEffects when no boss rule', () => {
      const deployed = [comp('cmp_api_gw')];
      const startupSchool = school('school_startup');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      expect(result.bossPenalty).toBe(0);
      expect(result.bossEffects).toBeUndefined();
    });
  });

  // ── Joker Special Condition Integration ─────────────────────────────

  describe('joker special condition: capacity_under_budget', () => {
    it('activates joker when under budget', () => {
      // jk_cost_ceiling: require_any_tags=["cache","cdn"], special="capacity_under_budget"
      const deployed = [comp('cmp_cdn')];
      const startupSchool = school('school_startup');
      const costCeiling = joker('jk_cost_ceiling');

      const input: PhaseInput = {
        phase: PHASE_SMALL, // budget = 110 + 20 = 130, CDN cost = 8
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [costCeiling],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      // Under budget (8 <= 130) and has "cdn" tag -> should activate
      expect(result.activeJokers.map(j => j.id)).toContain('jk_cost_ceiling');
    });
  });

  describe('joker special condition: component_count_lte_4', () => {
    it('activates joker when deploying 4 or fewer components', () => {
      // jk_mvp_first: require_any_tags=["gateway","cache"], special="component_count_lte_4"
      const deployed = [comp('cmp_api_gw'), comp('cmp_cache')];
      const startupSchool = school('school_startup');
      const mvpFirst = joker('jk_mvp_first');

      const input: PhaseInput = {
        phase: PHASE_SMALL,
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [mvpFirst],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      // 2 components (<=4) and has "gateway" tag -> should activate
      expect(result.activeJokers.map(j => j.id)).toContain('jk_mvp_first');
    });

    it('does not activate joker when deploying more than 4 components', () => {
      const deployed = [
        comp('cmp_api_gw'),
        comp('cmp_cache'),
        comp('cmp_cdn'),
        comp('cmp_sql_db'),
        comp('cmp_queue'),
      ];
      const startupSchool = school('school_startup');
      const mvpFirst = joker('jk_mvp_first');

      const input: PhaseInput = {
        phase: { ...PHASE_SMALL, capacity_budget: 200 },
        deployed,
        school: startupSchool,
        baseline: DEFAULT_BASELINE,
        jokers: [mvpFirst],
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: [],
      };

      const result = runPhase(input);

      // 5 components (>4) -> should NOT activate despite having matching tags
      expect(result.activeJokers.map(j => j.id)).not.toContain('jk_mvp_first');
    });
  });
});
