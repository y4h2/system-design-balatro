import type { Component, Phase, Pattern, SuperPattern, Joker, Event, School, BossRule } from '../schemas/index.js';
import { validateDeployment, getEffectiveCapacityCost } from './deploy.js';
import { detectPatterns } from './patterns.js';
import { computeRiskExposure, resolveEvent, type RiskReport, type EventResult } from './risk.js';
import { computePanel, computeChips, computeMult, computeFinalScore, type Panel } from './scoring.js';
import { validateConstraints } from './constraints.js';
import {
  parseBossRuleEffects,
  applyBossBudgetFactor,
  applyBossCapacityCost,
  applyTechDebtRisks,
  validateNoDuplicateTags,
  type BossRuleEffects,
} from './boss-rules.js';
import { checkJokerSpecialCondition } from './joker-specials.js';

// ── Input / Output types ────────────────────────────────────────────

export interface PhaseInput {
  phase: Phase;
  deployed: Component[];
  school: School;
  baseline: Panel;
  jokers: Joker[];
  patterns: Pattern[];
  superPatterns: SuperPattern[];
  events: Event[];
  bossRule?: BossRule;
}

export interface SuperPatternRewardApplied {
  type: string;
  description: string;
}

export interface PhaseSettlement {
  deployedComponents: Component[];
  deployedTags: string[];
  capacityUsed: number;
  capacityBudget: number;
  panel: Panel;
  triggeredPatterns: Pattern[];
  triggeredSuperPatterns: SuperPattern[];
  superPatternRewards: SuperPatternRewardApplied[];
  riskReport: RiskReport;
  eventResults: EventResult[];
  activeJokers: Joker[];
  jokerMultipliers: number[];
  chips: number;
  mult: number;
  constraintPenalty: number;
  bossPenalty: number;
  finalScore: number;
  targetScore: number;
  passed: boolean;
  bossEffects?: BossRuleEffects;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Check joker activation using the same require_all / require_any
 * logic as pattern detection.
 */
function isJokerActive(joker: Joker, deployedTags: string[]): boolean {
  const { require_all_tags, require_any_tags } = joker.condition;

  const hasAll = require_all_tags.every(t => deployedTags.includes(t));
  if (!hasAll) return false;

  if (require_any_tags.length === 0) return true;
  return require_any_tags.some(t => deployedTags.includes(t));
}

/**
 * Evaluate super-pattern triggers.
 */
function checkSuperPatterns(
  superPatterns: SuperPattern[],
  triggeredPatternCount: number,
  exposedRiskCount: number,
  capacityUsed: number,
  capacityBudget: number,
): SuperPattern[] {
  return superPatterns.filter(sp => {
    const trigger = sp.trigger;

    switch (trigger.type) {
      case 'pattern_count':
        return triggeredPatternCount >= trigger.min_patterns;

      case 'risk_and_pattern': {
        if (triggeredPatternCount < trigger.min_patterns) return false;
        if (trigger.min_exposed_risks !== undefined && exposedRiskCount < trigger.min_exposed_risks) return false;
        if (trigger.max_exposed_risks !== undefined && exposedRiskCount > trigger.max_exposed_risks) return false;
        return true;
      }

      case 'budget_and_pattern': {
        if (triggeredPatternCount < trigger.min_patterns) return false;
        const usagePercent = capacityBudget > 0 ? (capacityUsed / capacityBudget) * 100 : 100;
        return usagePercent <= trigger.max_budget_usage_percent;
      }

      default:
        return false;
    }
  });
}

// ── Main runner ─────────────────────────────────────────────────────

export function runPhase(input: PhaseInput): PhaseSettlement {
  const { phase, deployed, school, baseline, jokers, patterns, superPatterns, events, bossRule } = input;

  // 0. Parse boss rule effects (if any)
  const bossEffects = bossRule ? parseBossRuleEffects(bossRule) : undefined;

  // 1. Calculate effective budget (with boss budget factor)
  let capacityBudget = phase.capacity_budget + school.modifiers.capacity_budget_offset;
  if (bossEffects) {
    capacityBudget = applyBossBudgetFactor(capacityBudget, bossEffects);
  }

  // 2. Validate deployment (capacity check) with boss capacity cost modifier
  let capacityUsed: number;
  if (bossEffects?.capacityMultiplierForTags) {
    // When boss modifies capacity costs, compute manually with boss overrides
    capacityUsed = deployed.reduce((sum, c) => {
      const baseCost = getEffectiveCapacityCost(c, school.modifiers);
      return sum + applyBossCapacityCost(baseCost, c, bossEffects);
    }, 0);
  } else {
    const deployment = validateDeployment(deployed, capacityBudget, school.modifiers);
    capacityUsed = deployment.totalCost;
  }

  // 3. Collect deployed tags
  const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];

  // 4. Detect triggered patterns
  const triggeredPatterns = detectPatterns(deployedTags, patterns);

  // 5. Apply tech debt risks (boss: extra random risks per component)
  let riskComponents = deployed;
  if (bossEffects?.extraRandomRiskPerComponent) {
    riskComponents = applyTechDebtRisks(deployed, bossEffects.extraRandomRiskPerComponent);
  }

