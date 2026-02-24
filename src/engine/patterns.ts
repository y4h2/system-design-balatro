import type { Pattern } from '../schemas/index.js';

export function detectPatterns(deployedTags: string[], patterns: Pattern[]): Pattern[] {
  return patterns.filter(pattern => {
    const hasAllRequired = pattern.requires_all_tags.every(t => deployedTags.includes(t));
    if (!hasAllRequired) return false;
    if (pattern.requires_any_tags.length === 0) return true;
    return pattern.requires_any_tags.some(t => deployedTags.includes(t));
  });
}
