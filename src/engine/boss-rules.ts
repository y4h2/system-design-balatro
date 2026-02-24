import type { Component, BossRule } from '../schemas/index.js';

// All risk vectors that can be randomly assigned
const ALL_RISK_VECTORS = [
  'cache_avalanche', 'data_inconsistency', 'replication_lag',
  'message_loss', 'ordering_violation', 'network_partition',
  'cost_explosion', 'false_tripping', 'duplicate_submit',
  'gateway_bottleneck', 'db_single_point', 'slow_query',
  'worker_backlog', 'alert_fatigue', 'cache_invalidation',
  'schema_chaos', 'cold_storage_latency', 'index_lag',
  'cross_shard_query', 'rebalance_risk', 'connection_leak',
  'sticky_session', 'flag_debt', 'cron_overlap',
  'mesh_overhead', 'config_drift', 'split_brain',
  'failover_lag', 'scale_lag', 'false_rejection',
  'single_lb_point', 'stale_data', 'backpressure',
  'lock_contention', 'deadlock', 'event_storm',
  'dns_propagation_delay', 'env_drift', 'false_positive_block',
  'backup_lag', 'cold_start', 'vendor_lock_in',
  'cross_region_lag', 'notification_storm', 'pipeline_lag',
];

export interface BossRuleEffects {
  capacityMultiplierForTags?: { tags: string[]; factor: number };
  capacityBudgetFactor?: number;
  hideRiskReport?: boolean;
  extraRandomRiskPerComponent?: number;
  noDuplicateTags?: boolean;
}

/**
 * Parse a boss rule from JSON data into structured effects.
 */
export function parseBossRuleEffects(bossRule: BossRule): BossRuleEffects {
  const mod = bossRule.modifier as Record<string, unknown>;
  const effects: BossRuleEffects = {};

  if (mod.capacity_multiplier_for_tags) {
    effects.capacityMultiplierForTags = {
      tags: mod.capacity_multiplier_for_tags as string[],
      factor: mod.factor as number,
    };
  }
  if (mod.capacity_budget_factor !== undefined) {
    effects.capacityBudgetFactor = mod.capacity_budget_factor as number;
  }
  if (mod.hide_risk_report) {
    effects.hideRiskReport = true;
  }
  if (mod.extra_random_risk_per_component !== undefined) {
    effects.extraRandomRiskPerComponent = mod.extra_random_risk_per_component as number;
  }
  if (mod.no_duplicate_tags) {
    effects.noDuplicateTags = true;
  }

  return effects;
}

/**
 * Apply capacity cost multiplier for matching tags (e.g., cache_disabled doubles cache costs).
 */
export function applyBossCapacityCost(
  baseCost: number,
  component: Component,
  effects: BossRuleEffects,
): number {
  if (!effects.capacityMultiplierForTags) return baseCost;
  const { tags, factor } = effects.capacityMultiplierForTags;
  const hasTag = component.tags.some(t => tags.includes(t));
  return hasTag ? Math.ceil(baseCost * factor) : baseCost;
}

/**
 * Apply budget factor (e.g., budget_halved = x0.5).
 */
export function applyBossBudgetFactor(budget: number, effects: BossRuleEffects): number {
  if (effects.capacityBudgetFactor === undefined) return budget;
  return Math.floor(budget * effects.capacityBudgetFactor);
}

/**
 * Apply tech debt: add extra random risks to each component's exposes.
 * Returns new component array with modified exposes (does not mutate originals).
 */
export function applyTechDebtRisks(
  components: Component[],
  extraPerComponent: number,
): Component[] {
  return components.map(c => {
    const extraRisks: string[] = [];
    const available = ALL_RISK_VECTORS.filter(r => !c.exposes.includes(r));
    for (let i = 0; i < extraPerComponent && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      extraRisks.push(available.splice(idx, 1)[0]);
    }
    return {
      ...c,
      exposes: [...c.exposes, ...extraRisks],
    };
  });
}

/**
 * Validate no-duplicate-tags constraint.
 * Returns list of tag violations (tags that appear on more than one component).
 */
export function validateNoDuplicateTags(components: Component[]): string[] {
  const tagToComponents = new Map<string, string[]>();
  for (const c of components) {
    for (const tag of c.tags) {
      const existing = tagToComponents.get(tag) ?? [];
      existing.push(c.name);
      tagToComponents.set(tag, existing);
    }
  }
  const violations: string[] = [];
  for (const [tag, comps] of tagToComponents) {
    if (comps.length > 1) {
      violations.push(tag);
    }
  }
  return violations;
}
