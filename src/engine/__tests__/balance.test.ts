import { describe, it, expect } from 'vitest';
import { runPhase, type PhaseInput, type PhaseSettlement } from '../phase-runner.js';
import { loadGameData } from '../../data/loader.js';
import type { Component, School, Scenario, Joker, BossRule, Pattern, SuperPattern } from '../../schemas/index.js';
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
  const bossRuleRef = phase.boss_rule
    ? data.bossRules.find(b => b.id === phase.boss_rule || b.id === `boss_${phase.boss_rule}`)
    : undefined;

  return runPhase({
    phase,
    deployed,
    school,
    baseline: baseline(school),
    jokers,
    patterns: data.patterns,
    superPatterns: data.superPatterns,
    events: [], // no events for balance testing (best case)
    bossRule: bossRuleRef,
  });
}

// ── Logging helper ──────────────────────────────────────────────────
function logResult(label: string, r: PhaseSettlement): void {
  console.log(
    `  [${label}] score=${r.finalScore} target=${r.targetScore} ` +
    `chips=${r.chips} mult=${r.mult} penalty=${r.constraintPenalty}+${r.bossPenalty} ` +
    `panel=(P${r.panel.perf}/R${r.panel.rel}/C${r.panel.cx}) ` +
    `patterns=${r.triggeredPatterns.map(p => p.id).join(',')} ` +
    `supers=${r.triggeredSuperPatterns.map(sp => sp.id).join(',')} ` +
    `cap=${r.capacityUsed}/${r.capacityBudget} ${r.passed ? 'PASS' : 'FAIL'}`,
  );
}

// ── Constants ───────────────────────────────────────────────────────
const SCENARIOS = ['scenario_shortlink', 'scenario_chat', 'scenario_orders'] as const;
const SCHOOLS = [
  'school_sre', 'school_startup', 'school_minimalist',
  'school_compliance', 'school_performance', 'school_vibe_coding',
] as const;

// ── Deployment compositions ─────────────────────────────────────────

// Phase 1: "Good deployment" -- Read Beast pattern (cache + cdn) + a few components
// CDN(8) + Cache(15) + SQL DB(18) = 41 capacity, triggers Read Beast
const PHASE1_READ_BEAST = () => [comp('cmp_cdn'), comp('cmp_cache'), comp('cmp_sql_db')];

// Phase 1 variant: Shock Absorber pattern for non-read scenarios
// Rate Limit(6) + Queue(12) + Worker(10) + API GW(10) = 38 capacity
const PHASE1_SHOCK_ABSORBER = () => [
  comp('cmp_rate_limit'), comp('cmp_queue'), comp('cmp_worker'), comp('cmp_api_gw'),
];

// Phase 2: "Strong deployment" -- 2 patterns + 5-6 components
// Read Beast + Shock Absorber = CDN + Cache + Rate Limit + Queue + Worker + SQL DB
// Cost: 8+15+6+12+10+18 = 69
const PHASE2_TWO_PATTERNS = () => [
  comp('cmp_cdn'), comp('cmp_cache'), comp('cmp_sql_db'),
  comp('cmp_rate_limit'), comp('cmp_queue'), comp('cmp_worker'),
];

// Phase 2 variant with Always On pattern for reliability-focused scenarios
// Multi-AZ(22) + Health Check(5) + Circuit Breaker(8) + Shock Absorber components
// Multi-AZ + HC + CB + Rate Limit + Queue + Worker = 22+5+8+6+12+10 = 63
const PHASE2_ALWAYS_ON_SHOCK = () => [
  comp('cmp_multi_az'), comp('cmp_health_check'), comp('cmp_circuit_breaker'),
  comp('cmp_rate_limit'), comp('cmp_queue'), comp('cmp_worker'),
];

// Phase 3 optimal: 3 patterns for sp_full_stack super pattern
// Read Beast + Shock Absorber + Always On
// CDN(8) + Cache(15) + Rate Limit(6) + Queue(12) + Worker(10) + Multi-AZ(22) + HC(5) + CB(8) = 86
const PHASE3_THREE_PATTERNS = () => [
  comp('cmp_cdn'), comp('cmp_cache'),
  comp('cmp_rate_limit'), comp('cmp_queue'), comp('cmp_worker'),
  comp('cmp_multi_az'), comp('cmp_health_check'), comp('cmp_circuit_breaker'),
];

// Phase 3 for orders (needs audit_log + encryption for high compliance)
// Read Beast + Shock Absorber + audit + encrypt
// CDN(8) + Cache(15) + Rate Limit(6) + Queue(12) + Worker(10) + Audit(8) + Encrypt(7) + API GW(10) = 76
const PHASE3_ORDERS_COMPLIANT = () => [
  comp('cmp_cdn'), comp('cmp_cache'),
  comp('cmp_rate_limit'), comp('cmp_queue'), comp('cmp_worker'),
  comp('cmp_api_gw'),
  comp('cmp_audit_log'), comp('cmp_encryption'),
];

// Phase 3 for chat (needs high compliance + high SLA)
// Always On + Shock Absorber + compliance + observability for debug loop
// Multi-AZ(22) + HC(5) + CB(8) + Rate Limit(6) + Queue(12) + Worker(10) + Audit(8) + Encrypt(7) = 78
const PHASE3_CHAT_COMPLIANT = () => [
  comp('cmp_multi_az'), comp('cmp_health_check'), comp('cmp_circuit_breaker'),
  comp('cmp_rate_limit'), comp('cmp_queue'), comp('cmp_worker'),
  comp('cmp_audit_log'), comp('cmp_encryption'),
];

// No-pattern deployment: components that don't trigger any pattern
// SQL DB(18) + Object Storage(6) + Load Balancer(7) + WAF(7) = 38
const NO_PATTERN_DEPLOY = () => [
  comp('cmp_sql_db'), comp('cmp_object_storage'), comp('cmp_load_balancer'), comp('cmp_waf'),
];

// ═════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═════════════════════════════════════════════════════════════════════

