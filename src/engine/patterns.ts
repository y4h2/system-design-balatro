import type { Component, Pattern } from '../schemas/index.js';

/**
 * Detect which patterns are triggered by the deployed components.
 *
 * Supports three matching modes:
 * 1. Tag-based: requires_all_tags + requires_any_tags (existing logic)
 * 2. Domain-based (by pattern ID convention):
 *    - p_domain_pair: any domain with 2+ components
 *    - p_domain_triple: any domain with 3+ components
 *    - p_wide_spectrum: 4+ distinct domains
 * 3. Special:
 *    - p_full_stack: 3+ tier-2 patterns triggered simultaneously
 */
export function detectPatterns(deployed: Component[], patterns: Pattern[]): Pattern[] {
  // Collect all tags from deployed components
  const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];

  // Count components per domain
  const domainCounts = new Map<string, number>();
  for (const c of deployed) {
    domainCounts.set(c.domain, (domainCounts.get(c.domain) ?? 0) + 1);
  }
  const distinctDomains = domainCounts.size;
  const maxDomainCount = Math.max(0, ...domainCounts.values());

  // First pass: detect non-special patterns
  const triggered: Pattern[] = [];
  let fullStackPattern: Pattern | undefined;
  let tier2Count = 0;

  for (const pattern of patterns) {
    // Special: p_full_stack is handled after counting tier-2 patterns
    if (pattern.id === 'p_full_stack') {
      fullStackPattern = pattern;
      continue;
    }

    // Domain-based patterns (by ID)
    if (pattern.id === 'p_domain_pair') {
      if (maxDomainCount >= 2) {
        triggered.push(pattern);
      }
      continue;
    }
    if (pattern.id === 'p_domain_triple') {
      if (maxDomainCount >= 3) {
        triggered.push(pattern);
      }
      continue;
    }
    if (pattern.id === 'p_wide_spectrum') {
      if (distinctDomains >= 4) {
        triggered.push(pattern);
      }
      continue;
    }

    // Domain requirement check
    if (pattern.requires_domain) {
      const { domain, count } = pattern.requires_domain;
      if ((domainCounts.get(domain) ?? 0) < count) continue;
    }

    // Tag-based matching
    const hasAllRequired = pattern.requires_all_tags.every(t => deployedTags.includes(t));
    if (!hasAllRequired) continue;

    if (pattern.requires_any_tags.length > 0) {
      if (!pattern.requires_any_tags.some(t => deployedTags.includes(t))) continue;
    }

    triggered.push(pattern);

    // Count tier-2 patterns (tag-based, non-domain, non-legendary)
    if (!pattern.id.startsWith('p_domain_') && pattern.id !== 'p_cqrs' && pattern.id !== 'p_zero_downtime') {
      tier2Count++;
    }
  }

  // p_full_stack: triggers when 3+ tier-2 tag patterns triggered
  if (fullStackPattern && tier2Count >= 3) {
    triggered.push(fullStackPattern);
  }

  return triggered;
}
