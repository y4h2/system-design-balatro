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
  },
): boolean {
  const special = joker.condition.special;
  if (!special) return true;

  switch (special) {
    case 'capacity_under_budget':
      return context.capacityUsed <= context.capacityBudget;
    case 'component_count_lte_4':
      return context.deployedCount <= 4;
    default:
      return true; // unknown special, treat as satisfied
  }
}

/**
 * Apply school free components to the game state.
 * Adds free components to the pool without needing to draft or pay.
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
 * Only activates when the school has special_rules with the relevant flags.
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
 * Returns the discount factor (1.0 = no discount, 0.7 = discounted).
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
 * Returns the number of extra risks to add (0 or count).
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