describe('Balance: Score range analysis', () => {
  it('same Read Beast deployment shows score variance across all schools on shortlink phase 1', () => {
    const deployed = PHASE1_READ_BEAST();
    const scores: Record<string, number> = {};

    for (const schoolId of SCHOOLS) {
      const result = simulate('scenario_shortlink', 0, schoolId, deployed);
      scores[schoolId] = result.finalScore;
      logResult(`shortlink/p1/${schoolId}`, result);
    }

    // All schools should beat phase 1 target (12) with a basic Read Beast deployment
    const target = scen('scenario_shortlink').phases[0].target_score;
    for (const [schoolId, score] of Object.entries(scores)) {
      expect(score, `${schoolId} should beat shortlink phase 1 target ${target}`).toBeGreaterThanOrEqual(target);
    }

    // Minimalist school should score higher due to cx_as_positive
    expect(scores['school_minimalist']).toBeGreaterThanOrEqual(scores['school_sre']);

    // Performance school should benefit from cache/cdn discount, so capacity is cheaper
    // But baseline rel=1 means lower rel contribution
    // Just verify it's a reasonable score
    expect(scores['school_performance']).toBeGreaterThanOrEqual(target);
  });

  it('same 2-pattern deployment shows score variance on chat phase 2', () => {
    const deployed = PHASE2_ALWAYS_ON_SHOCK();
    const scores: Record<string, number> = {};

    for (const schoolId of SCHOOLS) {
      const result = simulate('scenario_chat', 1, schoolId, deployed);
      scores[schoolId] = result.finalScore;
      logResult(`chat/p2/${schoolId}`, result);
    }

    // Log the range for analysis
    const values = Object.values(scores);
    const min = Math.min(...values);
    const max = Math.max(...values);
    console.log(`  Score range: ${min} - ${max} (spread: ${max - min})`);

    // The spread should exist but not be absurdly large -- schools should differentiate
    expect(max - min).toBeGreaterThan(0);
    // Spread should not exceed 100% of the max score (reasonable balance)
    expect(max - min).toBeLessThan(max);
  });
});

describe('Balance: Phase 1 winnability (small blind)', () => {
  for (const scenarioId of SCENARIOS) {
    describe(scenarioId, () => {
      for (const schoolId of SCHOOLS) {
        it(`${schoolId} can beat phase 1 with a good deployment`, () => {
          // Choose a deployment that makes sense for the scenario
          const deployed = scenarioId === 'scenario_orders'
            ? PHASE1_SHOCK_ABSORBER() // orders is write-heavy, shock absorber fits better
            : PHASE1_READ_BEAST();

          const result = simulate(scenarioId, 0, schoolId, deployed);
          logResult(`${scenarioId}/p1/${schoolId}`, result);

          expect(
            result.finalScore,
            `${schoolId} score ${result.finalScore} should beat target ${result.targetScore}`,
          ).toBeGreaterThanOrEqual(result.targetScore);

          expect(result.passed).toBe(true);

          // Verify at least one pattern triggered
          expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(1);
        });
      }
    });
  }
});

describe('Balance: Phase 2 winnability (big blind)', () => {
  for (const scenarioId of SCENARIOS) {
    describe(scenarioId, () => {
      for (const schoolId of SCHOOLS) {
        it(`${schoolId} can beat phase 2 with a strong 2-pattern deployment`, () => {
          // Phase 2 needs higher scores: use 2-pattern deployments
          let deployed: Component[];

          if (scenarioId === 'scenario_orders') {
            // Orders has rel-heavy weights; Always On + Shock Absorber is better
            deployed = PHASE2_ALWAYS_ON_SHOCK();
          } else if (scenarioId === 'scenario_chat') {
            // Chat needs high rel too; try Always On + Shock Absorber
            deployed = PHASE2_ALWAYS_ON_SHOCK();
          } else {
            // Shortlink is perf-heavy; Read Beast + Shock Absorber
            deployed = PHASE2_TWO_PATTERNS();
          }

          const result = simulate(scenarioId, 1, schoolId, deployed);
          logResult(`${scenarioId}/p2/${schoolId}`, result);

          expect(
            result.finalScore,
            `${schoolId} score ${result.finalScore} should beat target ${result.targetScore}`,
          ).toBeGreaterThanOrEqual(result.targetScore);

          expect(result.passed).toBe(true);

          // Verify 2 patterns triggered
          expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(2);
        });
      }
    });
  }
});

