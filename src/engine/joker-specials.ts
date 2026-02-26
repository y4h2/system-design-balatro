import type { Joker, Component, Tarot } from '../schemas/index.js';
import type { GameState } from './state.js';

/**
 * Check if a Joker's special condition is satisfied.
 * Returns true if no special condition or if it's met.
 */
export function checkJokerSpecialCondition(
  joker: Joker,
  context: {
    capacityUsed: number;
    capacityBudget: number;
    deployedCount: number;
    deployed?: Component[];
  },
): boolean {
  const special = joker.condition.special;
  if (!special) return true;

  switch (special) {
    case 'capacity_under_budget':
      return context.capacityUsed <= context.capacityBudget;
    case 'component_count_lte_3':
      return context.deployedCount <= 3;
    case 'component_count_lte_4':
      return context.deployedCount <= 4;
    case 'five_same_domain': {
      if (!context.deployed || context.deployed.length < 5) return false;
      const domainCounts = new Map<string, number>();
      for (const c of context.deployed) {
        domainCounts.set(c.domain, (domainCounts.get(c.domain) ?? 0) + 1);
      }
      return Math.max(...domainCounts.values()) >= 5;
    }
    case 'all_different_domains': {
      if (!context.deployed || context.deployed.length === 0) return false;
      const domains = new Set(context.deployed.map(c => c.domain));
      return domains.size === context.deployed.length;
    }
    case 'component_count_gte_4':
      return context.deployedCount >= 4;
    case 'capacity_over_budget':
      return context.capacityUsed > context.capacityBudget;
    default:
      return true;
  }
}

/**
 * Compute chip bonus from jokers with 'chips' effect type.
 * Adds N chips for each deployed component containing per_tag.
 */
export function computeJokerChipBonus(jokers: Joker[], deployed: Component[]): number {
  let bonus = 0;
  for (const j of jokers) {
    if (j.effect.type === 'chips') {
      const { per_tag, value } = j.effect;
      if (per_tag) {
        const count = deployed.filter(c => c.tags.includes(per_tag)).length;
        bonus += value * count;
      } else {
        bonus += value;
      }
    }
  }
  return bonus;
}

/**
 * Compute additive mult bonus from pattern_enhance jokers.
 * Each pattern_enhance joker adds extra_mult per triggered pattern.
 */
export function computeJokerMultAdd(jokers: Joker[], patternCount: number): number {
  let bonus = 0;
  for (const j of jokers) {
    if (j.effect.type === 'pattern_enhance') {
      bonus += j.effect.extra_mult * patternCount;
    }
  }
  return bonus;
}

/**
 * Get multiplicative joker values (mult type + combo_mult type).
 */
export function getJokerMultipliers(jokers: Joker[], patternCount: number): number[] {
  const multipliers: number[] = [];
  for (const j of jokers) {
    if (j.effect.type === 'mult') {
      multipliers.push(j.effect.value);
    } else if (j.effect.type === 'combo_mult') {
      if (patternCount >= j.effect.min_patterns) {
        multipliers.push(j.effect.value);
      }
    }
  }
  return multipliers;
}

/**
 * Get hand size bonus from jokers.
 */
export function getJokerHandSizeBonus(jokers: Joker[]): number {
  let bonus = 0;
  for (const j of jokers) {
    if (j.effect.type === 'hand_size') {
      bonus += j.effect.value;
    }
  }
  return bonus;
}

/**
 * Get discard bonus from jokers.
 */
export function getJokerDiscardBonus(jokers: Joker[]): number {
  let bonus = 0;
  for (const j of jokers) {
    if (j.effect.type === 'discard') {
      bonus += j.effect.value;
    }
  }
  return bonus;
}

/**
 * Compute gold earned from joker gold effects.
 */
export function computeJokerGold(jokers: Joker[], patternCount: number): number {
  let gold = 0;
  for (const j of jokers) {
    if (j.effect.type === 'gold') {
      if (j.effect.per === 'pattern') {
        gold += j.effect.value * patternCount;
      } else if (j.effect.per === 'phase') {
        gold += j.effect.value;
      }
    }
  }
  return gold;
}

/**
 * Apply school free components to the game state.
 */
export function applySchoolFreeComponents(
  state: GameState,
  allComponents: Component[],
): void {
  const freeIds = state.school.modifiers.free_components;
  if (!freeIds || freeIds.length === 0) return;

  for (const id of freeIds) {
    const component = allComponents.find(c => c.id === id);
    if (component && !state.componentPool.some(c => c.id === id)) {
      state.componentPool.push(component);
    }
  }
}

/**
 * Apply Vibe Coding start bonuses (random joker + random tarot).
 */
export function applyVibeCodingStartBonuses(
  state: GameState,
  allJokers: Joker[],
  allTarots: Tarot[],
): void {
  const rules = state.school.modifiers.special_rules;
  if (!rules) return;

  if (rules.start_with_random_joker && state.jokerSlots.length < state.jokerSlotMax) {
    const available = allJokers.filter(j => !state.jokerSlots.some(s => s.id === j.id));
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      state.jokerSlots.push(random);
    }
  }

  if (rules.start_with_random_tarot && state.tarotHand.length < state.tarotHandMax) {
    if (allTarots.length > 0) {
      const random = allTarots[Math.floor(Math.random() * allTarots.length)];
      state.tarotHand.push(random);
    }
  }
}

/**
 * Check if Vibe Coding capacity discount applies.
 */
export function rollVibeCodingCapacityDiscount(
  school: { modifiers: { special_rules?: Record<string, boolean | number> } },
): number {
  const rules = school.modifiers.special_rules;
  if (!rules) return 1.0;

  const chance = rules.deploy_capacity_discount_chance;
  const factor = rules.deploy_capacity_discount_factor;
  if (typeof chance !== 'number' || typeof factor !== 'number') return 1.0;

  return Math.random() < chance ? factor : 1.0;
}

/**
 * Check if Vibe Coding extra risk applies.
 */
export function rollVibeCodingExtraRisk(
  school: { modifiers: { special_rules?: Record<string, boolean | number> } },
): number {
  const rules = school.modifiers.special_rules;
  if (!rules) return 0;

  const chance = rules.deploy_extra_risk_chance;
  const count = rules.deploy_extra_random_risk_count;
  if (typeof chance !== 'number' || typeof count !== 'number') return 0;

  return Math.random() < chance ? count : 0;
}
