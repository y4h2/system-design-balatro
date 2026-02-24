import type { Component, Phase, Pattern, SuperPattern, Joker, Event, School } from '../schemas/index.js';
import { validateDeployment } from './deploy.js';
import { detectPatterns } from './patterns.js';
import { computeRiskExposure, resolveEvent, type RiskReport, type EventResult } from './risk.js';
import { computePanel, computeChips, computeMult, computeFinalScore, type Panel } from './scoring.js';
import { validateConstraints } from './constraints.js';

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
}

export interface PhaseSettlement {
  deployedComponents: Component[];
  deployedTags: string[];
  capacityUsed: number;
  capacityBudget: number;
  panel: Panel;
  triggeredPatterns: Pattern[];
  triggeredSuperPatterns: SuperPattern[];
  riskReport: RiskReport;
  eventResults: EventResult[];
  activeJokers: Joker[];
  jokerMultipliers: number[];
  chips: number;
  mult: number;
  constraintPenalty: number;
  finalScore: number;
  targetScore: number;
  passed: boolean;
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
  const { phase, deployed, school, baseline, jokers, patterns, superPatterns, events } = input;

  // 1. Calculate effective budget
  const capacityBudget = phase.capacity_budget + school.modifiers.capacity_budget_offset;

  // 2. Validate deployment (capacity check)
  const deployment = validateDeployment(deployed, capacityBudget, school.modifiers);
  const capacityUsed = deployment.totalCost;

  // 3. Collect deployed tags
  const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];

  // 4. Detect triggered patterns
  const triggeredPatterns = detectPatterns(deployedTags, patterns);

  // 5. Compute risk exposure
  const riskReport = computeRiskExposure(deployed);

  // 6. Resolve events against exposed risks
  const eventResults = events.map(e => resolveEvent(e, riskReport.exposed));

  // 7. Check Joker activation
  const activeJokers = jokers.filter(j => isJokerActive(j, deployedTags));
  const jokerMultipliers = activeJokers.map(j => j.multiplier);

  // 8. Check super patterns
  const triggeredSuperPatterns = checkSuperPatterns(
    superPatterns,
    triggeredPatterns.length,
    riskReport.exposed.length,
    capacityUsed,
    capacityBudget,
  );

  // 9. Compute panel
  const patternDeltas: Panel[] = triggeredPatterns.map(p => p.effects.delta);
  const eventPenalties: Panel[] = eventResults
    .filter(er => er.hit)
    .map(er => er.penalty);

  const panel = computePanel(deployed, baseline, patternDeltas, eventPenalties);

  // 10. Compute chips
  const cxPositive = school.modifiers.scoring_overrides?.cx_as_positive === true;
  const chips = computeChips(panel, phase.weights, cxPositive);

  // 11. Compute mult
  const superPatternMultAdds = triggeredSuperPatterns
    .filter(sp => sp.reward.type === 'mult_burst')
    .map(sp => ({ mult_add: (sp.reward as { type: 'mult_burst'; mult_add: number }).mult_add }));

  const mult = computeMult(triggeredPatterns, superPatternMultAdds, jokerMultipliers);

  // 12. Validate constraints
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

  // 13. Compute final score
  const finalScore = computeFinalScore(chips, mult, constraintPenalty);
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
    riskReport,
    eventResults,
    activeJokers,
    jokerMultipliers,
    chips,
    mult,
    constraintPenalty,
    finalScore,
    targetScore,
    passed,
  };
}
