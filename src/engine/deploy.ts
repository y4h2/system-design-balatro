import type { Component } from '../schemas/index.js';
import type { School } from '../schemas/school.js';

export function getEffectiveCapacityCost(
  component: Component,
  modifiers: School['modifiers'],
): number {
  const hasDiscountTag = component.tags.some(t =>
    modifiers.capacity_discount_tags.includes(t),
  );
  if (hasDiscountTag) {
    return Math.ceil(component.capacity_cost * modifiers.capacity_discount_factor);
  }
  return component.capacity_cost;
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
): DeploymentValidation {
  const totalCost = components.reduce(
    (sum, c) => sum + getEffectiveCapacityCost(c, modifiers),
    0,
  );
  const overBudget = totalCost > budget;
  const penalty = overBudget ? (totalCost - budget) * 5 : 0;
  return { totalCost, overBudget, penalty };
}
