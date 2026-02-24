import { describe, it, expect, vi, afterEach } from 'vitest';
import { selectEvent, selectEvents, rollTarotDropFromEvent } from '../event-selection.js';
import { calculateInterest } from '../shop.js';
import type { Event } from '../../schemas/index.js';

// Helper to build a minimal Event
function makeEvent(id: string, severity: number): Event {
  return {
    id,
    name: `Event ${id}`,
    desc: `desc ${id}`,
    severity,
    targets_risks: ['latency'],
    penalty: { perf: -severity, rel: -severity, cx: -severity },
    flavor_text: `flavor ${id}`,
  };
}

// ── selectEvent ──

describe('selectEvent', () => {
  it('returns undefined for empty pool', () => {
    expect(selectEvent([], [1, 5])).toBeUndefined();
  });

  it('returns undefined when no events match severity range', () => {
    const events = [makeEvent('a', 1), makeEvent('b', 2)];
    expect(selectEvent(events, [4, 5])).toBeUndefined();
  });

  it('returns an event within the severity range', () => {
    const events = [
      makeEvent('a', 1),
      makeEvent('b', 3),
      makeEvent('c', 5),
    ];
    const result = selectEvent(events, [2, 4]);
    expect(result).toBeDefined();
    expect(result!.id).toBe('b');
  });

  it('performs weighted selection (lower severity more likely)', () => {
    const events = [
      makeEvent('low', 1),
      makeEvent('high', 5),
    ];

    // Run many trials
    const counts: Record<string, number> = { low: 0, high: 0 };
    const trials = 10_000;
    for (let i = 0; i < trials; i++) {
      const result = selectEvent(events, [1, 5]);
      if (result) counts[result.id]++;
    }

    // severity 1 => weight 1.0, severity 5 => weight 0.2
    // Expected ratio: low ~83%, high ~17%
    const lowRatio = counts.low / trials;
    expect(lowRatio).toBeGreaterThan(0.7);
    expect(lowRatio).toBeLessThan(0.95);
  });
});

// ── selectEvents ──

describe('selectEvents', () => {
  it('returns requested count without duplicates', () => {
    const events = [
      makeEvent('a', 1),
      makeEvent('b', 2),
      makeEvent('c', 3),
    ];
    const result = selectEvents(events, [1, 3], 2);

    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('returns fewer if not enough eligible events', () => {
    const events = [makeEvent('a', 3)];
    const result = selectEvents(events, [1, 5], 3);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });
});

// ── calculateInterest ──

describe('calculateInterest', () => {
  it('returns correct interest values', () => {
    expect(calculateInterest(0)).toBe(0);
    expect(calculateInterest(4)).toBe(0);
    expect(calculateInterest(5)).toBe(1);
    expect(calculateInterest(9)).toBe(1);
    expect(calculateInterest(10)).toBe(2);
    expect(calculateInterest(24)).toBe(4);
    expect(calculateInterest(25)).toBe(5);
  });

  it('caps interest at 5', () => {
    expect(calculateInterest(30)).toBe(5);
    expect(calculateInterest(100)).toBe(5);
    expect(calculateInterest(999)).toBe(5);
  });
});

// ── rollTarotDropFromEvent ──

describe('rollTarotDropFromEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false for severity < 4', () => {
    expect(rollTarotDropFromEvent(1)).toBe(false);
    expect(rollTarotDropFromEvent(2)).toBe(false);
    expect(rollTarotDropFromEvent(3)).toBe(false);
  });

  it('returns true for severity >= 4 when roll succeeds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // 0.1 < 0.3 => true
    expect(rollTarotDropFromEvent(4)).toBe(true);
    expect(rollTarotDropFromEvent(5)).toBe(true);
  });

  it('returns false for severity >= 4 when roll fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // 0.5 >= 0.3 => false
    expect(rollTarotDropFromEvent(4)).toBe(false);
    expect(rollTarotDropFromEvent(5)).toBe(false);
  });
});
