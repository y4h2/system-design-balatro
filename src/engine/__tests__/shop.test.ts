import { describe, it, expect } from 'vitest';
import { loadGameData } from '../../data/loader.js';
import { createGameState } from '../state.js';
import {
  generateShopInventory,
  getComponentBuyCost,
  getComponentSellValue,
  getJokerSellValue,
  getRemoveCost,
  buyComponent,
  sellComponent,
  buyJoker,
  sellJoker,
  buyTarot,
  removeComponent,
  calculatePhaseReward,
} from '../shop.js';

const data = loadGameData();

const mockPlatform = {
  id: 'aws' as const,
  name: 'AWS',
  desc: 'test',
  positioning: 'test',
  icon: '☁️',
  accent: '#FF9900',
  glow: 'rgba(255,153,0,0.4)',
  passive: { type: 'capacity_discount' as const, factor: 0.9, desc: 'test' },
  mechanic: { id: 'multi_region', name: 'Multi-Region', desc: 'test' },
  exclusive_pattern_id: 'p_serverless_full_stack',
};

function makeState() {
  return createGameState(data.scenarios[0], data.schools[0], mockPlatform);
}

// ── Pricing by rarity ──

describe('pricing', () => {
  it('returns correct buy cost per rarity', () => {
    const common = data.components.find(c => c.rarity === 'common')!;
    const uncommon = data.components.find(c => c.rarity === 'uncommon')!;
    const rare = data.components.find(c => c.rarity === 'rare')!;

    expect(getComponentBuyCost(common)).toBe(3);
    expect(getComponentBuyCost(uncommon)).toBe(5);
    expect(getComponentBuyCost(rare)).toBe(8);
  });

  it('sell value is half buy cost (floored)', () => {
    const common = data.components.find(c => c.rarity === 'common')!;
    const uncommon = data.components.find(c => c.rarity === 'uncommon')!;
    const rare = data.components.find(c => c.rarity === 'rare')!;

    expect(getComponentSellValue(common)).toBe(1);   // floor(3/2)
    expect(getComponentSellValue(uncommon)).toBe(2);  // floor(5/2)
    expect(getComponentSellValue(rare)).toBe(4);      // floor(8/2)
  });

  it('joker sell value is half shop_cost (floored)', () => {
    const joker = data.jokers[0];
    expect(getJokerSellValue(joker)).toBe(Math.floor(joker.shop_cost / 2));
  });

  it('remove cost is a flat 3 gold', () => {
    expect(getRemoveCost()).toBe(3);
  });
});

// ── Shop inventory generation ──

describe('generateShopInventory', () => {
  it('returns up to 3 components, 3 jokers, 2 tarots', () => {
    const inv = generateShopInventory(
      data.components,
      data.jokers,
      data.tarots,
      [],
      [],
      5,
    );
    expect(inv.components.length).toBeLessThanOrEqual(3);
    expect(inv.jokers.length).toBeLessThanOrEqual(3);
    expect(inv.tarots.length).toBeLessThanOrEqual(2);
  });

  it('excludes already-owned component ids', () => {
    const ownedIds = data.components.slice(0, 5).map(c => c.id);
    const inv = generateShopInventory(
      data.components,
      data.jokers,
      data.tarots,
      ownedIds,
      [],
      5,
    );
    for (const c of inv.components) {
      expect(ownedIds).not.toContain(c.id);
    }
  });

  it('excludes already-owned joker ids', () => {
    const ownedJokerIds = data.jokers.slice(0, 2).map(j => j.id);
    const inv = generateShopInventory(
      data.components,
      data.jokers,
      data.tarots,
      [],
      ownedJokerIds,
      5,
    );
    for (const j of inv.jokers) {
      expect(ownedJokerIds).not.toContain(j.id);
    }
  });

  it('returns fewer items when pool is small', () => {
    const inv = generateShopInventory(
      data.components.slice(0, 1),
      data.jokers.slice(0, 1),
      data.tarots.slice(0, 1),
      [],
      [],
      5,
    );
    expect(inv.components).toHaveLength(1);
    expect(inv.jokers).toHaveLength(1);
    expect(inv.tarots).toHaveLength(1);
  });
});

// ── Buy component ──

describe('buyComponent', () => {
  it('deducts gold and adds component to pool', () => {
    const state = makeState();
    const comp = data.components.find(c => c.rarity === 'common')!;
    state.gold = 10;

    const result = buyComponent(state, comp);

    expect(result.success).toBe(true);
    expect(state.gold).toBe(7); // 10 - 3
    expect(state.componentPool).toContain(comp);
  });

  it('fails when not enough gold', () => {
    const state = makeState();
    const comp = data.components.find(c => c.rarity === 'rare')!;
    state.gold = 2; // rare costs 8

    const result = buyComponent(state, comp);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Not enough gold');
    expect(state.gold).toBe(2); // unchanged
    expect(state.componentPool).toHaveLength(0);
  });
});

// ── Sell component ──

