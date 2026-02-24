import chalk from 'chalk';
import type { Scenario, Phase, School, Component, Joker } from '../schemas/index.js';
import type { GameState } from '../engine/state.js';
import type { RiskReport } from '../engine/risk.js';

const DIVIDER = chalk.gray('─'.repeat(50));
const SECTION_DIVIDER = chalk.gray('═'.repeat(50));

function signedNum(n: number): string {
  if (n > 0) return chalk.green(`+${n}`);
  if (n < 0) return chalk.red(`${n}`);
  return chalk.gray(`${n}`);
}

function formatDelta(delta: { perf: number; rel: number; cx: number }): string {
  return `perf:${signedNum(delta.perf)} rel:${signedNum(delta.rel)} cx:${signedNum(delta.cx)}`;
}

function blindLabel(blind: 'small' | 'big' | 'boss'): string {
  switch (blind) {
    case 'small': return chalk.cyan('小盲 (Small Blind)');
    case 'big': return chalk.yellow('大盲 (Big Blind)');
    case 'boss': return chalk.red.bold('Boss 盲 (Boss Blind)');
  }
}

/**
 * Display the scenario overview with all 3 phases.
 */
export function renderScenarioOverview(scenario: Scenario): void {
  console.log(SECTION_DIVIDER);
  console.log(chalk.bold.cyan(`  场景 (Scenario): ${scenario.name}`));
  console.log(chalk.gray(`  ${scenario.desc}`));
  console.log();
  console.log(chalk.white(`  标签 (Tags): ${scenario.tags.map(t => chalk.cyan(t)).join(', ')}`));
  console.log(chalk.white(`  初始参数 (Initial): QPS=${scenario.initial.target_qps} 峰值系数=${scenario.initial.peak_factor} 数据=${scenario.initial.data_gb}GB`));
  console.log();

  for (let i = 0; i < scenario.phases.length; i++) {
    const phase = scenario.phases[i];
    console.log(chalk.gray(`  ── Phase ${i + 1}: ${blindLabel(phase.blind)} ──`));
    console.log(chalk.white(`     ${phase.subtitle}`));
    console.log(chalk.white(`     目标分数 (Target): ${chalk.yellow(String(phase.target_score))}  容量预算 (Capacity): ${chalk.yellow(String(phase.capacity_budget))}`));
    console.log(chalk.white(`     权重 (Weights): perf=${phase.weights.perf} rel=${phase.weights.rel} cx=${phase.weights.cx}`));
    if (phase.boss_rule) {
      console.log(chalk.red(`     Boss规则: ${phase.boss_rule}`));
    }
    if (phase.skippable) {
      console.log(chalk.yellow(`     ⚠ 可跳过 (Skippable)`));
    }
  }
  console.log(SECTION_DIVIDER);
}

/**
 * Display a single phase's requirements.
 */
export function renderPhaseInfo(phase: Phase, phaseIndex: number): void {
  console.log(SECTION_DIVIDER);
  console.log(chalk.bold(`  Phase ${phaseIndex + 1}: ${blindLabel(phase.blind)}`));
  console.log(chalk.gray(`  ${phase.subtitle}`));
  console.log(DIVIDER);
  console.log(chalk.white(`  目标分数 (Target Score): ${chalk.yellow.bold(String(phase.target_score))}`));
  console.log(chalk.white(`  容量预算 (Capacity Budget): ${chalk.yellow(String(phase.capacity_budget))}`));
  console.log(chalk.white(`  权重 (Weights): perf=${phase.weights.perf} rel=${phase.weights.rel} cx=${phase.weights.cx}`));
  console.log();
  console.log(chalk.white(`  约束 (Constraints):`));
  console.log(chalk.white(`    SLA: ${phase.constraints.sla}`));
  console.log(chalk.white(`    合规等级 (Compliance): ${phase.constraints.compliance_level}`));
  if (phase.constraints.budget_cost_max !== undefined) {
    console.log(chalk.white(`    最大预算成本 (Max Budget): ${phase.constraints.budget_cost_max}`));
  }
  if (phase.constraints.delivery_weeks_max !== undefined) {
    console.log(chalk.white(`    最大交付周数 (Max Weeks): ${phase.constraints.delivery_weeks_max}`));
  }
  if (phase.boss_rule) {
    console.log(chalk.red.bold(`  Boss规则 (Boss Rule): ${phase.boss_rule}`));
  }
  if (phase.skippable) {
    console.log(chalk.yellow(`  可跳过 (Skippable) - 跳过有奖励`));
  }
  console.log(SECTION_DIVIDER);
}

/**
 * Display school info.
 */
export function renderSchoolInfo(school: School): void {
  console.log(DIVIDER);
  console.log(chalk.bold.magenta(`  流派 (School): ${school.name}`));
  console.log(chalk.gray(`  ${school.desc}`));
  console.log();
  const m = school.modifiers;
  console.log(chalk.white(`  修正 (Modifiers):`));
  console.log(chalk.white(`    选牌轮次 (Draft Rounds): ${m.draft_rounds}`));
  console.log(chalk.white(`    修补次数 (Repair Count): ${m.repair_count}`));
  console.log(chalk.white(`    Joker 栏位: ${m.joker_slots}`));
  if (m.tarot_hand_size !== undefined) {
    console.log(chalk.white(`    塔罗手牌 (Tarot Hand): ${m.tarot_hand_size}`));
  }
  console.log(chalk.white(`    容量预算偏移 (Capacity Offset): ${signedNum(m.capacity_budget_offset)}`));
  console.log(chalk.white(`    事件严重度偏移 (Event Severity Offset): ${signedNum(m.event_severity_offset)}`));
  if (m.capacity_discount_tags.length > 0) {
    console.log(chalk.white(`    容量折扣标签 (Discount Tags): ${m.capacity_discount_tags.join(', ')} (x${m.capacity_discount_factor})`));
  }
  if (m.free_components && m.free_components.length > 0) {
    console.log(chalk.white(`    免费组件 (Free Components): ${m.free_components.join(', ')}`));
  }
  console.log(DIVIDER);
}

