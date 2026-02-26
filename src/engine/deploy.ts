import type { Component, Platform } from '../schemas/index.js';
import type { School } from '../schemas/school.js';
import { getPlatformCapacityCost, shouldSuppressOverBudgetPenalty } from './platform.js';

export function getEffectiveCapacityCost(
  component: Component,
  modifiers: School['modifiers'],
  platform?: Platform,
): number {
  // Apply school discount first
  let cost = component.capacity_cost;
  const hasDiscountTag = component.tags.some(t =>
    modifiers.capacity_discount_tags.includes(t),
  );
  if (hasDiscountTag) {
    cost = Math.ceil(cost * modifiers.capacity_discount_factor);
  }

  // Then apply platform capacity modifier
  if (platform) {
    cost = getPlatformCapacityCost(component, platform, cost);
  }

  return cost;
}

export interface DeploymentValidation {
  totalCost: number;
  overBudget: boolean;
  penalty: number;
}

export function validateDeployment(
  components: Component[],
  budget: number,
  modifiers: School['modifiers'],
  platform?: Platform,
): DeploymentValidation {
  const totalCost = components.reduce(
    (sum, c) => sum + getEffectiveCapacityCost(c, modifiers, platform),
    0,
  );
  const overBudget = totalCost > budget;
  // Selfhosted Full Control: no over-budget penalty
  const suppressPenalty = platform ? shouldSuppressOverBudgetPenalty(platform) : false;
  const penalty = (overBudget && !suppressPenalty) ? (totalCost - budget) * 5 : 0;
  return { totalCost, overBudget, penalty };
}
