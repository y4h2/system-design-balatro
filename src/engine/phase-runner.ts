import type { Component, Phase, Pattern, SuperPattern, Joker, School, BossRule, Platform } from '../schemas/index.js';
import { validateDeployment, getEffectiveCapacityCost } from './deploy.js';
import { detectPatterns, resolveRouteConflict, checkRouteMastery, type RouteMastery } from './patterns.js';
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

// ── Types ───────────────────────────────────────────────────────────

export interface HandResult {
  handIndex: number;
  played: Component[];
  triggeredPatterns: Pattern[];   // active patterns (free + winning route + platform)
  discardedPatterns: Pattern[];   // patterns lost to route conflict
  winningRoute: string | null;    // 'A'|'B'|'C'|null
  activeJokers: Joker[];
  chips: number;
  mult: number;
  handScore: number;
  jokerGold: number;
}

export interface SuperPatternRewardApplied {
  type: string;
  description: string;
}

/** Legacy single-deploy input (kept for backward compatibility) */
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

/** Legacy single-deploy settlement */
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

/** New multi-hand settlement */
export interface MultiHandSettlement {
  hands: HandResult[];
  totalHandScore: number;
  routeMastery: RouteMastery;
  allPlayedComponents: Component[];
  deployedTags: string[];
  capacityUsed: number;
  capacityBudget: number;
  panel: Panel;
  constraintResult: ConstraintResult;
  constraintPenalty: number;
  bossPenalty: number;
  jokerGold: number;
  superPatternRewards: SuperPatternRewardApplied[];
  finalScore: number;
  targetScore: number;
  passed: boolean;
  bossEffects?: BossRuleEffects;
}

// ── Helpers ─────────────────────────────────────────────────────────

function isJokerActive(joker: Joker, deployedTags: string[]): boolean {
  const { require_all_tags, require_any_tags } = joker.condition;
  const hasAll = require_all_tags.every(t => deployedTags.includes(t));
  if (!hasAll) return false;
  if (require_any_tags.length === 0) return true;
  return require_any_tags.some(t => deployedTags.includes(t));
}

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

// ── Single hand scoring ─────────────────────────────────────────────

export interface RunHandInput {
  played: Component[];
  jokers: Joker[];
  patterns: Pattern[];
  school: School;
  platform?: Platform;
  bossRule?: BossRule;
  handIndex: number;
}

/**
 * Score a single hand of played cards.
 * Detects patterns, resolves route conflicts, activates jokers,
 * computes chips × mult.
 */
export function runHand(input: RunHandInput): HandResult {
  const { played, jokers, patterns, platform, handIndex } = input;

  const playedTags = [...new Set(played.flatMap(c => c.tags))];

  // 1. Detect all matching patterns
  const allTriggered = detectPatterns(played, patterns);

  // 2. Resolve route conflicts
  const { activePatterns, discardedPatterns, winningRoute } = resolveRouteConflict(allTriggered);

  // 3. Joker activation
  const activeJokers = jokers.filter(j => {
    if (!isJokerActive(j, playedTags)) return false;
    return checkJokerSpecialCondition(j, {
      capacityUsed: 0,
      capacityBudget: 999,
      deployedCount: played.length,
      deployed: played,
    });
  });

  // 4. Compute chips
  const baseChips = played.reduce((sum, c) => sum + c.base_chips, 0);
  const patternChips = activePatterns.reduce((sum, p) => sum + p.effects.chips_add, 0);
  const jokerChips = computeJokerChipBonus(activeJokers, played);
  const platformChips = platform ? getPlatformChipBonus(played, platform) : 0;
  const chips = baseChips + patternChips + jokerChips + platformChips;

  // 5. Compute mult
  const jokerMultAddTotal = computeJokerMultAdd(activeJokers, activePatterns.length);
  const jokerMultipliers = getJokerMultipliers(activeJokers, activePatterns.length);
  const mult = computeMult(activePatterns, jokerMultAddTotal, jokerMultipliers);

  // 6. Hand score
  const handScore = Math.round(chips * mult);

  // 7. Joker gold
  const jokerGold = computeJokerGold(activeJokers, activePatterns.length);

  return {
    handIndex,
    played,
    triggeredPatterns: activePatterns,
    discardedPatterns,
    winningRoute,
    activeJokers,
    chips,
    mult,
    handScore,
    jokerGold,
  };
}

// ── Multi-hand phase settlement ─────────────────────────────────────

export interface SettlePhaseInput {
  hands: HandResult[];
  phase: Phase;
  school: School;
  platform?: Platform;
  baseline: Panel;
  jokers: Joker[];
  superPatterns: SuperPattern[];
  bossRule?: BossRule;
}

/**
 * Settle a phase after all hands have been played.
 * Aggregates all played cards, computes capacity, panel, constraints,
 * route mastery, and final score.
 */
