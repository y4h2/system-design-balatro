import type { Component } from '../schemas/index.js';

export interface HandState {
  hand: Component[];        // current hand (max 8 + bonus)
  drawPile: Component[];    // remaining cards to draw from
  discardPile: Component[]; // discarded this phase, can't redraw
  discardsRemaining: number;
  handsRemaining: number;   // number of play actions left
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

/** Deal initial hand from component pool. Supports dynamic hand size + hands count. */
export function dealHand(pool: Component[], handSize = 8, discards = 3, hands = 4): HandState {
  const shuffled = shuffle(pool);
  return {
    hand: shuffled.slice(0, handSize),
    drawPile: shuffled.slice(handSize),
    discardPile: [],
    discardsRemaining: discards,
    handsRemaining: hands,
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
    handsRemaining: state.handsRemaining,
  };
}

/**
 * Play selected cards from hand.
 * Played cards go to discard pile, hand refills from draw pile.
 * Returns the new state and the played cards.
 */
export function playFromHand(
  state: HandState,
  selectedIds: string[],
  handSize: number,
): { newState: HandState; played: Component[] } {
  if (state.handsRemaining <= 0) {
    return { newState: state, played: [] };
  }
  if (selectedIds.length === 0 || selectedIds.length > 5) {
    return { newState: state, played: [] };
  }

  const played = state.hand.filter(c => selectedIds.includes(c.id));
  const kept = state.hand.filter(c => !selectedIds.includes(c.id));

  // Refill hand from draw pile up to handSize
  const drawCount = Math.min(handSize - kept.length, state.drawPile.length);
  const drawn = state.drawPile.slice(0, drawCount);
  const remainingDraw = state.drawPile.slice(drawCount);

  return {
    newState: {
      hand: [...kept, ...drawn],
      drawPile: remainingDraw,
      discardPile: [...state.discardPile, ...played],
      discardsRemaining: state.discardsRemaining,
      handsRemaining: state.handsRemaining - 1,
    },
    played,
  };
}
