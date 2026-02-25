import type { PhaseSettlement } from '../engine/phase-runner.js';

/**
 * Format a PhaseSettlement into a human-readable settlement report.
 *
 * Sections:
 *   1. Solution Summary   2. Patterns        3. Jokers
 *   4. Constraints         5. Final Panel     6. Score Breakdown
 *   7. Result
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

  // 2. 牌型触发 (Patterns)
  lines.push('');
  lines.push('── 牌型触发 ──');
  if (settlement.triggeredPatterns.length > 0) {
    for (const p of settlement.triggeredPatterns) {
      lines.push(`✓ ${p.name} → chips +${p.effects.chips_add}, mult +${p.effects.mult_add}`);
    }
  } else {
    lines.push('无牌型触发');
  }
  if (settlement.triggeredSuperPatterns.length > 0) {
    for (const sp of settlement.triggeredSuperPatterns) {
      lines.push(`★ ${sp.name} (超级牌型)`);
    }
  }
  if (settlement.superPatternRewards && settlement.superPatternRewards.length > 0) {
    for (const r of settlement.superPatternRewards) {
      lines.push(`  → ${r.description}`);
    }
  }

  // 3. Joker 生效 (Jokers)
  lines.push('');
  lines.push('── Joker 生效 ──');
  if (settlement.activeJokers.length > 0) {
    for (const j of settlement.activeJokers) {
      const eff = j.effect;
      let effectStr: string;
      switch (eff.type) {
        case 'mult': effectStr = `×${eff.value}`; break;
        case 'chips': effectStr = `+${eff.value} chips per ${eff.per_tag}`; break;
        case 'pattern_enhance': effectStr = `+${eff.extra_mult} mult per pattern`; break;
        case 'hand_size': effectStr = `hand +${eff.value}`; break;
        case 'discard': effectStr = `discards +${eff.value}`; break;
        case 'gold': effectStr = `+${eff.value} gold per ${eff.per}`; break;
        case 'combo_mult': effectStr = `×${eff.value} (${eff.min_patterns}+ patterns)`; break;
        default: effectStr = 'unknown'; break;
      }
      lines.push(`✓ ${j.name} → ${effectStr}`);
    }
  } else {
    lines.push('无 Joker 生效');
  }

  // 4. 约束校验 (Constraints)
  lines.push('');
  lines.push('── 约束校验 ──');
  if (settlement.constraintResult.failures.length > 0) {
    for (const f of settlement.constraintResult.failures) {
      lines.push(`✗ ${f}`);
    }
    lines.push(`约束扣分: ${settlement.constraintPenalty}`);
  } else {
    lines.push('所有约束满足');
    lines.push(`约束扣分: 0`);
  }
  if (settlement.bossPenalty > 0) {
    lines.push(`Boss 扣分: ${settlement.bossPenalty}`);
  }

  // 5. 最终面板 (Final Panel)
  lines.push('');
  lines.push('── 最终面板 ──');
  lines.push(`Perf: ${settlement.panel.perf}  Rel: ${settlement.panel.rel}  Cx: ${settlement.panel.cx}`);

  // 6. 评分明细 (Score Breakdown)
  lines.push('');
  lines.push('── 评分明细 ──');
  lines.push(`Base Chips: ${settlement.baseChips}`);
  lines.push(`Pattern Chips: ${settlement.patternChips}`);
  lines.push(`Joker Chips: ${settlement.jokerChips}`);
  lines.push(`Total Chips: ${settlement.chips}`);
  lines.push(`Mult: ×${settlement.mult.toFixed(2)}`);
  const totalPenalty = settlement.constraintPenalty + settlement.bossPenalty;
  lines.push(
    `Final: ${settlement.chips} × ${settlement.mult.toFixed(2)} - ${totalPenalty} = ${settlement.finalScore}`,
  );
  lines.push(`目标: ${settlement.targetScore}`);

  // 7. 结果 (Result)
  lines.push('');
  if (settlement.passed) {
    lines.push('★ PASS ★');
  } else {
    lines.push('✗ FAIL ✗');
  }
  lines.push('═══════════════════════════════════');

  return lines.join('\n');
}