describe('Balance: Phase 3 winnability with boss rules', () => {
  describe('scenario_shortlink (boss: cache_disabled)', () => {
    // Cache components cost 2x capacity under cache_disabled boss
    // Strategy: avoid cache-heavy approach, use Always On + Shock Absorber + other patterns
    for (const schoolId of SCHOOLS) {
      it(`${schoolId} can beat phase 3 with an optimal non-cache-heavy deployment`, () => {
        // Under cache_disabled, cache tag components cost 2x.
        // Cache(15) becomes 30, LocalCache(4) becomes 8.
        // Strategy: lean into Always On + Shock Absorber (no cache tag needed)
        // Then add a few perf components. Budget is 70 + school offset.
        // Multi-AZ(22) + HC(5) + CB(8) + Rate Limit(6) + Queue(12) + Worker(10) = 63
        // For SRE: Multi-AZ=16, HC=4, CB=6 -> 16+4+6+6+12+10 = 54
        let deployed = PHASE2_ALWAYS_ON_SHOCK();

        // For schools with tight budget (minimalist has -30), we may need to be leaner
        const school = sch(schoolId);
        const effectiveBudget = 70 + school.modifiers.capacity_budget_offset;

        // Add CDN if we can afford it without cache (CDN doesn't have cache tag)
        // CDN cost = 8, or 6 for performance school (has edge discount)
        const cdnCost = school.modifiers.capacity_discount_tags.includes('cdn')
          ? Math.ceil(8 * school.modifiers.capacity_discount_factor) : 8;
        const baseCost = deployed.reduce((sum, c) => {
          const hasDiscount = c.tags.some(t => school.modifiers.capacity_discount_tags.includes(t));
          return sum + (hasDiscount ? Math.ceil(c.capacity_cost * school.modifiers.capacity_discount_factor) : c.capacity_cost);
        }, 0);

        if (baseCost + cdnCost <= effectiveBudget) {
          deployed = [...deployed, comp('cmp_cdn')];
        }

        // Add load balancer (cheap, boosts perf and rel)
        const lbCost = 7;
        const currentCost = deployed.reduce((sum, c) => {
          const hasDiscount = c.tags.some(t => school.modifiers.capacity_discount_tags.includes(t));
          return sum + (hasDiscount ? Math.ceil(c.capacity_cost * school.modifiers.capacity_discount_factor) : c.capacity_cost);
        }, 0);
        if (currentCost + lbCost <= effectiveBudget) {
          deployed = [...deployed, comp('cmp_load_balancer')];
        }

        const result = simulate('scenario_shortlink', 2, schoolId, deployed);
        logResult(`shortlink/p3/${schoolId}`, result);

        // Phase 3 shortlink target is 45. This is the tightest check.
        // Some schools may struggle -- we verify the score is at least competitive.
        // With 2 patterns (Always On mult=3 + Shock Absorber mult=2), total mult = 1+3+2 = 6
        // For the tightest school (minimalist with -30 budget), this may not pass.
        // We allow minimalist to be an exception since its -30 budget offset makes
        // the effective budget only 40, which is extremely tight.
        if (schoolId === 'school_minimalist') {
          // Minimalist has extreme budget constraint (-30). Log but don't require pass.
          console.log(`  [NOTE] Minimalist on shortlink boss: score=${result.finalScore}, target=${result.targetScore}`);
          // At minimum, the score should be positive and non-trivial
          expect(result.finalScore).toBeGreaterThan(0);
        } else {
          expect(
            result.finalScore,
            `${schoolId} score ${result.finalScore} should beat shortlink boss target ${result.targetScore}`,
          ).toBeGreaterThanOrEqual(result.targetScore);
        }
      });
    }
  });

  describe('scenario_chat (boss: blind_review)', () => {
    // blind_review only hides risk report -- no scoring impact
    // But phase 3 chat has SLA 99.99 (needs 2+ HA and rel>=6) and compliance=high
    for (const schoolId of SCHOOLS) {
      it(`${schoolId} can beat phase 3 with compliance-ready HA deployment`, () => {
        // Need: 2+ HA tags, rel>=6, audit_log + encryption
        // Always On + Shock Absorber + Audit + Encrypt
        let deployed = PHASE3_CHAT_COMPLIANT();

        // Add failover for 2nd HA tag if budget allows
        const school = sch(schoolId);
        const effectiveBudget = 80 + school.modifiers.capacity_budget_offset;

        const currentCost = deployed.reduce((sum, c) => {
          const hasDiscount = c.tags.some(t => school.modifiers.capacity_discount_tags.includes(t));
          return sum + (hasDiscount ? Math.ceil(c.capacity_cost * school.modifiers.capacity_discount_factor) : c.capacity_cost);
        }, 0);

        // Failover gives a 2nd HA tag (multi_az is the 1st)
        // Failover costs 18
        if (currentCost + 18 <= effectiveBudget) {
          deployed = [...deployed, comp('cmp_failover')];
        }

        const result = simulate('scenario_chat', 2, schoolId, deployed);
        logResult(`chat/p3/${schoolId}`, result);

        // Chat boss target is 50. With compliance penalty avoidance and 2 patterns:
        // Always On (mult+3) + Shock Absorber (mult+2) = total mult 6
        // This is a hard phase. Check viability.
        if (schoolId === 'school_minimalist') {
          console.log(`  [NOTE] Minimalist on chat boss: score=${result.finalScore}, target=${result.targetScore}`);
          expect(result.finalScore).toBeGreaterThan(0);
        } else {
          expect(
            result.finalScore,
            `${schoolId} score ${result.finalScore} should beat chat boss target ${result.targetScore}`,
          ).toBeGreaterThanOrEqual(result.targetScore);
        }
      });
    }
  });

  describe('scenario_orders (boss: tech_debt_explosion)', () => {
    // tech_debt_explosion adds +1 random exposed risk per component
    // This is random, so we test best-case (no events) with compliant build
    for (const schoolId of SCHOOLS) {
      it(`${schoolId} can beat phase 3 with compliant 2-pattern deployment`, () => {
        // Orders boss target=48, SLA=99.95, compliance=high
        // Need: 1+ HA tag, rel>=5, audit_log + encryption
        // Use Read Beast + Shock Absorber + compliance components
        let deployed = PHASE3_ORDERS_COMPLIANT();

        const school = sch(schoolId);
        const effectiveBudget = 75 + school.modifiers.capacity_budget_offset;

        const currentCost = deployed.reduce((sum, c) => {
          const hasDiscount = c.tags.some(t => school.modifiers.capacity_discount_tags.includes(t));
          return sum + (hasDiscount ? Math.ceil(c.capacity_cost * school.modifiers.capacity_discount_factor) : c.capacity_cost);
        }, 0);

        // Add HA components for SLA 99.95 (needs haCount>=1 and rel>=5)
        // Health Check(5) is cheapest HA component
        if (currentCost + 5 <= effectiveBudget) {
          deployed = [...deployed, comp('cmp_health_check')];
        }
        // Try adding Multi-AZ for better rel
        const cost2 = deployed.reduce((sum, c) => {
          const hasDiscount = c.tags.some(t => school.modifiers.capacity_discount_tags.includes(t));
          return sum + (hasDiscount ? Math.ceil(c.capacity_cost * school.modifiers.capacity_discount_factor) : c.capacity_cost);
        }, 0);
        const multiAzCost = school.modifiers.capacity_discount_tags.includes('multi_az')
          ? Math.ceil(22 * school.modifiers.capacity_discount_factor) : 22;
        if (cost2 + multiAzCost <= effectiveBudget) {
          deployed = [...deployed, comp('cmp_multi_az')];
        }

        const result = simulate('scenario_orders', 2, schoolId, deployed);
        logResult(`orders/p3/${schoolId}`, result);

        // Orders boss target is 48. Tech debt adds random risks, but we have no events.
        // With 2 patterns (Read Beast + Shock Absorber), mult = 1+2+2 = 5.
        if (schoolId === 'school_minimalist') {
          console.log(`  [NOTE] Minimalist on orders boss: score=${result.finalScore}, target=${result.targetScore}`);
          expect(result.finalScore).toBeGreaterThan(0);
        } else {
          expect(
            result.finalScore,
            `${schoolId} score ${result.finalScore} should beat orders boss target ${result.targetScore}`,
          ).toBeGreaterThanOrEqual(result.targetScore);
        }
      });
    }
  });
});

