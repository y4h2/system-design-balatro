import type { Component, Phase, Pattern, SuperPattern, Joker, School, BossRule, Platform } from '../schemas/index.js';
import { validateDeployment, getEffectiveCapacityCost } from './deploy.js';
import { detectPatterns } from './patterns.js';
import { computePanel, computeChips, computeMult, computeFinalScore, type Panel } from './scoring.js';
import { validateConstraints, type ConstraintResult } from './constraints.js';
import {
  parseBossRuleEffects,
  applyBossBudgetFactor,
  applyBossCapacityCost,
  type BossRuleEffects,
} from './boss-rules.js';
import {
  checkJokerSpecialCondition,
  computeJokerChipBonus,
  computeJokerMultAdd,
  getJokerMultipliers,
  computeJokerGold,
} from './joker-specials.js';
import {
  getPlatformChipBonus,
  applyAwsMultiRegion,
  applySelfhostedCxPenalty,
} from './platform.js';

// ── Input / Output types ────────────────────────────────────────────

export interface PhaseInput {
  phase: Phase;
  deployed: Component[];
  school: School;
  baseline: Panel;
  jokers: Joker[];
  patterns: Pattern[];
  superPatterns: SuperPattern[];
  bossRule?: BossRule;
  platform?: Platform;
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
  activeJokers: Joker[];
  baseChips: number;
  patternChips: number;
  jokerChips: number;
  chips: number;
  mult: number;
  constraintResult: ConstraintResult;
  constraintPenalty: number;
  bossPenalty: number;
  jokerGold: number;
  finalScore: number;
  targetScore: number;
  passed: boolean;
  bossEffects?: BossRuleEffects;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Check joker activation using require_all / require_any tags.
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
  capacityUsed: number,
  capacityBudget: number,
  deployed: Component[],
): SuperPattern[] {
  return superPatterns.filter(sp => {
    const trigger = sp.trigger;

    switch (trigger.type) {
      case 'pattern_count':
        return triggeredPatternCount >= trigger.min_patterns;

      case 'budget_and_pattern': {
        if (triggeredPatternCount < trigger.min_patterns) return false;
        const usagePercent = capacityBudget > 0 ? (capacityUsed / capacityBudget) * 100 : 100;
        return usagePercent <= trigger.max_budget_usage_percent;
      }

      case 'domain_count': {
        if (triggeredPatternCount < trigger.min_patterns) return false;
        const domains = new Set(deployed.map(c => c.domain));
        return domains.size >= trigger.min_domains;
      }

      default:
        return false;
    }
  });
}

// ── Main runner ─────────────────────────────────────────────────────