  // 6. Compute risk exposure (using possibly modified components)
  const riskReport = computeRiskExposure(riskComponents);

  // 7. Resolve events against exposed risks
  const eventResults = events.map(e => resolveEvent(e, riskReport.exposed));

  // 8. Check Joker activation (tag conditions + special conditions)
  const activeJokers = jokers.filter(j => {
    if (!isJokerActive(j, deployedTags)) return false;
    return checkJokerSpecialCondition(j, {
      capacityUsed,
      capacityBudget,
      deployedCount: deployed.length,
    });
  });
  const jokerMultipliers = activeJokers.map(j => j.multiplier);

  // 9. Check super patterns
  const triggeredSuperPatterns = checkSuperPatterns(
    superPatterns,
    triggeredPatterns.length,
    riskReport.exposed.length,
    capacityUsed,
    capacityBudget,
  );

  // 9a. Apply super pattern rewards
  const superPatternRewards: SuperPatternRewardApplied[] = [];

  // capacity_refund: reduce capacityUsed
  for (const sp of triggeredSuperPatterns) {
    if (sp.reward.type === 'capacity_refund') {
      const refund = (sp.reward as { type: 'capacity_refund'; refund_amount: number }).refund_amount;
      capacityUsed = Math.max(0, capacityUsed - refund);
      superPatternRewards.push({
        type: 'capacity_refund',
        description: `${sp.name}: capacity refund -${refund}`,
      });
    }
  }

  // event_immunity: zero out all event penalties
  const hasEventImmunity = triggeredSuperPatterns.some(sp => sp.reward.type === 'event_immunity');
  if (hasEventImmunity) {
    for (const er of eventResults) {
      if (er.hit) {
        er.penalty = { perf: 0, rel: 0, cx: 0 };
      }
    }
    const immunSp = triggeredSuperPatterns.find(sp => sp.reward.type === 'event_immunity')!;
    superPatternRewards.push({
      type: 'event_immunity',
      description: `${immunSp.name}: all event penalties zeroed`,
    });
  }

  // 10. Compute panel (with possibly zeroed event penalties)
  const patternDeltas: Panel[] = triggeredPatterns.map(p => p.effects.delta);
  const eventPenalties: Panel[] = eventResults
    .filter(er => er.hit)
    .map(er => er.penalty);

  const panel = computePanel(deployed, baseline, patternDeltas, eventPenalties);

  // 11. Compute chips
  // dimension_flip: override cxPositive if triggered
  let cxPositive = school.modifiers.scoring_overrides?.cx_as_positive === true;
  for (const sp of triggeredSuperPatterns) {
    if (sp.reward.type === 'dimension_flip') {
      const reward = sp.reward as { type: 'dimension_flip'; flip_dimension: string; from: string; to: string };
      if (reward.flip_dimension === 'cx' && reward.to === 'positive') {
        cxPositive = true;
        superPatternRewards.push({
          type: 'dimension_flip',
          description: `${sp.name}: Cx becomes positive in chips formula`,
        });
      }
    }
  }
  const chips = computeChips(panel, phase.weights, cxPositive);

  // 12. Compute mult
  const superPatternMultAdds = triggeredSuperPatterns
    .filter(sp => sp.reward.type === 'mult_burst')
    .map(sp => {
      superPatternRewards.push({
        type: 'mult_burst',
        description: `${sp.name}: mult +${(sp.reward as { type: 'mult_burst'; mult_add: number }).mult_add}`,
      });
      return { mult_add: (sp.reward as { type: 'mult_burst'; mult_add: number }).mult_add };
    });

  const mult = computeMult(triggeredPatterns, superPatternMultAdds, jokerMultipliers);

  // 13. Validate constraints
  const constraintResult = validateConstraints({
    sla: phase.constraints.sla,
    compliance_level: phase.constraints.compliance_level,
    deployedTags,
    rel: panel.rel,
    capacityUsed,
    capacityBudget,
    hasAuditLog: deployedTags.includes('audit_log'),
    hasEncryption: deployedTags.includes('encryption'),
  });
  const constraintPenalty = constraintResult.totalPenalty;

  // 14. Check boss duplicate-tag penalty
  let bossPenalty = 0;
  if (bossEffects?.noDuplicateTags) {
    const violations = validateNoDuplicateTags(deployed);
    // Each duplicate tag incurs a 5-point penalty
    bossPenalty = violations.length * 5;
  }

  // 15. Compute final score (include boss penalty)
  const finalScore = computeFinalScore(chips, mult, constraintPenalty + bossPenalty);
  const targetScore = phase.target_score;
  const passed = finalScore >= targetScore;

  return {
    deployedComponents: deployed,
    deployedTags,
    capacityUsed,
    capacityBudget,
    panel,
    triggeredPatterns,
    triggeredSuperPatterns,
    superPatternRewards,
    riskReport,
    eventResults,
    activeJokers,
    jokerMultipliers,
    chips,
    mult,
    constraintPenalty,
    bossPenalty,
    finalScore,
    targetScore,
    passed,
    bossEffects,
  };
}
