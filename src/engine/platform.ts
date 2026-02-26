import type { Component, Platform, Pattern } from '../schemas/index.js';
import type { Panel } from './scoring.js';

/**
 * Filter components to only include generic + selected platform's exclusive cards.
 */
export function filterComponentsByPlatform(
  allComponents: Component[],
  platformId: string,
): Component[] {
  return allComponents.filter(
    c => c.platform === 'generic' || c.platform === platformId,
  );
}

/**
 * Filter patterns to only include non-platform patterns + selected platform's exclusive patterns.
 */
export function filterPatternsByPlatform(
  allPatterns: Pattern[],
  platformId: string,
): Pattern[] {
  return allPatterns.filter(
    p => !p.platform || p.platform === platformId,
  );
}

/**
 * Apply platform passive: capacity cost modifier.
 *
 * - AWS: platform-exclusive cards get capacity * 0.9 (10% discount)
 * - Azure: cards with [security] or [ha] tags get capacity * 0.85 (15% discount)
 * - Selfhosted: ALL cards get capacity * 1.2 (20% increase)
 * - GCP: no capacity modifier (uses chips bonus instead)
 */
export function getPlatformCapacityCost(
  component: Component,
  platform: Platform,
  baseCost: number,
): number {
  const passive = platform.passive;

  if (passive.type !== 'capacity_discount') return baseCost;

  const factor = passive.factor ?? 1;

  // If match_tags specified, only apply to components with matching tags
  if (passive.match_tags && passive.match_tags.length > 0) {
    const hasMatchTag = component.tags.some(t => passive.match_tags!.includes(t));
    if (!hasMatchTag) return baseCost;
    return Math.ceil(baseCost * factor);
  }

  // AWS: apply only to platform-exclusive cards
  if (platform.id === 'aws') {
    if (component.platform === 'aws') {
      return Math.ceil(baseCost * factor);
    }
    return baseCost;
  }

  // Selfhosted: apply to ALL cards
  if (platform.id === 'selfhosted') {
    return Math.ceil(baseCost * factor);
  }

  return baseCost;
}

/**
 * Apply platform passive: chips bonus.
 *
 * GCP: [db]/[search] tagged components get +2 chips.
 */
export function getPlatformChipBonus(
  deployed: Component[],
  platform: Platform,
): number {
  const passive = platform.passive;
  if (passive.type !== 'chips_bonus') return 0;

  const bonus = passive.bonus ?? 0;
  const matchTags = passive.match_tags ?? [];
  if (matchTags.length === 0 || bonus === 0) return 0;

  let total = 0;
  for (const c of deployed) {
    if (c.tags.some(t => matchTags.includes(t))) {
      total += bonus;
    }
  }
  return total;
}

/**
 * AWS Multi-Region mechanic: if 2+ [ha] components deployed, all components get Rel +1.
 */
export function applyAwsMultiRegion(
  deployed: Component[],
  panel: Panel,
): Panel {
  const haCount = deployed.filter(c => c.tags.includes('ha')).length;
  if (haCount >= 2) {
    return { ...panel, rel: Math.min(10, panel.rel + 1) };
  }
  return panel;
}

/**
 * Selfhosted Full Control mechanic: all components CX +1.
 * Returns the extra CX to add to the panel.
 */
export function applySelfhostedCxPenalty(
  deployed: Component[],
  panel: Panel,
): Panel {
  if (deployed.length === 0) return panel;
  return { ...panel, cx: Math.min(10, panel.cx + 1) };
}

/**
 * Azure Compliance Shield mechanic:
 * required_tags: ["security"] constraints are automatically satisfied.
 * Returns filtered required_tags with "security" removed.
 */
export function applyAzureComplianceShield(
  requiredTags: string[] | undefined,
): string[] | undefined {
  if (!requiredTags) return requiredTags;
  return requiredTags.filter(t => t !== 'security');
}

/**
 * GCP BigData Pipeline mechanic:
 * If 3+ data domain components are deployed, auto-trigger the "数据湖" pattern.
 * This is handled by the pattern itself (p_data_lake) having requires_domain: data >= 3.
 * No extra logic needed here - the pattern detection handles it.
 */

/**
 * Selfhosted Full Control: no over-budget penalty.
 * Returns true if over-budget penalty should be suppressed.
 */
export function shouldSuppressOverBudgetPenalty(platform: Platform): boolean {
  return platform.id === 'selfhosted';
}

/**
 * Check if DIY Full Stack pattern should trigger (5 domains each with at least 1 card).
 */
export function checkDiyFullStack(deployed: Component[]): boolean {
  const domains = new Set(deployed.map(c => c.domain));
  return domains.size >= 5;
}
