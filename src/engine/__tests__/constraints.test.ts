import { describe, it, expect } from 'vitest';
import { validateConstraints, type ConstraintInput } from '../constraints.js';

/** Helper to build a ConstraintInput with sensible defaults */
function makeInput(overrides: Partial<ConstraintInput> = {}): ConstraintInput {
  return {
    sla: 99.0,
    compliance_level: 'low',
    deployedTags: [],
    rel: 5,
    capacityUsed: 5,
    capacityBudget: 10,
    hasAuditLog: false,
    hasEncryption: false,
    ...overrides,
  };
}

describe('validateConstraints', () => {
  // ── SLA 99.99% tier ──────────────────────────────────────────────

  it('applies penalty 20 when SLA>=99.99 and HA<2', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.99,
        deployedTags: ['multi_az'], // only 1 HA
        rel: 6,
      }),
    );
    expect(result.slaPenalty).toBe(20);
  });

  it('applies penalty 20 when SLA>=99.99 and rel<6', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.99,
        deployedTags: ['multi_az', 'circuit_breaker'],
        rel: 5, // below 6
      }),
    );
    expect(result.slaPenalty).toBe(20);
  });

  it('no SLA penalty when 99.99 requirements are met', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.99,
        deployedTags: ['multi_az', 'circuit_breaker'],
        rel: 6,
      }),
    );
    expect(result.slaPenalty).toBe(0);
  });

  // ── SLA 99.95% tier ──────────────────────────────────────────────

  it('applies penalty 12 when SLA>=99.95 and HA<1', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.95,
        deployedTags: [], // 0 HA
        rel: 5,
      }),
    );
    expect(result.slaPenalty).toBe(12);
  });

  it('applies penalty 12 when SLA>=99.95 and rel<5', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.95,
        deployedTags: ['health_check'],
        rel: 4, // below 5
      }),
    );
    expect(result.slaPenalty).toBe(12);
  });

  it('no SLA penalty when 99.95 requirements are met', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.95,
        deployedTags: ['failover'],
        rel: 5,
      }),
    );
    expect(result.slaPenalty).toBe(0);
  });

  // ── SLA 99.9% tier ───────────────────────────────────────────────

  it('applies penalty 8 when SLA>=99.9 and rel<4 and no HA', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.9,
        deployedTags: [],
        rel: 3,
      }),
    );
    expect(result.slaPenalty).toBe(8);
  });

  it('no SLA penalty when 99.9 with rel>=4 but no HA', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.9,
        deployedTags: [],
        rel: 4,
      }),
    );
    expect(result.slaPenalty).toBe(0);
  });

  it('no SLA penalty when 99.9 with HA but rel<4', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.9,
        deployedTags: ['multi_az'],
        rel: 2,
      }),
    );
    expect(result.slaPenalty).toBe(0);
  });

  // ── Low SLA tier ─────────────────────────────────────────────────

  it('applies penalty 5 when low SLA and rel<3', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.0,
        rel: 2,
      }),
    );
    expect(result.slaPenalty).toBe(5);
  });

  it('no SLA penalty when low SLA and rel>=3', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.0,
        rel: 3,
      }),
    );
    expect(result.slaPenalty).toBe(0);
  });

  // ── Compliance ────────────────────────────────────────────────────

  it('applies compliance penalty 15 when high compliance and missing audit_log', () => {
    const result = validateConstraints(
      makeInput({
        compliance_level: 'high',
        hasAuditLog: false,
        hasEncryption: true,
      }),
    );
    expect(result.compliancePenalty).toBe(15);
  });

  it('applies compliance penalty 15 when high compliance and missing encryption', () => {
    const result = validateConstraints(
      makeInput({
        compliance_level: 'high',
        hasAuditLog: true,
        hasEncryption: false,
      }),
    );
    expect(result.compliancePenalty).toBe(15);
  });

  it('no compliance penalty when high compliance and both present', () => {
    const result = validateConstraints(
      makeInput({
        compliance_level: 'high',
        hasAuditLog: true,
        hasEncryption: true,
      }),
    );
    expect(result.compliancePenalty).toBe(0);
  });

  it('no compliance penalty for low compliance level', () => {
    const result = validateConstraints(
      makeInput({
        compliance_level: 'low',
        hasAuditLog: false,
        hasEncryption: false,
      }),
    );
    expect(result.compliancePenalty).toBe(0);
  });

  it('no compliance penalty for medium compliance level', () => {
    const result = validateConstraints(
      makeInput({
        compliance_level: 'medium',
        hasAuditLog: false,
        hasEncryption: false,
      }),
    );
    expect(result.compliancePenalty).toBe(0);
  });

  // ── Capacity ──────────────────────────────────────────────────────

  it('applies capacity penalty when over budget', () => {
    const result = validateConstraints(
      makeInput({
        capacityUsed: 15,
        capacityBudget: 10,
      }),
    );
    // (15 - 10) * 5 = 25
    expect(result.capacityPenalty).toBe(25);
  });

  it('no capacity penalty when at budget', () => {
    const result = validateConstraints(
      makeInput({
        capacityUsed: 10,
        capacityBudget: 10,
      }),
    );
    expect(result.capacityPenalty).toBe(0);
  });

  it('no capacity penalty when under budget', () => {
    const result = validateConstraints(
      makeInput({
        capacityUsed: 5,
        capacityBudget: 10,
      }),
    );
    expect(result.capacityPenalty).toBe(0);
  });

  // ── Combined & totalPenalty ───────────────────────────────────────

  it('totalPenalty sums all individual penalties', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.99,
        deployedTags: [],        // 0 HA => slaPenalty 20
        rel: 2,                  // below 6
        compliance_level: 'high',
        hasAuditLog: false,      // missing => compliancePenalty 15
        hasEncryption: false,
        capacityUsed: 12,
        capacityBudget: 10,      // over by 2 => capacityPenalty 10
      }),
    );
    expect(result.slaPenalty).toBe(20);
    expect(result.compliancePenalty).toBe(15);
    expect(result.capacityPenalty).toBe(10);
    expect(result.totalPenalty).toBe(45);
  });

  it('totalPenalty is 0 when all constraints pass', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.0,
        rel: 5,
        compliance_level: 'low',
        capacityUsed: 5,
        capacityBudget: 10,
      }),
    );
    expect(result.totalPenalty).toBe(0);
  });

  // ── Details ───────────────────────────────────────────────────────

  it('populates details with reasons for each penalty', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.99,
        deployedTags: ['multi_az'], // only 1 HA
        rel: 6,
        compliance_level: 'high',
        hasAuditLog: false,
        hasEncryption: true,
        capacityUsed: 13,
        capacityBudget: 10,
      }),
    );
    expect(result.details).toHaveLength(3);
    expect(result.details).toContain('SLA 99.99% requires >=2 HA components and rel>=6');
    expect(result.details).toContain('High compliance requires audit_log + encryption');
    expect(result.details).toContain('Over budget by 3 points');
  });

  it('details is empty when no penalties', () => {
    const result = validateConstraints(
      makeInput({
        sla: 99.0,
        rel: 5,
        compliance_level: 'low',
        capacityUsed: 5,
        capacityBudget: 10,
      }),
    );
    expect(result.details).toEqual([]);
  });
});