describe('sellComponent', () => {
  it('adds gold and removes component from pool', () => {
    const state = makeState();
    const comp = data.components.find(c => c.rarity === 'uncommon')!;
    state.componentPool = [comp];
    state.gold = 5;

    const result = sellComponent(state, comp);

    expect(result.success).toBe(true);
    expect(state.gold).toBe(7); // 5 + floor(5/2) = 7
    expect(state.componentPool).toHaveLength(0);
  });

  it('fails when component not in pool', () => {
    const state = makeState();
    const comp = data.components[0];
    state.gold = 5;

    const result = sellComponent(state, comp);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not in pool');
    expect(state.gold).toBe(5); // unchanged
  });
});

// ── Buy Joker ──

describe('buyJoker', () => {
  it('deducts gold and adds joker to slots', () => {
    const state = makeState();
    const joker = data.jokers[0];
    state.gold = 50;

    const result = buyJoker(state, joker);

    expect(result.success).toBe(true);
    expect(state.gold).toBe(50 - joker.shop_cost);
    expect(state.jokerSlots).toContain(joker);
  });

  it('fails when joker slots full', () => {
    const state = makeState();
    // Fill joker slots to max
    state.jokerSlotMax = 2;
    state.jokerSlots = [data.jokers[0], data.jokers[1]];
    state.gold = 50;

    const joker = data.jokers[2];
    const result = buyJoker(state, joker);

    expect(result.success).toBe(false);
    expect(result.message).toContain('slots full');
    expect(state.jokerSlots).toHaveLength(2); // unchanged
  });

  it('fails when not enough gold', () => {
    const state = makeState();
    const joker = data.jokers[0];
    state.gold = 0;

    const result = buyJoker(state, joker);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Not enough gold');
  });
});

// ── Sell Joker ──

describe('sellJoker', () => {
  it('adds gold and removes joker from slots', () => {
    const state = makeState();
    const joker = data.jokers[0];
    state.jokerSlots = [joker];
    state.gold = 5;

    const result = sellJoker(state, joker);

    expect(result.success).toBe(true);
    expect(state.gold).toBe(5 + Math.floor(joker.shop_cost / 2));
    expect(state.jokerSlots).toHaveLength(0);
  });

  it('fails when joker not equipped', () => {
    const state = makeState();
    const joker = data.jokers[0];
    state.gold = 5;

    const result = sellJoker(state, joker);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not equipped');
  });
});

// ── Buy Tarot ──

describe('buyTarot', () => {
  it('deducts gold and adds tarot to hand', () => {
    const state = makeState();
    const tarot = data.tarots[0];
    state.gold = 50;

    const result = buyTarot(state, tarot);

    expect(result.success).toBe(true);
    expect(state.gold).toBe(50 - tarot.shop_cost);
    expect(state.tarotHand).toContain(tarot);
  });

  it('fails when tarot hand full', () => {
    const state = makeState();
    state.tarotHandMax = 2;
    state.tarotHand = [data.tarots[0], data.tarots[1]];
    state.gold = 50;

    const tarot = data.tarots[2] ?? data.tarots[0]; // in case only 2 tarots exist
    const result = buyTarot(state, tarot);

    expect(result.success).toBe(false);
    expect(result.message).toContain('hand full');
  });

  it('fails when not enough gold', () => {
    const state = makeState();
    const tarot = data.tarots[0];
    state.gold = 0;

    const result = buyTarot(state, tarot);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Not enough gold');
  });
});

// ── Remove component ──

describe('removeComponent', () => {
  it('deducts gold and removes component from pool', () => {
    const state = makeState();
    const comp = data.components[0];
    state.componentPool = [comp];
    state.gold = 10;

    const result = removeComponent(state, comp);

    expect(result.success).toBe(true);
    expect(state.gold).toBe(7); // 10 - 3
    expect(state.componentPool).toHaveLength(0);
  });

  it('fails when not enough gold', () => {
    const state = makeState();
    const comp = data.components[0];
    state.componentPool = [comp];
    state.gold = 1;

    const result = removeComponent(state, comp);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Not enough gold');
    expect(state.componentPool).toHaveLength(1); // unchanged
  });

  it('fails when component not in pool', () => {
    const state = makeState();
    const comp = data.components[0];
    state.gold = 10;

    const result = removeComponent(state, comp);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not in pool');
  });
});

// ── Phase reward calculation ──

describe('calculatePhaseReward', () => {
  it('returns base 5 + blind bonus when passed', () => {
    expect(calculatePhaseReward(true, 'small')).toBe(6);  // 5 + 1
    expect(calculatePhaseReward(true, 'big')).toBe(7);    // 5 + 2
    expect(calculatePhaseReward(true, 'boss')).toBe(8);   // 5 + 3
  });

  it('returns base 2 + blind bonus when failed', () => {
    expect(calculatePhaseReward(false, 'small')).toBe(3); // 2 + 1
    expect(calculatePhaseReward(false, 'big')).toBe(4);   // 2 + 2
    expect(calculatePhaseReward(false, 'boss')).toBe(5);  // 2 + 3
  });
});
