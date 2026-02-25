import type { Component } from '../schemas/index.js';

export function autoDeal(
  allComponents: Component[],
  ownedIds: Set<string>,
  count: number,
): Component[] {
  const available = allComponents.filter(c => !ownedIds.has(c.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