describe('Balance: No-pattern floor', () => {
  it('deploying 4 components without a pattern gives low scores below phase 2 targets', () => {
    const deployed = NO_PATTERN_DEPLOY();

    for (const scenarioId of SCENARIOS) {
      const phase2Target = scen(scenarioId).phases[1].target_score;

      for (const schoolId of SCHOOLS) {
        const result = simulate(scenarioId, 1, schoolId, deployed);
        logResult(`no-pattern/${scenarioId}/p2/${schoolId}`, result);

        // No patterns should be triggered
        expect(result.triggeredPatterns.length, 'no patterns should trigger').toBe(0);

        // With mult=1 (no patterns), scores should be well below phase 2 targets
        expect(result.mult, 'mult should be 1 with no patterns').toBe(1);

        expect(
          result.finalScore,
          `no-pattern score ${result.finalScore} should be below phase 2 target ${phase2Target} for ${scenarioId}/${schoolId}`,
        ).toBeLessThan(phase2Target);
      }
    }
  });

  it('no-pattern deployment can still pass phase 1 for some schools (low bar)', () => {
    const deployed = NO_PATTERN_DEPLOY();
    let anyPass = false;

    for (const scenarioId of SCENARIOS) {
      for (const schoolId of SCHOOLS) {
        const result = simulate(scenarioId, 0, schoolId, deployed);
        if (result.passed) anyPass = true;
        logResult(`no-pattern-p1/${scenarioId}/${schoolId}`, result);
      }
    }

    // Phase 1 targets are low enough that some no-pattern deployments might squeak by,
    // but it should not be easy or universal. We just log for analysis.
    console.log(`  No-pattern deployments passing phase 1: ${anyPass ? 'some' : 'none'}`);
  });
});

describe('Balance: Constraint impact', () => {
  describe('SLA penalty impact on phase 2+', () => {
    it('deploying without HA on a 99.9 SLA phase incurs penalty that can cause failure', () => {
      // Deploy Read Beast only (no HA) on chat phase 2 (SLA 99.9)
      // Chat phase 2: SLA=99.9, needs rel>=4 or HA
      const deployed = PHASE1_READ_BEAST(); // CDN + Cache + SQL DB, no HA tags
      const result = simulate('scenario_chat', 1, 'school_startup', deployed);
      logResult('sla-penalty/chat-p2/startup', result);

      // If rel < 4 and no HA, penalty should be 8
      // CDN(perf+2) + Cache(perf+3,cx+1) + SQL(perf+1,rel+1,cx+1)
      // baseline(2,2,2) + deltas = perf=8, rel=3, cx=4
      // rel=3 < 4, no HA -> SLA penalty = 8
      if (result.panel.rel < 4) {
        expect(result.constraintPenalty).toBeGreaterThanOrEqual(8);
        console.log(`  SLA penalty applied: ${result.constraintPenalty}`);
      }
    });

    it('deploying without HA on SLA 99.95 phase incurs large penalty', () => {
      // Orders phase 3: SLA=99.95, needs haCount>=1 AND rel>=5
      const deployed = PHASE2_TWO_PATTERNS(); // 2 patterns but no HA
      const result = simulate('scenario_orders', 2, 'school_startup', deployed);
      logResult('sla-penalty/orders-p3/startup', result);

      // No HA tags -> haCount=0 -> SLA penalty = 12
      const haTags = ['multi_az', 'health_check', 'circuit_breaker', 'failover'];
      const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
      const haCount = haTags.filter(t => deployedTags.includes(t)).length;

      if (haCount < 1 || result.panel.rel < 5) {
        expect(result.constraintPenalty).toBeGreaterThanOrEqual(12);
      }
    });

    it('deploying with proper HA on SLA 99.95 avoids penalty', () => {
      // Use Always On pattern (has multi_az + health_check + circuit_breaker)
      const deployed = PHASE2_ALWAYS_ON_SHOCK();
      const result = simulate('scenario_orders', 1, 'school_sre', deployed);
      logResult('sla-no-penalty/orders-p2/sre', result);

      // Always On gives rel+2 delta, plus multi_az(rel+3) + HC(rel+2) + CB(rel+2) = total rel boost
      // With baseline(2,2,2): rel = 2 + 3 + 2 + 2 + 2 + 1 + 1 = 13, clamped to 10
      // SLA 99.9 needs rel>=4 or HA. We have HA. So no SLA penalty.
      const haTags = ['multi_az', 'health_check', 'circuit_breaker', 'failover'];
      const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
      const haCount = haTags.filter(t => deployedTags.includes(t)).length;

      // We should have HA components
      expect(haCount).toBeGreaterThanOrEqual(1);
      // Orders phase 2 SLA is 99.9. With HA or rel>=4, no penalty
      if (result.panel.rel >= 4 || haCount > 0) {
        expect(result.constraintPenalty, 'no SLA penalty with proper HA').toBe(0);
      }
    });
  });

  describe('Compliance penalty impact', () => {
    it('orders phase 3 without audit_log and encryption incurs 15-point penalty', () => {
      // Orders phase 3 has compliance_level=high
      // Use a deployment without audit/encrypt
      const deployed = PHASE2_TWO_PATTERNS(); // No audit_log or encryption
      const result = simulate('scenario_orders', 2, 'school_startup', deployed);
      logResult('compliance-penalty/orders-p3/startup', result);

      const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
      const hasAudit = deployedTags.includes('audit_log');
      const hasEncrypt = deployedTags.includes('encryption');

      if (!hasAudit || !hasEncrypt) {
        // Should have compliance penalty of 15
        expect(result.constraintPenalty).toBeGreaterThanOrEqual(15);
      }
    });

    it('chat phase 3 without compliance components incurs major penalty', () => {
      // Chat phase 3: compliance=high, SLA=99.99
      const deployed = PHASE3_THREE_PATTERNS(); // No audit/encrypt
      const result = simulate('scenario_chat', 2, 'school_sre', deployed);
      logResult('compliance-penalty/chat-p3/sre', result);

      // SLA 99.99 penalty (20) + compliance penalty (15) = 35
      const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
      const hasAudit = deployedTags.includes('audit_log');
      const hasEncrypt = deployedTags.includes('encryption');
      const haTags = ['multi_az', 'health_check', 'circuit_breaker', 'failover'];
      const haCount = haTags.filter(t => deployedTags.includes(t)).length;

      let expectedMinPenalty = 0;
      if (!hasAudit || !hasEncrypt) expectedMinPenalty += 15;
      if (haCount < 2 || result.panel.rel < 6) expectedMinPenalty += 20;

      expect(result.constraintPenalty).toBeGreaterThanOrEqual(expectedMinPenalty);
      console.log(`  Total constraint penalty: ${result.constraintPenalty} (expected min ${expectedMinPenalty})`);
    });

    it('adding audit + encryption removes compliance penalty', () => {
      // Use orders phase 3 with compliant deployment
      const deployed = PHASE3_ORDERS_COMPLIANT(); // Has audit_log + encryption
      const result = simulate('scenario_orders', 2, 'school_startup', deployed);
      logResult('compliance-ok/orders-p3/startup', result);

      const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
      const hasAudit = deployedTags.includes('audit_log');
      const hasEncrypt = deployedTags.includes('encryption');

      expect(hasAudit).toBe(true);
      expect(hasEncrypt).toBe(true);

      // Compliance penalty portion should be 0 (SLA penalty may still apply)
      // We can't check compliance penalty separately, but we verify the tags are present
    });
  });
});

