import type { Tarot, Component, Pattern, Event } from '../schemas/index.js';
import type { GameState } from './state.js';

// ── Context for tarot evaluation ────────────────────────────────────

export interface TarotContext {
  /** Current phase's event pool (for reveal) */
  eventPool: Event[];
  /** Events already drawn (for reveal_next) */
  drawnEvents: Event[];
  /** Next event to be drawn (for reveal_next) */
  nextEvent?: Event;
  /** All patterns available */
  patterns: Pattern[];
  /** Currently deployed components */
  deployed: Component[];
  /** Deployed tags */
  deployedTags: string[];
  /** Current capacity budget */
  capacityBudget: number;
}

// ── Result from applying a tarot ────────────────────────────────────

export interface TarotResult {
  tarot: Tarot;
  success: boolean;
  message: string;
  /** For info reveals, the revealed information */
  revealedInfo?: string;
  /** For state modifies, what changed */
  stateChange?: string;
}

// ── Info-reveal tarots ──────────────────────────────────────────────

/**
 * Apply an info-reveal tarot card.
 */
export function applyInfoRevealTarot(tarot: Tarot, context: TarotContext): TarotResult {
  const effect = tarot.effect as string;

  switch (effect) {
    case 'reveal_next_event': {
      if (context.nextEvent) {
        return {
          tarot,
          success: true,
          message: `${tarot.name}: Revealed next event`,
          revealedInfo: `Next event: ${context.nextEvent.name} (severity ${context.nextEvent.severity}) - targets: ${context.nextEvent.targets_risks.join(', ')}`,
        };
      }
      return { tarot, success: false, message: 'No upcoming events to reveal' };
    }

    case 'reveal_optimal_pattern_with_cost': {
      const patternInfo = context.patterns.map(p => {
        const missingAll = p.requires_all_tags.filter(t => !context.deployedTags.includes(t));
        const hasAny = p.requires_any_tags.length === 0 || p.requires_any_tags.some(t => context.deployedTags.includes(t));
        return { name: p.name, missingAll, hasAny, mult: p.effects.mult_add };
      });
      const info = patternInfo
        .map(p =>
          `${p.name} (mult +${p.mult}): missing tags=[${p.missingAll.join(',')}] any=${p.hasAny ? 'ok' : 'need'}`,
        )
        .join('\n');
      return { tarot, success: true, message: `${tarot.name}: Pattern analysis`, revealedInfo: info };
    }

    case 'reveal_nearest_patterns': {
      const nearestInfo = context.patterns
        .map(p => {
          const missingCount = p.requires_all_tags.filter(t => !context.deployedTags.includes(t)).length;
          const hasAny =
            p.requires_any_tags.length === 0 || p.requires_any_tags.some(t => context.deployedTags.includes(t));
          return { name: p.name, missingCount: missingCount + (hasAny ? 0 : 1) };
        })
        .sort((a, b) => a.missingCount - b.missingCount);
      const info = nearestInfo
        .map(p => `${p.name}: ${p.missingCount === 0 ? 'TRIGGERED' : `needs ${p.missingCount} more tag(s)`}`)
        .join('\n');
      return { tarot, success: true, message: `${tarot.name}: Nearest patterns`, revealedInfo: info };
    }

    case 'reveal_event_pool': {
      if (context.eventPool.length === 0) {
        return { tarot, success: true, message: `${tarot.name}: Event pool is empty`, revealedInfo: 'No events in pool' };
      }
      const info = context.eventPool
        .map(e => `${e.name} (severity ${e.severity}) - ${e.targets_risks.join(', ')}`)
        .join('\n');
      return { tarot, success: true, message: `${tarot.name}: Event pool revealed`, revealedInfo: info };
    }

    default:
      return { tarot, success: false, message: `Unknown effect: ${effect}` };
  }
}

// ── State-modify tarots ─────────────────────────────────────────────

/**
 * Check if a state-modify tarot can be applied given current context.
 */
