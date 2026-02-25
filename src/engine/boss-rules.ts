import type { Component, BossRule } from '../schemas/index.js';

export interface BossRuleEffects {
  capacityMultiplierForTags?: { tags: string[]; factor: number };
  capacityBudgetFactor?: number;
  noDuplicateTags?: boolean;
  extraConstraintPenalty?: number;
}

/**
 * Parse a boss rule from JSON data into structured effects.
 */
export function parseBossRuleEffects(bossRule: BossRule): BossRuleEffects {
  const mod = bossRule.modifier as Record<string, unknown>;
  const effects: BossRuleEffects = {};

  if (mod.capacity_multiplier_for_tags) {
    effects.capacityMultiplierForTags = {
      tags: mod.capacity_multiplier_for_tags as string[],
      factor: mod.factor as number,
    };
  }
  if (mod.capacity_budget_factor !== undefined) {
    effects.capacityBudgetFactor = mod.capacity_budget_factor as number;
  }
  if (mod.no_duplicate_tags) {
    effects.noDuplicateTags = true;
  }
  if (mod.extra_constraint_penalty !== undefined) {
    effects.extraConstraintPenalty = mod.extra_constraint_penalty as number;
  }

  return effects;
}

/**
 * Apply capacity cost multiplier for matching tags (e.g., cache_disabled doubles cache costs).
 */
export function applyBossCapacityCost(
  baseCost: number,
  component: Component,
  effects: BossRuleEffects,
): number {
  if (!effects.capacityMultiplierForTags) return baseCost;
  const { tags, factor } = effects.capacityMultiplierForTags;
  const hasTag = component.tags.some(t => tags.includes(t));
  return hasTag ? Math.ceil(baseCost * factor) : baseCost;
}

/**
 * Apply budget factor (e.g., budget_halved = x0.5).
 */
export function applyBossBudgetFactor(budget: number, effects: BossRuleEffects): number {
  if (effects.capacityBudgetFactor === undefined) return budget;
  return Math.floor(budget * effects.capacityBudgetFactor);
}

/**
 * Validate no-duplicate-tags constraint.
 * Returns list of tag violations (tags that appear on more than one component).
 */
export function validateNoDuplicateTags(components: Component[]): string[] {
  const tagToComponents = new Map<string, string[]>();
  for (const c of components) {
    for (const tag of c.tags) {
      const existing = tagToComponents.get(tag) ?? [];
      existing.push(c.name);
      tagToComponents.set(tag, existing);
    }
  }
  const violations: string[] = [];
  for (const [tag, comps] of tagToComponents) {
    if (comps.length > 1) {
      violations.push(tag);
    }
  }
  return violations;
}
