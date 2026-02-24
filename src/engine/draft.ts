import type { Component } from '../schemas/index.js';
import type { GameState } from './state.js';

export function generateDraftChoices(
  allComponents: Component[],
  count: number,
): Component[] {
  const shuffled = [...allComponents].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function applyDraftChoice(state: GameState, chosen: Component): void {
  state.componentPool.push(chosen);
}
