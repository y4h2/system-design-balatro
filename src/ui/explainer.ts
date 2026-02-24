import type { PhaseSettlement } from '../engine/phase-runner.js';

/**
 * Format a PhaseSettlement into a human-readable settlement report.
 *
 * Covers all nine sections from PRD section 18:
 *   1. Solution Summary   2. Risk Report    3. Patterns
 *   4. Jokers             5. Event Replay   6. Constraints
 *   7. Final Panel        8. Score Breakdown 9. Result
 */
export function formatSettlement(settlement: PhaseSettlement): string {
  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════');
  lines.push('        结算报告 Settlement');
  lines.push('═══════════════════════════════════');

  // 1. 方案摘要 (Solution Summary)
  lines.push('');
  lines.push('── 方案摘要 ──');
  lines.push(`部署组件: ${settlement.deployedComponents.map(c => c.name).join(', ')}`);
  lines.push(`容量使用: ${settlement.capacityUsed} / ${settlement.capacityBudget}`);

  // 2. 风险报告 (Risk Report)
  lines.push('');
  lines.push('── 风险报告 ──');
  if (settlement.riskReport.exposed.length > 0) {
    lines.push(`⚠ 风险敞口: ${settlement.riskReport.exposed.join(', ')}`);
  }
  if (settlement.riskReport.sealed.length > 0) {
    lines.push(`✓ 已封堵: ${settlement.riskReport.sealed.join(', ')}`);
  }
  if (settlement.riskReport.exposed.length === 0 && settlement.riskReport.sealed.length === 0) {
    lines.push('无风险暴露');
  }

  // 3. 牌型触发 (Patterns)
  lines.push('');
  lines.push('── 牌型触发 ──');
  if (settlement.triggeredPatterns.length > 0) {
    for (const p of settlement.triggeredPatterns) {
      lines.push(`✓ ${p.name} → mult +${p.effects.mult_add}`);
    }
  } else {
    lines.push('无牌型触发');
  }
  if (settlement.triggeredSuperPatterns.length > 0) {
    for (const sp of settlement.triggeredSuperPatterns) {
      lines.push(`★ ${sp.name} (超级牌型)`);
    }
  }

  // 4. Joker 生效 (Jokers)
  lines.push('');
  lines.push('── Joker 生效 ──');
  if (settlement.activeJokers.length > 0) {
    for (let i = 0; i < settlement.activeJokers.length; i++) {
      const j = settlement.activeJokers[i];
      lines.push(`✓ ${j.name} → ×${settlement.jokerMultipliers[i]}`);
    }
  } else {
    lines.push('无 Joker 生效');
  }

  // 5. 事件回放 (Event Replay)
  lines.push('');
  lines.push('── 事件回放 ──');
  if (settlement.eventResults.length > 0) {
    for (const er of settlement.eventResults) {
      const status = er.hit ? '命中' : '未命中';
      const penaltyStr = er.hit
        ? `perf${er.penalty.perf} rel${er.penalty.rel} cx${er.penalty.cx}`
        : '无惩罚';
      lines.push(`${er.event.name} [${status}] → ${penaltyStr}`);
      if (er.hit && er.matchedRisks.length > 0) {
        lines.push(`  攻击风险: ${er.matchedRisks.join(', ')}`);
      }
    }
  } else {
    lines.push('无事件');
  }

  // 6. 约束校验 (Constraints)
  lines.push('');
  lines.push('── 约束校验 ──');
  lines.push(`约束扣分: ${settlement.constraintPenalty}`);
  if (settlement.bossPenalty > 0) {
    lines.push(`Boss 扣分: ${settlement.bossPenalty}`);
  }

  // 7. 最终面板 (Final Panel)
  lines.push('');
  lines.push('── 最终面板 ──');
  lines.push(`Perf: ${settlement.panel.perf}  Rel: ${settlement.panel.rel}  Cx: ${settlement.panel.cx}`);

  // 8. 评分明细 (Score Breakdown)
  lines.push('');
  lines.push('── 评分明细 ──');
  lines.push(`Chips: ${settlement.chips.toFixed(1)}`);
  lines.push(`Mult:  ×${settlement.mult.toFixed(2)}`);
  const totalPenalty = settlement.constraintPenalty + settlement.bossPenalty;
  lines.push(
    `Final: ${settlement.chips.toFixed(1)} × ${settlement.mult.toFixed(2)} - ${totalPenalty} = ${settlement.finalScore}`,
  );
  lines.push(`目标: ${settlement.targetScore}`);

  // 9. 结果 (Result)
  lines.push('');
  if (settlement.passed) {
    lines.push('★ PASS ★');
  } else {
    lines.push('✗ FAIL ✗');
  }
  lines.push('═══════════════════════════════════');

  return lines.join('\n');
}
