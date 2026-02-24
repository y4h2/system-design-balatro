import type { Event } from '../schemas/index.js';

/**
 * Select a random event from the pool, filtered by severity range.
 * Higher severity events are less likely to be drawn.
 *
 * Weight formula: weight = 1 / severity
 * (severity 1 = weight 1.0, severity 5 = weight 0.2)
 */
export function selectEvent(events: Event[], severityRange: number[]): Event | undefined {
  const [minSev, maxSev] = severityRange;
  const eligible = events.filter(e => e.severity >= minSev && e.severity <= maxSev);
  if (eligible.length === 0) return undefined;

  // Weighted random selection
  const weights = eligible.map(e => 1 / e.severity);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let random = Math.random() * totalWeight;
  for (let i = 0; i < eligible.length; i++) {
    random -= weights[i];
    if (random <= 0) return eligible[i];
  }

  return eligible[eligible.length - 1]; // fallback
}

/**
 * Select multiple events (for boss phase which gets 2).
 * Avoids duplicates.
 */
export function selectEvents(events: Event[], severityRange: number[], count: number): Event[] {
  const result: Event[] = [];
  let remaining = [...events];

  for (let i = 0; i < count; i++) {
    const selected = selectEvent(remaining, severityRange);
    if (selected) {
      result.push(selected);
      remaining = remaining.filter(e => e.id !== selected.id);
    }
  }

  return result;
}

/**
 * After surviving a severity 4+ event, 30% chance to receive a random tarot.
 */
export function rollTarotDropFromEvent(eventSeverity: number): boolean {
  if (eventSeverity < 4) return false;
  return Math.random() < 0.3;
}
