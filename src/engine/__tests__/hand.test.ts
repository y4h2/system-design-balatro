import { describe, it, expect } from 'vitest';
import { dealHand, discardAndDraw, playFromHand, type HandState } from '../hand.js';
import type { Component } from '../../schemas/index.js';

function makeComponent(id: string): Component {
  return {
    id,
    name: `Component ${id}`,
    desc: '',
    domain: 'compute',
    tags: ['tag_a'],
    base_chips: 3,
    delta: { perf: 1, rel: 0, cx: 0 },
    capacity_cost: 2,
    rarity: 'common',
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
    expect(state.handsRemaining).toBe(4);
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

  it('accepts custom hands count', () => {
    const state = dealHand(makePool(12), 8, 3, 6);
    expect(state.handsRemaining).toBe(6);
  });
});

describe('discardAndDraw', () => {
  function makeHandState(handCount: number, drawCount: number, discards = 3): HandState {
    return {
      hand: makePool(handCount),
      drawPile: Array.from({ length: drawCount }, (_, i) => makeComponent(`d${i + 1}`)),
      discardPile: [],
      discardsRemaining: discards,
      handsRemaining: 4,
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
    expect(result.handsRemaining).toBe(4); // unchanged
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

describe('playFromHand', () => {
  function makeHandState(handCount: number, drawCount: number, hands = 4): HandState {
    return {
      hand: makePool(handCount),
      drawPile: Array.from({ length: drawCount }, (_, i) => makeComponent(`d${i + 1}`)),
      discardPile: [],
      discardsRemaining: 3,
      handsRemaining: hands,
    };
  }

  it('plays selected cards and refills hand', () => {
    const state = makeHandState(8, 10);
    const toPlay = [state.hand[0].id, state.hand[1].id, state.hand[2].id];
    const { newState, played } = playFromHand(state, toPlay, 8);

    expect(played).toHaveLength(3);
    expect(newState.hand).toHaveLength(8); // 5 kept + 3 drawn
    expect(newState.drawPile).toHaveLength(7); // 10 - 3
    expect(newState.discardPile).toHaveLength(3); // played cards
    expect(newState.handsRemaining).toBe(3); // 4 - 1
  });

  it('played cards go to discard pile', () => {
    const state = makeHandState(8, 10);
    const playId = state.hand[0].id;
    const { newState, played } = playFromHand(state, [playId], 8);

    expect(played[0].id).toBe(playId);
    expect(newState.discardPile.some(c => c.id === playId)).toBe(true);
    expect(newState.hand.some(c => c.id === playId)).toBe(false);
  });

  it('refills to hand size from draw pile', () => {
    const state = makeHandState(8, 20);
    const toPlay = state.hand.slice(0, 5).map(c => c.id);
    const { newState } = playFromHand(state, toPlay, 8);

    expect(newState.hand).toHaveLength(8); // 3 kept + 5 drawn
    expect(newState.drawPile).toHaveLength(15);
  });

  it('refills partially when draw pile is small', () => {
    const state = makeHandState(8, 2);
    const toPlay = state.hand.slice(0, 5).map(c => c.id);
    const { newState } = playFromHand(state, toPlay, 8);

    expect(newState.hand).toHaveLength(5); // 3 kept + 2 drawn (draw pile empty)
    expect(newState.drawPile).toHaveLength(0);
  });

  it('returns empty played when no hands remaining', () => {
    const state = makeHandState(8, 10, 0);
    const { newState, played } = playFromHand(state, [state.hand[0].id], 8);

    expect(played).toHaveLength(0);
    expect(newState).toBe(state);
  });

  it('returns empty played when selection empty or >5', () => {
    const state = makeHandState(8, 10);
    const { played: empty } = playFromHand(state, [], 8);
    expect(empty).toHaveLength(0);

    const tooMany = state.hand.slice(0, 6).map(c => c.id);
    const { played: overMax } = playFromHand(state, tooMany, 8);
    expect(overMax).toHaveLength(0);
  });

  it('decrements handsRemaining but not discardsRemaining', () => {
    const state = makeHandState(8, 10, 4);
    const { newState } = playFromHand(state, [state.hand[0].id], 8);

    expect(newState.handsRemaining).toBe(3);
    expect(newState.discardsRemaining).toBe(3); // unchanged
  });

  it('supports multi-hand flow: play → refill → play → refill', () => {
    let state = makeHandState(8, 20, 4);

    // Hand 1: play 3 cards
    const r1 = playFromHand(state, state.hand.slice(0, 3).map(c => c.id), 8);
    expect(r1.played).toHaveLength(3);
    expect(r1.newState.hand).toHaveLength(8);
    expect(r1.newState.handsRemaining).toBe(3);
    state = r1.newState;

    // Hand 2: play 2 cards
    const r2 = playFromHand(state, state.hand.slice(0, 2).map(c => c.id), 8);
    expect(r2.played).toHaveLength(2);
    expect(r2.newState.hand).toHaveLength(8);
    expect(r2.newState.handsRemaining).toBe(2);
    state = r2.newState;

    // Total discarded = 5
    expect(state.discardPile).toHaveLength(5);
  });
});
