import type { Component, Joker, Tarot } from '../schemas/index.js';
import type { GameState } from './state.js';

// ── Shop inventory generation ──

export interface ShopInventory {
  components: Component[];  // up to 3 random
  jokers: Joker[];          // up to 3 random
  tarots: Tarot[];          // up to 2 random
}

export function generateShopInventory(
  allComponents: Component[],
  allJokers: Joker[],
  allTarots: Tarot[],
  ownedComponentIds: string[],
  ownedJokerIds: string[],
): ShopInventory {
  const availComponents = allComponents
    .filter(c => !ownedComponentIds.includes(c.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const availJokers = allJokers
    .filter(j => !ownedJokerIds.includes(j.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const availTarots = allTarots
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  return { components: availComponents, jokers: availJokers, tarots: availTarots };
}

// ── Pricing ──

export function getComponentBuyCost(component: Component): number {
  switch (component.rarity) {
    case 'rare': return 8;
    case 'uncommon': return 5;
    case 'common': return 3;
  }
}

export function getComponentSellValue(component: Component): number {
  return Math.floor(getComponentBuyCost(component) / 2);
}

export function getJokerSellValue(joker: Joker): number {
  return Math.floor(joker.shop_cost / 2);
}

export function getRemoveCost(): number {
  return 3;
}

// ── Shop actions ──

export interface ShopActionResult {
  success: boolean;
  message: string;
}

export function buyComponent(state: GameState, component: Component): ShopActionResult {
  const cost = getComponentBuyCost(component);
  if (state.gold < cost) {
    return { success: false, message: `Not enough gold (need ${cost}, have ${state.gold})` };
  }
  state.gold -= cost;
  state.componentPool.push(component);
  return { success: true, message: `Bought ${component.name} for ${cost} gold` };
}

export function sellComponent(state: GameState, component: Component): ShopActionResult {
  const idx = state.componentPool.findIndex(c => c.id === component.id);
  if (idx === -1) {
    return { success: false, message: `${component.name} not in pool` };
  }
  const value = getComponentSellValue(component);
  state.gold += value;
  state.componentPool.splice(idx, 1);
  return { success: true, message: `Sold ${component.name} for ${value} gold` };
}

export function buyJoker(state: GameState, joker: Joker): ShopActionResult {
  if (state.jokerSlots.length >= state.jokerSlotMax) {
    return { success: false, message: `Joker slots full (${state.jokerSlotMax})` };
  }
  if (state.gold < joker.shop_cost) {
    return { success: false, message: `Not enough gold (need ${joker.shop_cost}, have ${state.gold})` };
  }
  state.gold -= joker.shop_cost;
  state.jokerSlots.push(joker);
  return { success: true, message: `Bought Joker: ${joker.name} for ${joker.shop_cost} gold` };
}

export function sellJoker(state: GameState, joker: Joker): ShopActionResult {
  const idx = state.jokerSlots.findIndex(j => j.id === joker.id);
  if (idx === -1) {
    return { success: false, message: `${joker.name} not equipped` };
  }
  const value = getJokerSellValue(joker);
  state.gold += value;
  state.jokerSlots.splice(idx, 1);
  return { success: true, message: `Sold Joker: ${joker.name} for ${value} gold` };
}

export function buyTarot(state: GameState, tarot: Tarot): ShopActionResult {
  if (state.tarotHand.length >= state.tarotHandMax) {
    return { success: false, message: `Tarot hand full (${state.tarotHandMax})` };
  }
  if (state.gold < tarot.shop_cost) {
    return { success: false, message: `Not enough gold (need ${tarot.shop_cost}, have ${state.gold})` };
  }
  state.gold -= tarot.shop_cost;
  state.tarotHand.push(tarot);
  return { success: true, message: `Bought Tarot: ${tarot.name} for ${tarot.shop_cost} gold` };
}

export function removeComponent(state: GameState, component: Component): ShopActionResult {
  const cost = getRemoveCost();
  if (state.gold < cost) {
    return { success: false, message: `Not enough gold (need ${cost}, have ${state.gold})` };
  }
  const idx = state.componentPool.findIndex(c => c.id === component.id);
  if (idx === -1) {
    return { success: false, message: `${component.name} not in pool` };
  }
  state.gold -= cost;
  state.componentPool.splice(idx, 1);
  return { success: true, message: `Removed ${component.name} for ${cost} gold` };
}

// ── Gold reward after phase ──

export function calculatePhaseReward(passed: boolean, blind: 'small' | 'big' | 'boss'): number {
  const baseReward = passed ? 5 : 2;
  const blindBonus = blind === 'boss' ? 3 : blind === 'big' ? 2 : 1;
  return baseReward + blindBonus;
}
