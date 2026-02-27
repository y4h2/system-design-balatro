import type { Component, Pattern } from '../schemas/index.js';

// ── Distinct-card matching (bitmask backtracking) ────────────────────

/**
 * Find an assignment where each tag is provided by a different component.
 * Returns a bitmask of used component indices, or null if no assignment exists.
 */
export function matchTagsDistinct(
  played: Component[],
  tags: string[],
  tagIdx = 0,
  usedMask = 0,
): number | null {
  if (tagIdx === tags.length) return usedMask;
  const tag = tags[tagIdx];
  for (let i = 0; i < played.length; i++) {
    if (usedMask & (1 << i)) continue;
    if (!played[i].tags.includes(tag) && !played[i].tags.includes('wildcard')) continue;
    const result = matchTagsDistinct(played, tags, tagIdx + 1, usedMask | (1 << i));
    if (result !== null) return result;
  }
  return null;
}

/**
 * Check if any of the `anyTags` can be provided by a component not already
 * used in `usedMask`.
 */
function matchAnyTagDistinct(
  played: Component[],
  anyTags: string[],
  usedMask: number,
): boolean {
  for (let i = 0; i < played.length; i++) {
    if (usedMask & (1 << i)) continue;
    if (played[i].tags.includes('wildcard') || anyTags.some(t => played[i].tags.includes(t))) return true;
  }
  return false;
}

// ── Pattern detection ────────────────────────────────────────────────

/**
 * Detect which patterns are triggered by the played components.
 *
 * Uses distinct-card matching: each tag requirement must be satisfied
 * by a different component card.
 *
 * Supports:
 * 1. Tag-based: requires_all_tags (distinct) + requires_any_tags (distinct)
 * 2. Domain-based (by pattern ID):
 *    - p_domain_pair: any domain with 2+ components
 *    - p_domain_triple: any domain with 3+ components
 *    - p_wide_spectrum: 4+ distinct domains
 * 3. Domain requirement: requires_domain with count
 * 4. Special: p_diy_full_stack (4 domains each with 1+ card)
 */
export function detectPatterns(played: Component[], patterns: Pattern[]): Pattern[] {
  // Count components per domain
  const domainCounts = new Map<string, number>();
  for (const c of played) {
    domainCounts.set(c.domain, (domainCounts.get(c.domain) ?? 0) + 1);
  }
  const distinctDomains = domainCounts.size;
  const maxDomainCount = Math.max(0, ...domainCounts.values());

  const triggered: Pattern[] = [];
  let diyFullStackPattern: Pattern | undefined;

  for (const pattern of patterns) {
    // Special: p_diy_full_stack requires 4 distinct domains
    if (pattern.id === 'p_diy_full_stack') {
      diyFullStackPattern = pattern;
      continue;
    }

    // Domain-based patterns (by ID)
    if (pattern.id === 'p_domain_pair') {
      if (maxDomainCount >= 2) triggered.push(pattern);
      continue;
    }
    if (pattern.id === 'p_domain_triple') {
      if (maxDomainCount >= 3) triggered.push(pattern);
      continue;
    }
    if (pattern.id === 'p_wide_spectrum') {
      if (distinctDomains >= 4) triggered.push(pattern);
      continue;
    }

    // Domain requirement check
    if (pattern.requires_domain) {
      const { domain, count } = pattern.requires_domain;
      if ((domainCounts.get(domain) ?? 0) < count) continue;
    }

    // Tag-based matching with distinct-card constraint
    if (pattern.requires_all_tags.length > 0) {
      const usedMask = matchTagsDistinct(played, pattern.requires_all_tags);
      if (usedMask === null) continue;

      // Check requires_any_tags with a card not already used
      if (pattern.requires_any_tags.length > 0) {
        if (!matchAnyTagDistinct(played, pattern.requires_any_tags, usedMask)) continue;
      }
    } else if (pattern.requires_any_tags.length > 0) {
      // Only requires_any_tags, no requires_all_tags
      if (!matchAnyTagDistinct(played, pattern.requires_any_tags, 0)) continue;
    } else if (!pattern.requires_domain) {
      // No tag or domain requirements — skip (shouldn't match anything)
      continue;
    }

    triggered.push(pattern);
  }

  // p_diy_full_stack: triggers when 5 distinct domains present
  if (diyFullStackPattern && distinctDomains >= 4) {
    triggered.push(diyFullStackPattern);
  }

  return triggered;
}

// ── Route conflict resolution ────────────────────────────────────────

/**
 * Resolve route conflicts among triggered patterns.
 *
 * Rules:
 * - Free patterns always apply
 * - Route A/B/C patterns are mutually exclusive
 * - If patterns from multiple routes trigger, the route with highest
 *   total reward (Σ chips_add + Σ mult_add) wins
 */
export function resolveRouteConflict(triggered: Pattern[]): {
  activePatterns: Pattern[];
  discardedPatterns: Pattern[];
  winningRoute: string | null;
} {
  const freePatterns = triggered.filter(p => !p.route || p.route === 'free');
  const routeA = triggered.filter(p => p.route === 'A');
  const routeB = triggered.filter(p => p.route === 'B');
  const routeC = triggered.filter(p => p.route === 'C');

  const routes: { route: string; patterns: Pattern[]; score: number }[] = [];
  for (const [route, patterns] of [['A', routeA], ['B', routeB], ['C', routeC]] as const) {
    if (patterns.length > 0) {
      const score = patterns.reduce((s, p) => s + p.effects.chips_add + p.effects.mult_add, 0);
      routes.push({ route, patterns, score });
    }
  }

  if (routes.length === 0) {
    return { activePatterns: freePatterns, discardedPatterns: [], winningRoute: null };
  }

  // Pick the route with highest total reward
  routes.sort((a, b) => b.score - a.score);
  const winner = routes[0];
  const discarded = routes.slice(1).flatMap(r => r.patterns);

  return {
    activePatterns: [...freePatterns, ...winner.patterns],
    discardedPatterns: discarded,
    winningRoute: winner.route,
  };
}

// ── Route mastery ────────────────────────────────────────────────────

export interface RouteMastery {
  achieved: boolean;
  route: string | null;
  bonus: number;
}

/**
 * Check if all 3 patterns of the same route were triggered across
 * different hands. Route mastery bonus = 20 chips × mult bonus.
 */
export function checkRouteMastery(
  hands: { winningRoute: string | null; triggeredPatterns: Pattern[] }[],
): RouteMastery {
  // Collect all route pattern IDs triggered across all hands, grouped by route
  const routePatternIds = new Map<string, Set<string>>();

  for (const hand of hands) {
    for (const p of hand.triggeredPatterns) {
      if (p.route && p.route !== 'free') {
        if (!routePatternIds.has(p.route)) {
          routePatternIds.set(p.route, new Set());
        }
        routePatternIds.get(p.route)!.add(p.id);
      }
    }
  }

  // Route A has 3 patterns, B has 3, C has 3
  const routePatternCounts: Record<string, number> = { A: 3, B: 3, C: 3 };

  for (const [route, ids] of routePatternIds) {
    if (ids.size >= (routePatternCounts[route] ?? 3)) {
      return { achieved: true, route, bonus: 20 };
    }
  }

  return { achieved: false, route: null, bonus: 0 };
}
