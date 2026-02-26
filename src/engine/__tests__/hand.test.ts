import { describe, it, expect } from 'vitest';
import { dealHand, discardAndDraw, type HandState } from '../hand.js';
import type { Component } from '../../schemas/index.js';

function makeComponent(id: string): Component {
  return {
    id,
    name: `Component ${id}`,
    desc: '',
    tags: ['tag_a'],
    delta: { perf: 1, rel: 0, cx: 0 },
    capacity_cost: 2,
    exposes: [],
    seals: [],
    requires_tags: [],
    conflicts_tags: [],
    rarity: 'common',
    category: 'functional',
    platform: 'generic',
  };
}

function makePool(n: number): Component[] {
  return Array.from({ length: n }, (_, i) => makeComponent(`c${i + 1}`));
}

describe('dealHand', () => {
  it('deals hand of requested size from pool', () => {
    const pool = makePool(12);
    const state = dealHand(pool, 8);
    expect(state.hand).toHaveLength(8);
    expect(state.drawPile).toHaveLength(4);
    expect(state.discardPile).toHaveLength(0);
    expect(state.discardsRemaining).toBe(3);
  });

  it('deals all cards when pool smaller than hand size', () => {
    const pool = makePool(5);
    const state = dealHand(pool, 8);
    expect(state.hand).toHaveLength(5);
    expect(state.drawPile).toHaveLength(0);
  });

  it('contains all pool cards across hand + drawPile', () => {
    const pool = makePool(12);
    const state = dealHand(pool, 8);
    const allIds = [...state.hand, ...state.drawPile].map(c => c.id).sort();
    const poolIds = pool.map(c => c.id).sort();
    expect(allIds).toEqual(poolIds);
  });

  it('deals empty hand from empty pool', () => {
    const state = dealHand([], 8);
    expect(state.hand).toHaveLength(0);
    expect(state.drawPile).toHaveLength(0);
  });
});

describe('discardAndDraw', () => {
  function makeHandState(handCount: number, drawCount: number, discards = 3): HandState {
    return {
      hand: makePool(handCount),
      drawPile: Array.from({ length: drawCount }, (_, i) => makeComponent(`d${i + 1}`)),
      discardPile: [],
      discardsRemaining: discards,
    };
  }

  it('discards selected cards and draws replacements', () => {
    const state = makeHandState(8, 4);
    const toDiscard = [state.hand[0].id, state.hand[1].id];
    const result = discardAndDraw(state, toDiscard);

    expect(result.hand).toHaveLength(8); // 6 kept + 2 drawn
    expect(result.drawPile).toHaveLength(2); // 4 - 2 drawn
    expect(result.discardPile).toHaveLength(2);
    expect(result.discardsRemaining).toBe(2);
  });

  it('does not include discarded cards in hand', () => {
    const state = makeHandState(8, 4);
    const discardId = state.hand[0].id;
    const result = discardAndDraw(state, [discardId]);

    expect(result.hand.find(c => c.id === discardId)).toBeUndefined();
    expect(result.discardPile.find(c => c.id === discardId)).toBeDefined();
  });

  it('draws fewer when draw pile is smaller than discard count', () => {
    const state = makeHandState(8, 1);
    const toDiscard = [state.hand[0].id, state.hand[1].id, state.hand[2].id];
    const result = discardAndDraw(state, toDiscard);

    expect(result.hand).toHaveLength(6); // 5 kept + 1 drawn
    expect(result.drawPile).toHaveLength(0);
    expect(result.discardPile).toHaveLength(3);
  });

  it('works when draw pile is empty (no replacements)', () => {
    const state = makeHandState(8, 0);
    const toDiscard = [state.hand[0].id];
    const result = discardAndDraw(state, toDiscard);

    expect(result.hand).toHaveLength(7);
    expect(result.discardPile).toHaveLength(1);
    expect(result.discardsRemaining).toBe(2);
  });

  it('returns same state when no discards remaining', () => {
    const state = makeHandState(8, 4, 0);
    const result = discardAndDraw(state, [state.hand[0].id]);
    expect(result).toBe(state);
  });

  it('returns same state when selection is empty', () => {
    const state = makeHandState(8, 4);
    const result = discardAndDraw(state, []);
    expect(result).toBe(state);
  });

  it('returns same state when selecting more than 5', () => {
    const state = makeHandState(8, 4);
    const toDiscard = state.hand.slice(0, 6).map(c => c.id);
    const result = discardAndDraw(state, toDiscard);
    expect(result).toBe(state);
  });

  it('decrements discard counter each use', () => {
    let state = makeHandState(8, 4, 3);
    state = discardAndDraw(state, [state.hand[0].id]);
    expect(state.discardsRemaining).toBe(2);
    state = discardAndDraw(state, [state.hand[0].id]);
    expect(state.discardsRemaining).toBe(1);
    state = discardAndDraw(state, [state.hand[0].id]);
    expect(state.discardsRemaining).toBe(0);
    // Fourth attempt should be blocked
    const before = state;
    state = discardAndDraw(state, [state.hand[0].id]);
    expect(state).toBe(before);
  });
});