export function settlePhase(input: SettlePhaseInput): MultiHandSettlement {
  const { hands, phase, school, platform, baseline, jokers, superPatterns, bossRule } = input;

  const bossEffects = bossRule ? parseBossRuleEffects(bossRule) : undefined;

  // All played components across all hands
  const allPlayed = hands.flatMap(h => h.played);
  const deployedTags = [...new Set(allPlayed.flatMap(c => c.tags))];

  // Capacity budget
  let capacityBudget = phase.capacity_budget + school.modifiers.capacity_budget_offset;
  if (bossEffects) {
    capacityBudget = applyBossBudgetFactor(capacityBudget, bossEffects);
  }

  // Capacity used
  let capacityUsed: number;
  if (bossEffects?.capacityMultiplierForTags) {
    capacityUsed = allPlayed.reduce((sum, c) => {
      const baseCost = getEffectiveCapacityCost(c, school.modifiers, platform);
      return sum + applyBossCapacityCost(baseCost, c, bossEffects);
    }, 0);
  } else {
    const deployment = validateDeployment(allPlayed, capacityBudget, school.modifiers, platform);
    capacityUsed = deployment.totalCost;
  }

  // Panel (with platform mechanics)
  let panel = computePanel(allPlayed, baseline);
  if (platform?.id === 'aws') {
    panel = applyAwsMultiRegion(allPlayed, panel);
  }
  if (platform?.id === 'selfhosted') {
    panel = applySelfhostedCxPenalty(allPlayed, panel);
  }

  // Constraints
  const constraintResult = validateConstraints(panel, allPlayed, phase.constraints, platform);
  const constraintPenalty = constraintResult.penalty;

  // Super patterns (based on all triggered patterns across all hands)
  const allTriggeredPatterns = hands.flatMap(h => h.triggeredPatterns);
  const uniquePatternCount = new Set(allTriggeredPatterns.map(p => p.id)).size;

  const triggeredSuperPatterns = checkSuperPatterns(
    superPatterns, uniquePatternCount, capacityUsed, capacityBudget, allPlayed,
  );

  const superPatternRewards: SuperPatternRewardApplied[] = [];
  let superPatternChips = 0;
  let superPatternMultAdd = 0;

  for (const sp of triggeredSuperPatterns) {
    switch (sp.reward.type) {
      case 'mult_burst':
        superPatternMultAdd += sp.reward.mult_add;
        superPatternRewards.push({ type: 'mult_burst', description: `${sp.name}: mult +${sp.reward.mult_add}` });
        break;
      case 'chips_burst':
        superPatternChips += sp.reward.chips_add;
        superPatternRewards.push({ type: 'chips_burst', description: `${sp.name}: chips +${sp.reward.chips_add}` });
        break;
      case 'capacity_refund':
        capacityUsed = Math.max(0, capacityUsed - sp.reward.refund_amount);
        superPatternRewards.push({ type: 'capacity_refund', description: `${sp.name}: capacity refund -${sp.reward.refund_amount}` });
        break;
      case 'gold_burst':
        superPatternRewards.push({ type: 'gold_burst', description: `${sp.name}: +${sp.reward.gold} gold` });
        break;
    }
  }

  // Route mastery
  const routeMastery = checkRouteMastery(hands);

  // Total hand score
  const totalHandScore = hands.reduce((sum, h) => sum + h.handScore, 0);

  // Super pattern bonus (applied as flat addition)
  const spBonus = superPatternChips + superPatternMultAdd * 10; // convert mult to equivalent score

  // Joker gold
  const totalJokerGold = hands.reduce((sum, h) => sum + h.jokerGold, 0);
  const spGold = triggeredSuperPatterns
    .filter(sp => sp.reward.type === 'gold_burst')
    .reduce((sum, sp) => sum + (sp.reward as { type: 'gold_burst'; gold: number }).gold, 0);

  // Route mastery bonus (chips × mult style: bonus applied as flat score)
  const masteryBonus = routeMastery.achieved ? routeMastery.bonus : 0;

  // Boss penalty
  const bossPenalty = 0;

  // Final score
  const finalScore = Math.round(totalHandScore + spBonus + masteryBonus - constraintPenalty - bossPenalty);
  const targetScore = phase.target_score;
  const passed = finalScore >= targetScore;

  return {
    hands,
    totalHandScore,
    routeMastery,
    allPlayedComponents: allPlayed,
    deployedTags,
    capacityUsed,
    capacityBudget,
    panel,
    constraintResult,
    constraintPenalty,
    bossPenalty,
    jokerGold: totalJokerGold + spGold,
    superPatternRewards,
    finalScore,
    targetScore,
    passed,
    bossEffects,
  };
}

// ── Legacy single-deploy runner (backward compatible) ───────────────

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
  const allTriggered = detectPatterns(deployed, patterns);

  // 4a. Resolve route conflicts
  const { activePatterns: triggeredPatterns } = resolveRouteConflict(allTriggered);

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

  // 11. Boss penalty
  const bossPenalty = 0;

  // 12. Compute joker gold earnings
  const jokerGold = computeJokerGold(activeJokers, triggeredPatterns.length);
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
