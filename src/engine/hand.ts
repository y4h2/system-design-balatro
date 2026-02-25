import type { Component } from '../schemas/index.js';

export interface HandState {
  hand: Component[];        // current hand (max 8)
  drawPile: Component[];    // remaining cards to draw from
  discardPile: Component[]; // discarded this phase, can't redraw
  discardsRemaining: number;
}

/** Fisher-Yates shuffle (returns new array) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deal initial hand from component pool */
export function dealHand(pool: Component[], handSize = 8): HandState {
  const shuffled = shuffle(pool);
  return {
    hand: shuffled.slice(0, handSize),
    drawPile: shuffled.slice(handSize),
    discardPile: [],
    discardsRemaining: 3,
  };
}

/** Discard selected cards from hand, draw replacements from draw pile */
export function discardAndDraw(state: HandState, selectedIds: string[]): HandState {
  if (state.discardsRemaining <= 0) return state;
  if (selectedIds.length === 0 || selectedIds.length > 5) return state;

  const discarded = state.hand.filter(c => selectedIds.includes(c.id));
  const kept = state.hand.filter(c => !selectedIds.includes(c.id));
  const drawCount = Math.min(discarded.length, state.drawPile.length);
  const drawn = state.drawPile.slice(0, drawCount);
  const remainingDraw = state.drawPile.slice(drawCount);

  return {
    hand: [...kept, ...drawn],
    drawPile: remainingDraw,
    discardPile: [...state.discardPile, ...discarded],
    discardsRemaining: state.discardsRemaining - 1,
  };
}
