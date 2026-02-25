import type { Component, PhaseConstraints } from '../schemas/index.js';
import type { Panel } from './scoring.js';

export interface ConstraintResult {
  passed: boolean;
  penalty: number;
  failures: string[];
}

/**
 * Validate phase constraints against deployed components and panel values.
 * Each failed constraint adds its constraint_penalty to the total.
 */
export function validateConstraints(
  panel: Panel,
  deployed: Component[],
  constraints: PhaseConstraints,
): ConstraintResult {
  const failures: string[] = [];
  let penaltyCount = 0;

  // min_perf check
  if (constraints.min_perf !== undefined && panel.perf < constraints.min_perf) {
    failures.push(`P ${panel.perf.toFixed(1)} < required ${constraints.min_perf}`);
    penaltyCount++;
  }

  // min_rel check
  if (constraints.min_rel !== undefined && panel.rel < constraints.min_rel) {
    failures.push(`R ${panel.rel.toFixed(1)} < required ${constraints.min_rel}`);
    penaltyCount++;
  }

  // max_cx check
  if (constraints.max_cx !== undefined && panel.cx > constraints.max_cx) {
    failures.push(`CX ${panel.cx.toFixed(1)} > max ${constraints.max_cx}`);
    penaltyCount++;
  }

  // min_domains check
  if (constraints.min_domains !== undefined) {
    const domains = new Set(deployed.map(c => c.domain));
    if (domains.size < constraints.min_domains) {
      failures.push(`${domains.size} domains < required ${constraints.min_domains}`);
      penaltyCount++;
    }
  }

  // required_tags check
  if (constraints.required_tags && constraints.required_tags.length > 0) {
    const deployedTags = new Set(deployed.flatMap(c => c.tags));
    for (const tag of constraints.required_tags) {
      if (!deployedTags.has(tag)) {
        failures.push(`Missing required tag: ${tag}`);
        penaltyCount++;
      }
    }
  }

  const penalty = penaltyCount * constraints.constraint_penalty;

  return {
    passed: failures.length === 0,
    penalty,
    failures,
  };
}