export function canApplyStateModifyTarot(tarot: Tarot, context: TarotContext): boolean {
  const effect = tarot.effect as Record<string, unknown>;
  switch (effect.action) {
    case 'add_tag_to_component':
      return context.deployed.length > 0;
    case 'seal_risk':
      return true; // always applicable (may not have exposed risks but still usable)
    case 'add_capacity_budget':
      return true;
    case 'reduce_component_capacity':
      return context.deployed.length > 0;
    case 'remove_exposed_risk':
      return context.deployed.some(c => c.exposes.length > 0);
    case 'next_event_penalty_factor':
      return true;
    default:
      return false;
  }
}

/**
 * Apply a state-modify tarot card. Returns the result and optionally
 * the modified state values. Actual state mutation should be done by the caller.
 */
export function applyStateModifyTarot(
  tarot: Tarot,
  context: TarotContext,
  targetIndex?: number,
): TarotResult {
  const effect = tarot.effect as Record<string, unknown>;

  switch (effect.action) {
    case 'add_tag_to_component': {
      if (context.deployed.length === 0) {
        return { tarot, success: false, message: 'No deployed components to add a tag to' };
      }
      const idx = targetIndex ?? 0;
      if (idx < 0 || idx >= context.deployed.length) {
        return { tarot, success: false, message: 'Invalid component index' };
      }
      return {
        tarot,
        success: true,
        message: `${tarot.name}: Ready to add a tag to ${context.deployed[idx].name}`,
        stateChange: `add_tag_to_component:${idx}`,
      };
    }

    case 'seal_risk': {
      const count = (effect.count as number) ?? 1;
      return {
        tarot,
        success: true,
        message: `${tarot.name}: Free seal of ${count} risk(s)`,
        stateChange: `seal_risk:${count}`,
      };
    }

    case 'add_capacity_budget': {
      const amount = (effect.amount as number) ?? 15;
      return {
        tarot,
        success: true,
        message: `${tarot.name}: +${amount} capacity budget`,
        stateChange: `add_capacity_budget:${amount}`,
      };
    }

    case 'reduce_component_capacity': {
      if (context.deployed.length === 0) {
        return { tarot, success: false, message: 'No deployed components to reduce capacity on' };
      }
      const idx = targetIndex ?? 0;
      if (idx < 0 || idx >= context.deployed.length) {
        return { tarot, success: false, message: 'Invalid component index' };
      }
      const factor = (effect.factor as number) ?? 0.7;
      const comp = context.deployed[idx];
      const newCost = Math.floor(comp.capacity_cost * factor);
      return {
        tarot,
        success: true,
        message: `${tarot.name}: ${comp.name} capacity ${comp.capacity_cost} -> ${newCost}`,
        stateChange: `reduce_component_capacity:${idx}:${factor}`,
      };
    }

    case 'remove_exposed_risk': {
      const hasExposed = context.deployed.some(c => c.exposes.length > 0);
      if (!hasExposed) {
        return { tarot, success: false, message: 'No components with exposed risks' };
      }
      const count = (effect.count as number) ?? 1;
      return {
        tarot,
        success: true,
        message: `${tarot.name}: Remove ${count} exposed risk(s)`,
        stateChange: `remove_exposed_risk:${count}`,
      };
    }

    case 'next_event_penalty_factor': {
      const factor = (effect.factor as number) ?? 0.5;
      return {
        tarot,
        success: true,
        message: `${tarot.name}: Next event penalty x${factor}`,
        stateChange: `next_event_penalty_factor:${factor}`,
      };
    }

    default:
      return { tarot, success: false, message: `Unknown action: ${String(effect.action)}` };
  }
}

// ── Hand management ─────────────────────────────────────────────────

/**
 * Use a tarot from the player's hand. Removes it from hand and returns it.
 * Returns undefined if the index is out of range.
 */
export function useTarot(state: GameState, tarotIndex: number): Tarot | undefined {
  if (tarotIndex < 0 || tarotIndex >= state.tarotHand.length) return undefined;
  return state.tarotHand.splice(tarotIndex, 1)[0];
}
