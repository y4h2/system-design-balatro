export interface ConstraintInput {
  sla: number;
  compliance_level: 'low' | 'medium' | 'high';
  deployedTags: string[];
  rel: number;
  capacityUsed: number;
  capacityBudget: number;
  hasAuditLog: boolean;
  hasEncryption: boolean;
}

export interface ConstraintResult {
  slaPenalty: number;
  compliancePenalty: number;
  capacityPenalty: number;
  totalPenalty: number;
  details: string[];
}

const HA_TAGS = ['multi_az', 'health_check', 'circuit_breaker', 'failover'];

/**
 * Validate SLA, compliance, and capacity constraints.
 * Returns individual and total penalty scores along with human-readable details.
 */
export function validateConstraints(input: ConstraintInput): ConstraintResult {
  const details: string[] = [];
  let slaPenalty = 0;
  let compliancePenalty = 0;
  let capacityPenalty = 0;

  // ── SLA check ─────────────────────────────────────────────────────
  const haCount = HA_TAGS.filter(t => input.deployedTags.includes(t)).length;

  if (input.sla >= 99.99) {
    if (haCount < 2 || input.rel < 6) {
      slaPenalty = 20;
      details.push('SLA 99.99% requires >=2 HA components and rel>=6');
    }
  } else if (input.sla >= 99.95) {
    if (haCount < 1 || input.rel < 5) {
      slaPenalty = 12;
      details.push('SLA 99.95% requires >=1 HA component and rel>=5');
    }
  } else if (input.sla >= 99.9) {
    if (input.rel < 4 && haCount === 0) {
      slaPenalty = 8;
      details.push('SLA 99.9% requires rel>=4 or HA component');
    }
  } else {
    if (input.rel < 3) {
      slaPenalty = 5;
      details.push('Low SLA requires rel>=3');
    }
  }

  // ── Compliance check ──────────────────────────────────────────────
  if (input.compliance_level === 'high') {
    if (!input.hasAuditLog || !input.hasEncryption) {
      compliancePenalty = 15;
      details.push('High compliance requires audit_log + encryption');
    }
  }

  // ── Capacity check ────────────────────────────────────────────────
  if (input.capacityUsed > input.capacityBudget) {
    capacityPenalty = (input.capacityUsed - input.capacityBudget) * 5;
    details.push(`Over budget by ${input.capacityUsed - input.capacityBudget} points`);
  }

  return {
    slaPenalty,
    compliancePenalty,
    capacityPenalty,
    totalPenalty: slaPenalty + compliancePenalty + capacityPenalty,
    details,
  };
}