/**
 * Display the component pool.
 */
export function renderComponentPool(pool: Component[]): void {
  console.log(DIVIDER);
  console.log(chalk.bold.white(`  组件池 (Component Pool) [${pool.length} 张]`));
  console.log();

  for (const c of pool) {
    const rarityColor = c.rarity === 'rare' ? chalk.yellow : c.rarity === 'uncommon' ? chalk.cyan : chalk.white;
    const categoryBadge = c.category === 'defensive' ? chalk.blue('[防御]') : chalk.green('[功能]');
    console.log(`  ${rarityColor(c.name)} ${categoryBadge} ${chalk.gray(`[${c.tags.join(',')}]`)}`);
    console.log(`    ${formatDelta(c.delta)} | 容量:${chalk.yellow(String(c.capacity_cost))}`);
    if (c.exposes.length > 0) {
      console.log(`    ${chalk.red(`暴露风险: ${c.exposes.join(', ')}`)}`);
    }
    if (c.seals.length > 0) {
      console.log(`    ${chalk.green(`封堵风险: ${c.seals.join(', ')}`)}`);
    }
  }
  console.log(DIVIDER);
}

/**
 * Display deployed components with capacity usage.
 */
export function renderDeployment(deployed: Component[], capacity: number, budget: number): void {
  console.log(DIVIDER);
  console.log(chalk.bold.white(`  已部署 (Deployed) [${deployed.length} 组件]`));
  console.log(chalk.white(`  容量使用 (Capacity): ${capacity}/${budget} ${capacity > budget ? chalk.red('超出!') : chalk.green('OK')}`));
  console.log();

  if (deployed.length === 0) {
    console.log(chalk.gray('  (无已部署组件)'));
  } else {
    for (const c of deployed) {
      const categoryBadge = c.category === 'defensive' ? chalk.blue('[防御]') : chalk.green('[功能]');
      console.log(`  ${chalk.white(c.name)} ${categoryBadge} ${chalk.gray(`[${c.tags.join(',')}]`)}`);
      console.log(`    ${formatDelta(c.delta)} | 容量:${chalk.yellow(String(c.capacity_cost))}`);
    }
  }

  // Show aggregate deltas
  if (deployed.length > 0) {
    const totalDelta = deployed.reduce(
      (acc, c) => ({
        perf: acc.perf + c.delta.perf,
        rel: acc.rel + c.delta.rel,
        cx: acc.cx + c.delta.cx,
      }),
      { perf: 0, rel: 0, cx: 0 },
    );
    console.log();
    console.log(chalk.bold(`  合计面板增量 (Total Delta): ${formatDelta(totalDelta)}`));
  }
  console.log(DIVIDER);
}

/**
 * Display the risk report.
 */
export function renderRiskReport(
  report: RiskReport,
  triggeredPatterns: string[],
  superPatternHints: string[],
): void {
  console.log(DIVIDER);
  console.log(chalk.bold.white('  风险报告 (Risk Report)'));
  console.log();

  if (report.exposed.length > 0) {
    console.log(chalk.red(`  暴露风险 (Exposed Risks): ${report.exposed.join(', ')}`));
  } else {
    console.log(chalk.green('  暴露风险 (Exposed Risks): 无 (None)'));
  }

  if (report.sealed.length > 0) {
    console.log(chalk.green(`  已封堵风险 (Sealed Risks): ${report.sealed.join(', ')}`));
  }

  console.log();

  if (triggeredPatterns.length > 0) {
    console.log(chalk.green.bold(`  已触发模式 (Triggered Patterns):`));
    for (const p of triggeredPatterns) {
      console.log(chalk.green(`    + ${p}`));
    }
  } else {
    console.log(chalk.gray('  已触发模式 (Triggered Patterns): 无 (None)'));
  }

  if (superPatternHints.length > 0) {
    console.log();
    console.log(chalk.magenta.bold(`  超级模式提示 (Super Pattern Hints):`));
    for (const h of superPatternHints) {
      console.log(chalk.magenta(`    * ${h}`));
    }
  }

  console.log(DIVIDER);
}

/**
 * Display draft choices.
 */
export function renderDraftChoices(choices: Component[], round: number, total: number): void {
  console.log(DIVIDER);
  console.log(chalk.bold.white(`  选牌 (Draft) - 第 ${round}/${total} 轮`));
  console.log();

  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    const rarityColor = c.rarity === 'rare' ? chalk.yellow : c.rarity === 'uncommon' ? chalk.cyan : chalk.white;
    const categoryBadge = c.category === 'defensive' ? chalk.blue('[防御]') : chalk.green('[功能]');
    console.log(`  ${chalk.bold(String(i + 1))}. ${rarityColor(c.name)} ${categoryBadge} ${chalk.gray(`[${c.tags.join(',')}]`)}`);
    console.log(`     ${formatDelta(c.delta)} | 容量:${chalk.yellow(String(c.capacity_cost))}`);
    if (c.exposes.length > 0) {
      console.log(`     ${chalk.red(`暴露: ${c.exposes.join(', ')}`)}`);
    }
    if (c.seals.length > 0) {
      console.log(`     ${chalk.green(`封堵: ${c.seals.join(', ')}`)}`);
    }
    console.log(chalk.gray(`     ${c.desc}`));
  }
  console.log(DIVIDER);
}
