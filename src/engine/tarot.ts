import type { Tarot, Component, Domain } from '../schemas/index.js';

/**
 * Apply a tarot card's effect to a target component.
 * Returns a new modified component (immutable).
 */
export function applyTarot(tarot: Tarot, target: Component): Component {
  const effect = tarot.effect;

  switch (effect.type) {
    case 'add_tag': {
      // Add a tag to a component. If target_tag is '*', any component qualifies.
      // If target_tag is specific, only components with that tag qualify.
      if (effect.target_tag !== '*' && !target.tags.includes(effect.target_tag)) {
        return target; // no change - target doesn't match
      }
      if (target.tags.includes(effect.add_tag)) {
        return target; // already has the tag
      }
      return { ...target, tags: [...target.tags, effect.add_tag] };
    }

    case 'add_chips': {
      if (effect.target_tag !== '*' && !target.tags.includes(effect.target_tag)) {
        return target;
      }
      return { ...target, base_chips: target.base_chips + effect.chips };
    }

    case 'change_domain': {
      if (effect.from_domain !== '*' && target.domain !== effect.from_domain) {
        return target;
      }
      // For wildcard to_domain, don't change (caller should provide specific domain)
      if (effect.to_domain === '*') {
        return target;
      }
      return { ...target, domain: effect.to_domain as Domain };
    }

    case 'reduce_cost': {
      if (effect.target_tag !== '*' && !target.tags.includes(effect.target_tag)) {
        return target;
      }
      return {
        ...target,
        capacity_cost: Math.max(1, target.capacity_cost - effect.amount),
      };
    }

    default:
      return target;
  }
}

/**
 * Check if a tarot can be applied to a given component.
 */
export function canApplyTarot(tarot: Tarot, target: Component): boolean {
  const effect = tarot.effect;

  switch (effect.type) {
    case 'add_tag':
      if (effect.target_tag !== '*' && !target.tags.includes(effect.target_tag)) return false;
      if (target.tags.includes(effect.add_tag)) return false; // already has tag
      return true;

    case 'add_chips':
      if (effect.target_tag !== '*' && !target.tags.includes(effect.target_tag)) return false;
      return true;

    case 'change_domain':
      if (effect.from_domain !== '*' && target.domain !== effect.from_domain) return false;
      return true;

    case 'reduce_cost':
      if (effect.target_tag !== '*' && !target.tags.includes(effect.target_tag)) return false;
      return target.capacity_cost > 1;

    default:
      return false;
  }
}