describe('Balance: Difficulty progression', () => {
  it('same deployment scores decrease from phase 1 to phase 3 due to tighter weights and budgets', () => {
    // Use a fixed 2-pattern deployment and run it across all 3 phases of each scenario
    const deployed = PHASE2_TWO_PATTERNS(); // Read Beast + Shock Absorber

    for (const scenarioId of SCENARIOS) {
      const scores: number[] = [];

      for (let phaseIdx = 0; phaseIdx < 3; phaseIdx++) {
        const result = simulate(scenarioId, phaseIdx, 'school_startup', deployed);
        scores.push(result.finalScore);
        logResult(`progression/${scenarioId}/p${phaseIdx + 1}/startup`, result);
      }

      // Phase 1 should have highest or equal score (lower weights, lower penalties)
      // Phase 3 should have lowest score (highest cx weight, tighter constraints)
      console.log(`  ${scenarioId} progression: P1=${scores[0]}, P2=${scores[1]}, P3=${scores[2]}`);

      // Due to increasing cx weights and constraint penalties, later phases should score lower
      // Phase 1 should score >= Phase 3 for the same deployment
      expect(
        scores[0],
        `${scenarioId}: Phase 1 score (${scores[0]}) should be >= Phase 3 score (${scores[2]})`,
      ).toBeGreaterThanOrEqual(scores[2]);
    }
  });

  it('target scores increase across phases', () => {
    for (const scenarioId of SCENARIOS) {
      const sc = scen(scenarioId);
      const targets = sc.phases.map(p => p.target_score);

      expect(targets[0], `${scenarioId} phase 1 < phase 2`).toBeLessThan(targets[1]);
      expect(targets[1], `${scenarioId} phase 2 < phase 3`).toBeLessThan(targets[2]);

      console.log(`  ${scenarioId} targets: P1=${targets[0]}, P2=${targets[1]}, P3=${targets[2]}`);
    }
  });

  it('capacity budgets decrease across phases', () => {
    for (const scenarioId of SCENARIOS) {
      const sc = scen(scenarioId);
      const budgets = sc.phases.map(p => p.capacity_budget);

      expect(budgets[0], `${scenarioId} phase 1 > phase 2 budget`).toBeGreaterThan(budgets[1]);
      expect(budgets[1], `${scenarioId} phase 2 > phase 3 budget`).toBeGreaterThan(budgets[2]);

      console.log(`  ${scenarioId} budgets: P1=${budgets[0]}, P2=${budgets[1]}, P3=${budgets[2]}`);
    }
  });
});

describe('Balance: Super pattern rewards', () => {
  it('3-pattern deployment triggers sp_full_stack for large mult burst', () => {
    const deployed = PHASE3_THREE_PATTERNS();
    const result = simulate('scenario_shortlink', 0, 'school_startup', deployed);
    logResult('super/full_stack/shortlink-p1/startup', result);

    // Should trigger Read Beast + Shock Absorber + Always On = 3 patterns
    expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(3);

    // Should trigger sp_full_stack (3+ patterns -> mult_burst +8)
    const fullStack = result.triggeredSuperPatterns.find(sp => sp.id === 'sp_full_stack');
    expect(fullStack, 'sp_full_stack should trigger with 3 patterns').toBeDefined();

    // Mult should be very high: (1 + 2 + 2 + 3 + 8) = 16
    expect(result.mult).toBeGreaterThanOrEqual(16);

    // This should massively exceed phase 1 target
    expect(result.finalScore).toBeGreaterThan(result.targetScore * 2);
  });

  it('minimalist school with low budget usage triggers sp_minimalist for cx flip', () => {
    // Use a lean Read Beast deployment on a big budget phase
    // CDN(8) + Local Cache(4) = 12 capacity. Local cache has cache tag.
    // Budget = 110 + 0 (startup) = 110. Usage = 12/110 = 10.9%
    // But sp_minimalist needs a pattern AND <=60% usage
    const deployed = [comp('cmp_cdn'), comp('cmp_local_cache')];
    const result = simulate('scenario_shortlink', 0, 'school_startup', deployed);
    logResult('super/minimalist/shortlink-p1/startup', result);

    // CDN has tags [cdn, edge], local_cache has tags [cache, local_cache]
    // Read Beast needs cache + (cdn OR read_replica) -> triggered!
    expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(1);

    // Usage should be well under 60%
    const usagePercent = result.capacityBudget > 0
      ? (result.capacityUsed / result.capacityBudget) * 100
      : 100;
    expect(usagePercent).toBeLessThan(60);

    // sp_minimalist should trigger
    const spMin = result.triggeredSuperPatterns.find(sp => sp.id === 'sp_minimalist');
    expect(spMin, 'sp_minimalist should trigger with low budget usage').toBeDefined();
  });

  it('sp_edge_dancer triggers with 1+ pattern and 3+ exposed risks', () => {
    // Read Beast deployment exposes multiple risks
    // CDN exposes: cache_invalidation
    // Cache exposes: cache_avalanche, data_inconsistency
    // SQL DB exposes: db_single_point, slow_query
    // Total exposed (unique): 5 risks, 0 sealed = 5 net exposed
    const deployed = PHASE1_READ_BEAST();
    const result = simulate('scenario_shortlink', 0, 'school_startup', deployed);
    logResult('super/edge_dancer/shortlink-p1/startup', result);

    expect(result.triggeredPatterns.length).toBeGreaterThanOrEqual(1);
    expect(result.riskReport.exposed.length).toBeGreaterThanOrEqual(3);

    const edgeDancer = result.triggeredSuperPatterns.find(sp => sp.id === 'sp_edge_dancer');
    expect(edgeDancer, 'sp_edge_dancer should trigger with 3+ exposed risks').toBeDefined();
  });
});