export function runPhase(input: PhaseInput): PhaseSettlement {
  const { phase, deployed, school, baseline, jokers, patterns, superPatterns, bossRule, platform } = input;

  // 0. Parse boss rule effects (if any)
  const bossEffects = bossRule ? parseBossRuleEffects(bossRule) : undefined;

  // 1. Calculate effective budget (with boss budget factor)
  let capacityBudget = phase.capacity_budget + school.modifiers.capacity_budget_offset;
  if (bossEffects) {
    capacityBudget = applyBossBudgetFactor(capacityBudget, bossEffects);
  }

  // 2. Validate deployment (capacity check) with boss capacity cost modifier + platform
  let capacityUsed: number;
  if (bossEffects?.capacityMultiplierForTags) {
    capacityUsed = deployed.reduce((sum, c) => {
      const baseCost = getEffectiveCapacityCost(c, school.modifiers, platform);
      return sum + applyBossCapacityCost(baseCost, c, bossEffects);
    }, 0);
  } else {
    const deployment = validateDeployment(deployed, capacityBudget, school.modifiers, platform);
    capacityUsed = deployment.totalCost;
  }

  // 3. Collect deployed tags
  const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];

  // 4. Detect triggered patterns (tag + domain matching)
  const triggeredPatterns = detectPatterns(deployed, patterns);

  // 5. Check Joker activation (tag conditions + special conditions)
  const activeJokers = jokers.filter(j => {
    if (!isJokerActive(j, deployedTags)) return false;
    return checkJokerSpecialCondition(j, {
      capacityUsed,
      capacityBudget,
      deployedCount: deployed.length,
      deployed,
    });
  });

  // 6. Check super patterns
  const triggeredSuperPatterns = checkSuperPatterns(
    superPatterns,
    triggeredPatterns.length,
    capacityUsed,
    capacityBudget,
    deployed,
  );

  // 6a. Apply super pattern rewards
  const superPatternRewards: SuperPatternRewardApplied[] = [];
  let superPatternChips = 0;
  let superPatternMultAdd = 0;

  for (const sp of triggeredSuperPatterns) {
    switch (sp.reward.type) {
      case 'mult_burst':
        superPatternMultAdd += sp.reward.mult_add;
        superPatternRewards.push({
          type: 'mult_burst',
          description: `${sp.name}: mult +${sp.reward.mult_add}`,
        });
        break;
      case 'chips_burst':
        superPatternChips += sp.reward.chips_add;
        superPatternRewards.push({
          type: 'chips_burst',
          description: `${sp.name}: chips +${sp.reward.chips_add}`,
        });
        break;
      case 'capacity_refund': {
        capacityUsed = Math.max(0, capacityUsed - sp.reward.refund_amount);
        superPatternRewards.push({
          type: 'capacity_refund',
          description: `${sp.name}: capacity refund -${sp.reward.refund_amount}`,
        });
        break;
      }
      case 'gold_burst':
        superPatternRewards.push({
          type: 'gold_burst',
          description: `${sp.name}: +${sp.reward.gold} gold`,
        });
        break;
    }
  }

  // 7. Compute panel (for constraint checking) with platform mechanics
  let panel = computePanel(deployed, baseline);
  if (platform?.id === 'aws') {
    panel = applyAwsMultiRegion(deployed, panel);
  }
  if (platform?.id === 'selfhosted') {
    panel = applySelfhostedCxPenalty(deployed, panel);
  }

  // 8. Validate constraints → penalty (with platform mechanic: Azure Compliance Shield)
  const constraintResult = validateConstraints(panel, deployed, phase.constraints, platform);
  const constraintPenalty = constraintResult.penalty;

  // 9. Compute chips = Σ base_chips + pattern chips + joker chips + platform chips + super pattern chips
  const baseChips = deployed.reduce((sum, c) => sum + c.base_chips, 0);
  const patternChips = triggeredPatterns.reduce((sum, p) => sum + p.effects.chips_add, 0);
  const jokerChips = computeJokerChipBonus(activeJokers, deployed);
  const platformChips = platform ? getPlatformChipBonus(deployed, platform) : 0;
  const chips = computeChips(deployed, patternChips + superPatternChips, jokerChips + platformChips);

  // 10. Compute mult = (1 + pattern mults + joker mult adds + super pattern mult adds) × joker multipliers
  const jokerMultAddTotal = computeJokerMultAdd(activeJokers, triggeredPatterns.length) + superPatternMultAdd;
  const jokerMultipliers = getJokerMultipliers(activeJokers, triggeredPatterns.length);
  const mult = computeMult(triggeredPatterns, jokerMultAddTotal, jokerMultipliers);

  // 11. Check boss duplicate-tag penalty (kept from before)
  let bossPenalty = 0;
  // (boss penalties can still apply via boss rule effects if needed)

  // 12. Compute joker gold earnings
  const jokerGold = computeJokerGold(activeJokers, triggeredPatterns.length);
  // Add gold burst from super patterns
  const spGold = triggeredSuperPatterns
    .filter(sp => sp.reward.type === 'gold_burst')
    .reduce((sum, sp) => sum + (sp.reward as { type: 'gold_burst'; gold: number }).gold, 0);

  // 13. Compute final score
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
    activeJokers,
    baseChips,
    patternChips,
    jokerChips,
    chips,
    mult,
    constraintResult,
    constraintPenalty,
    bossPenalty,
    jokerGold: jokerGold + spGold,
    finalScore,
    targetScore,
    passed,
    bossEffects,
  };
}