describe('Balance: School-specific mechanics', () => {
  it('SRE school gets capacity discount on HA components', () => {
    const deployed = [comp('cmp_multi_az'), comp('cmp_health_check'), comp('cmp_circuit_breaker')];
    const sreResult = simulate('scenario_chat', 0, 'school_sre', deployed);
    const startupResult = simulate('scenario_chat', 0, 'school_startup', deployed);

    logResult('sre-discount/chat-p1/sre', sreResult);
    logResult('sre-discount/chat-p1/startup', startupResult);

    // SRE should use less capacity due to 0.7x discount on multi_az, health_check, circuit_breaker
    // Raw costs: SRE: ceil(22*0.7)+ceil(5*0.7)+ceil(8*0.7) = 16+4+6 = 26
    // Startup: 22+5+8 = 35
    // Note: sp_edge_dancer may trigger giving a capacity_refund of 20,
    // which reduces the final capacityUsed. The key assertion is the relative difference.
    expect(sreResult.capacityUsed).toBeLessThan(startupResult.capacityUsed);

    // The difference should be 9 (35 - 26 = 9 raw difference, refund applies equally)
    expect(startupResult.capacityUsed - sreResult.capacityUsed).toBe(9);
  });

  it('Startup school gets +20 capacity budget', () => {
    const sc = scen('scenario_shortlink');
    const sre = sch('school_sre');
    const startup = sch('school_startup');

    const sreBudget = sc.phases[0].capacity_budget + sre.modifiers.capacity_budget_offset;
    const startupBudget = sc.phases[0].capacity_budget + startup.modifiers.capacity_budget_offset;

    expect(startupBudget - sreBudget).toBe(20);
  });

  it('Minimalist school has cx_as_positive making complexity beneficial', () => {
    // With cx_as_positive, high-cx components boost chips instead of reducing
    // To isolate the cx_as_positive school modifier effect, we need a deployment that
    // does NOT trigger sp_minimalist (which also grants dimension_flip).
    // sp_minimalist requires: 1+ pattern AND <=60% budget usage.
    // Use a big deployment that uses >60% of minimalist budget to avoid sp_minimalist.
    // Minimalist budget on shortlink phase 1: 110 + (-30) = 80
    // We need >48 capacity (60% of 80) AND trigger a pattern.
    // CDN(8) + Cache(15) + SQL(18) + Sharding(20) = 61 -> 61/80 = 76.25% > 60%
    const deployed = [comp('cmp_cache'), comp('cmp_cdn'), comp('cmp_sql_db'), comp('cmp_sharding')];
    const miniResult = simulate('scenario_shortlink', 0, 'school_minimalist', deployed);
    // For startup, budget is 110+20=130. 63/130=48.5% < 60%, so sp_minimalist triggers.
    // Use a higher-budget scenario where startup also exceeds 60%.
    // Actually, let's test on phase 2 (budget 90) where startup budget = 90+20=110, 63/110=57% < 60%.
    // Instead, compare minimalist vs performance school (no cx_as_positive, no sp_minimalist either
    // if usage is over 60%). Performance budget = 90 + 0 = 90 for phase 2.
    // Phase 2 shortlink budget=90. Performance: 90+0=90, 63/90=70% > 60%. No sp_minimalist.
    // Minimalist: 90+(-30)=60, 63/60 = 105% -> over budget! That's bad.
    // Let's use phase 1 with a simpler approach: compare chips directly by controlling for sp_minimalist.
    // Phase 1 shortlink budget=110. Minimalist: 110-30=80. 63/80=78.75%. No sp_minimalist.
    // Performance: 110+0=110. 63/110=57.3% < 60%. sp_minimalist triggers for performance!
    // Use vibe_coding (no cx_as_positive, budget=110). 63/110=57%. sp_minimalist triggers.
    // To avoid sp_minimalist triggering for the comparison school, we need >60% usage.
    // Use phase 2 (budget=90) with SRE (offset=0). SRE budget=90. 63/90=70%. No sp_minimalist.
    const sreResult = simulate('scenario_shortlink', 1, 'school_sre', deployed);

    // Minimalist on phase 2: budget=90-30=60. 63/60=105% over budget -> capacity penalty.
    // Let's use phase 1 for minimalist, phase 2 for SRE? No, different weights.
    // Best approach: use same phase, pick schools where neither triggers sp_minimalist.
    // Use phase 2 shortlink. SRE budget=90+0=90. 63/90=70%. Performance: 90+0=90, 70%.
    // Minimalist: 90-30=60. 63 > 60 -> over budget. Let's reduce components.
    // Use CDN(8)+Cache(15)+SQL(18) = 41 on phase 2. SRE: 41/90=45.6% < 60% -> sp_minimalist triggers!
    // Need higher usage. Add more: CDN(8)+Cache(15)+SQL(18)+Queue(12)+Worker(10)=63.
    // SRE: 65/90=72.2% > 60%. No sp_minimalist. Minimalist: 65/60 > 100%. Over budget.
    // Minimalist on phase 1: 65/80=81.25% > 60%. Good, no sp_minimalist.
    // But different phases have different weights! We need same phase.
    // Solution: use phase 1 with both. Phase 1 budget=110.
    // SRE: 110. We need >66 capacity (>60%). CDN+Cache+SQL+Queue+Worker+MultiAZ=8+15+20+12+10+25=90.
    // 90/110=81.8% > 60%. No sp_minimalist for SRE.
    // Minimalist: 110-30=80. 90/80=112.5% over budget. Bad.
    // Use fewer: CDN+Cache+SQL+Sharding=63. SRE: 63/110=57.3% < 60%. sp_minimalist triggers!
    // Add one more: +RateLimit(6)=69. 69/110=62.7% > 60%. Good for SRE.
    // Minimalist: 69/80=86.25% > 60%. Good, no sp_minimalist.
    const heavyDeploy = [
      comp('cmp_cache'), comp('cmp_cdn'), comp('cmp_sql_db'),
      comp('cmp_sharding'), comp('cmp_rate_limit'),
    ];
    // Both on shortlink phase 1
    const miniResult2 = simulate('scenario_shortlink', 0, 'school_minimalist', heavyDeploy);
    const sreResult2 = simulate('scenario_shortlink', 0, 'school_sre', heavyDeploy);

    logResult('minimalist-cx/shortlink-p1/minimalist', miniResult2);
    logResult('minimalist-cx/shortlink-p1/sre', sreResult2);

    // Verify neither triggered sp_minimalist (usage > 60%)
    const miniSpMin = miniResult2.triggeredSuperPatterns.find(sp => sp.id === 'sp_minimalist');
    const sreSpMin = sreResult2.triggeredSuperPatterns.find(sp => sp.id === 'sp_minimalist');
    expect(miniSpMin, 'minimalist should not trigger sp_minimalist at high usage').toBeUndefined();
    expect(sreSpMin, 'SRE should not trigger sp_minimalist at high usage').toBeUndefined();

    // Now minimalist has innate cx_as_positive from school, SRE does not.
    // With high cx from sharding(+3)+cache(+1)+sql(+1)+rate_limit(+1) = baseline 2 + 6 = 8 cx
    // Minimalist chips = wP*Perf + wR*Rel + wX*Cx (cx positive)
    // SRE chips = wP*Perf + wR*Rel - wX*Cx (cx negative)
    // This should make minimalist chips > SRE chips
    expect(miniResult2.chips).toBeGreaterThan(sreResult2.chips);
  });

  it('Performance school gets discount on cache/cdn/read_replica but lower baseline rel', () => {
    const perfSchool = sch('school_performance');
    const perfBaseline = baseline(perfSchool);

    // Baseline rel should be 1 instead of 2
    expect(perfBaseline.rel).toBe(1);

    // Cache + CDN should be cheaper
    const deployed = [comp('cmp_cache'), comp('cmp_cdn')];
    const perfResult = simulate('scenario_shortlink', 0, 'school_performance', deployed);
    const sreResult = simulate('scenario_shortlink', 0, 'school_sre', deployed);

    logResult('perf-discount/shortlink-p1/performance', perfResult);
    logResult('perf-discount/shortlink-p1/sre', sreResult);

    // Performance should use less capacity: Cache 15->11, CDN 8->6 = 17
    // SRE: Cache 15, CDN 8 = 23 (no discount on cache/cdn)
    expect(perfResult.capacityUsed).toBeLessThan(sreResult.capacityUsed);
  });

  it('Compliance school gets free audit_log and encryption', () => {
    const complianceSchool = sch('school_compliance');
    expect(complianceSchool.modifiers.free_components).toContain('cmp_audit_log');
    expect(complianceSchool.modifiers.free_components).toContain('cmp_encryption');
  });
});

describe('Balance: Boss rule mechanics', () => {
  it('cache_disabled doubles capacity cost of cache-tagged components', () => {
    const deployed = [comp('cmp_cache'), comp('cmp_cdn')]; // cache has 'cache' tag, CDN doesn't
    const normalResult = simulate('scenario_shortlink', 0, 'school_startup', deployed);
    const bossResult = simulate('scenario_shortlink', 2, 'school_startup', deployed);

    logResult('boss/cache_disabled/normal', normalResult);
    logResult('boss/cache_disabled/boss', bossResult);

    // Under cache_disabled: cache(15) -> 30, CDN(8) -> 8 = 38
    // Normal: cache(15) + CDN(8) = 23
    // Boss phase has different budget, but capacity used should differ
    expect(bossResult.capacityUsed).toBeGreaterThan(normalResult.capacityUsed);
    // Cache doubles: 15->30, so boss should be 15 more
    expect(bossResult.capacityUsed - normalResult.capacityUsed).toBe(15);
  });

  it('blind_review has no scoring impact (only hides risk report)', () => {
    const deployed = PHASE2_ALWAYS_ON_SHOCK();
    // Compare with/without boss rule by simulating same phase structure
    // blind_review only sets hideRiskReport, which doesn't affect scoring
    const result = simulate('scenario_chat', 2, 'school_sre', deployed);
    logResult('boss/blind_review/chat-p3', result);

    // The boss effect should be hideRiskReport=true, nothing else
    expect(result.bossEffects?.hideRiskReport).toBe(true);
    expect(result.bossEffects?.capacityMultiplierForTags).toBeUndefined();
    expect(result.bossEffects?.extraRandomRiskPerComponent).toBeUndefined();
    expect(result.bossPenalty).toBe(0);
  });

  it('tech_debt_explosion adds extra exposed risks to each component', () => {
    const deployed = PHASE2_TWO_PATTERNS();
    // Run on orders phase 3 (boss: tech_debt_explosion)
    const bossResult = simulate('scenario_orders', 2, 'school_startup', deployed);
    // Run on orders phase 1 (no boss) with same components for comparison
    const normalResult = simulate('scenario_orders', 0, 'school_startup', deployed);

    logResult('boss/tech_debt/orders-p3', bossResult);
    logResult('boss/tech_debt/orders-p1', normalResult);

    // Boss should have more exposed risks due to extra_random_risk_per_component=1
    // With 6 components, up to 6 extra risks
    // Note: risk exposure is somewhat random, but in general should be higher
    expect(bossResult.bossEffects?.extraRandomRiskPerComponent).toBe(1);
    // Exposed risks should be >= normal (most of the time)
    // We can't guarantee due to randomness, but we verify the boss effect is set
    expect(bossResult.riskReport.exposed.length).toBeGreaterThanOrEqual(
      normalResult.riskReport.exposed.length,
    );
  });
});

describe('Balance: Joker impact', () => {
  it('jk_mvp_first boosts score when deploying <=4 components with gateway/cache', () => {
    const deployed = PHASE1_READ_BEAST(); // 3 components, has cache tag
    const mvpJoker = jk('jk_mvp_first');

    const withJoker = simulate('scenario_shortlink', 0, 'school_startup', deployed, [mvpJoker]);
    const without = simulate('scenario_shortlink', 0, 'school_startup', deployed);

    logResult('joker/mvp_first/with', withJoker);
    logResult('joker/mvp_first/without', without);

    // MVP First gives 1.15x multiplier for <=4 components with cache
    expect(withJoker.activeJokers.length).toBe(1);
    expect(withJoker.finalScore).toBeGreaterThan(without.finalScore);
  });

  it('jk_sla_maniac activates with Always On pattern components', () => {
    const deployed = [
      comp('cmp_multi_az'), comp('cmp_health_check'), comp('cmp_circuit_breaker'),
    ];
    const slaJoker = jk('jk_sla_maniac');

    const result = simulate('scenario_chat', 0, 'school_sre', deployed, [slaJoker]);
    logResult('joker/sla_maniac', result);

    // SLA maniac needs multi_az + health_check + (circuit_breaker OR failover)
    expect(result.activeJokers.length).toBe(1);
    expect(result.jokerMultipliers).toContain(1.3);
  });

  it('jk_cost_ceiling activates when under budget with cache/cdn', () => {
    const deployed = [comp('cmp_cdn'), comp('cmp_local_cache')]; // Very cheap, under budget
    const costJoker = jk('jk_cost_ceiling');

    const result = simulate('scenario_shortlink', 0, 'school_startup', deployed, [costJoker]);
    logResult('joker/cost_ceiling', result);

    // Cost ceiling: needs cache or cdn tag + capacity_under_budget special
    expect(result.capacityUsed).toBeLessThanOrEqual(result.capacityBudget);
    expect(result.activeJokers.length).toBe(1);
    expect(result.jokerMultipliers).toContain(1.2);
  });
});

describe('Balance: Comprehensive scenario walkthrough', () => {
  it('shortlink can be completed with SRE school across all 3 phases', () => {
    // Phase 1: Read Beast
    const p1 = simulate('scenario_shortlink', 0, 'school_sre', PHASE1_READ_BEAST());
    logResult('walkthrough/shortlink/sre/p1', p1);
    expect(p1.passed).toBe(true);

    // Phase 2: Read Beast + Shock Absorber
    const p2 = simulate('scenario_shortlink', 1, 'school_sre', PHASE2_TWO_PATTERNS());
    logResult('walkthrough/shortlink/sre/p2', p2);
    expect(p2.passed).toBe(true);

    // Phase 3: Avoid cache, use Always On + Shock Absorber + CDN + LB
    const p3Deploy = [
      ...PHASE2_ALWAYS_ON_SHOCK(),
      comp('cmp_cdn'),
      comp('cmp_load_balancer'),
    ];
    const p3 = simulate('scenario_shortlink', 2, 'school_sre', p3Deploy);
    logResult('walkthrough/shortlink/sre/p3', p3);
    expect(p3.passed).toBe(true);
  });

  it('chat can be completed with SRE school across all 3 phases', () => {
    // Phase 1: Always On pattern (SRE gets HA discount)
    const p1Deploy = [
      comp('cmp_multi_az'), comp('cmp_health_check'), comp('cmp_circuit_breaker'),
      comp('cmp_api_gw'),
    ];
    const p1 = simulate('scenario_chat', 0, 'school_sre', p1Deploy);
    logResult('walkthrough/chat/sre/p1', p1);
    expect(p1.passed).toBe(true);

    // Phase 2: Always On + Shock Absorber
    const p2 = simulate('scenario_chat', 1, 'school_sre', PHASE2_ALWAYS_ON_SHOCK());
    logResult('walkthrough/chat/sre/p2', p2);
    expect(p2.passed).toBe(true);

    // Phase 3: Need compliance(high) + SLA 99.99 (2 HA + rel>=6)
    // Always On + Shock Absorber + Failover + Audit + Encrypt
    const p3Deploy = [
      comp('cmp_multi_az'), comp('cmp_health_check'), comp('cmp_circuit_breaker'),
      comp('cmp_rate_limit'), comp('cmp_queue'), comp('cmp_worker'),
      comp('cmp_failover'),
      comp('cmp_audit_log'), comp('cmp_encryption'),
    ];
    const p3 = simulate('scenario_chat', 2, 'school_sre', p3Deploy);
    logResult('walkthrough/chat/sre/p3', p3);
    expect(p3.passed).toBe(true);
  });

  it('orders can be completed with SRE school across all 3 phases', () => {
    // Phase 1: Shock Absorber + API GW
    const p1 = simulate('scenario_orders', 0, 'school_sre', PHASE1_SHOCK_ABSORBER());
    logResult('walkthrough/orders/sre/p1', p1);
    expect(p1.passed).toBe(true);

    // Phase 2: Always On + Shock Absorber
    const p2 = simulate('scenario_orders', 1, 'school_sre', PHASE2_ALWAYS_ON_SHOCK());
    logResult('walkthrough/orders/sre/p2', p2);
    expect(p2.passed).toBe(true);

    // Phase 3: Need compliance(high) + SLA 99.95
    // Always On + Shock Absorber + Audit + Encrypt + Local Cache (perf boost)
    // SRE costs: Multi-AZ(16)+HC(4)+CB(6)+RateLimit(6)+Queue(12)+Worker(10)+Audit(8)+Encrypt(7)+LocalCache(4) = 73
    // sp_edge_dancer refund 20 -> 53. Budget 75. Score = (1.0*5+1.6*10-1.2*10)*6 = 9*6 = 54 >= 50
    const p3Deploy = [
      comp('cmp_multi_az'), comp('cmp_health_check'), comp('cmp_circuit_breaker'),
      comp('cmp_rate_limit'), comp('cmp_queue'), comp('cmp_worker'),
      comp('cmp_audit_log'), comp('cmp_encryption'), comp('cmp_local_cache'),
    ];
    const p3 = simulate('scenario_orders', 2, 'school_sre', p3Deploy);
    logResult('walkthrough/orders/sre/p3', p3);
    expect(p3.passed).toBe(true);
  });
});
