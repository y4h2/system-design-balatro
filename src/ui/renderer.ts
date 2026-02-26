import chalk from 'chalk';
import type { Scenario, Phase, School, Component } from '../schemas/index.js';

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

const DOMAIN_COLORS: Record<string, (s: string) => string> = {
  compute: chalk.blue,
  data: chalk.green,
  network: chalk.yellow,
  defense: chalk.magenta,
  platform: chalk.cyan,
};

function domainBadge(domain: string): string {
  const colorFn = DOMAIN_COLORS[domain] ?? chalk.white;
  return colorFn(`[${domain}]`);
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

    // Constraints
    const c = phase.constraints;
    const parts: string[] = [];
    if (c.min_perf !== undefined) parts.push(`P>=${c.min_perf}`);
    if (c.min_rel !== undefined) parts.push(`R>=${c.min_rel}`);
    if (c.max_cx !== undefined) parts.push(`CX<=${c.max_cx}`);
    if (c.min_domains !== undefined) parts.push(`${c.min_domains}+ domains`);
    if (c.required_tags?.length) parts.push(`need: ${c.required_tags.join(',')}`);
    if (parts.length > 0) {
      console.log(chalk.white(`     约束 (Constraints): ${parts.join(' | ')} (penalty: ${c.constraint_penalty})`));
    }

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
  console.log();
  console.log(chalk.white(`  约束 (Constraints):`));
  const c = phase.constraints;
  if (c.min_perf !== undefined) console.log(chalk.white(`    P >= ${c.min_perf}`));
  if (c.min_rel !== undefined) console.log(chalk.white(`    R >= ${c.min_rel}`));
  if (c.max_cx !== undefined) console.log(chalk.white(`    CX <= ${c.max_cx}`));
  if (c.min_domains !== undefined) console.log(chalk.white(`    ${c.min_domains}+ different domains`));
  if (c.required_tags?.length) console.log(chalk.white(`    Required tags: ${c.required_tags.join(', ')}`));
  console.log(chalk.white(`    Penalty per failure: ${c.constraint_penalty}`));
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
  console.log(chalk.white(`    部署栏位 (Deploy Slots): ${5 + (m.deploy_slots_bonus ?? 0)}`));
  console.log(chalk.white(`    手牌数 (Hand Size): ${8 + (m.hand_size_bonus ?? 0)}`));
  console.log(chalk.white(`    弃牌次数 (Discards): ${3 + (m.discard_bonus ?? 0)}`));
  console.log(chalk.white(`    选牌轮次 (Draft Rounds): ${m.draft_rounds}`));
  console.log(chalk.white(`    修补次数 (Repair Count): ${m.repair_count}`));
  console.log(chalk.white(`    Joker 栏位: ${m.joker_slots}`));
  if (m.tarot_hand_size !== undefined) {
    console.log(chalk.white(`    塔罗手牌 (Tarot Hand): ${m.tarot_hand_size}`));
  }
  console.log(chalk.white(`    容量预算偏移 (Capacity Offset): ${signedNum(m.capacity_budget_offset)}`));
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
    console.log(`  ${rarityColor(c.name)} ${domainBadge(c.domain)} ${chalk.gray(`[${c.tags.join(',')}]`)} chips:${chalk.yellow(String(c.base_chips))}`);
    console.log(`    ${formatDelta(c.delta)} | 容量:${chalk.yellow(String(c.capacity_cost))}`);
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
      console.log(`  ${chalk.white(c.name)} ${domainBadge(c.domain)} ${chalk.gray(`[${c.tags.join(',')}]`)} chips:${chalk.yellow(String(c.base_chips))}`);
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
    const totalChips = deployed.reduce((sum, c) => sum + c.base_chips, 0);
    console.log(chalk.bold(`  合计基础 Chips: ${chalk.yellow(String(totalChips))}`));
  }
  console.log(DIVIDER);
}

/**
 * Display triggered patterns.
 */
export function renderPatterns(
  triggeredPatterns: string[],
  superPatternHints: string[],
): void {
  console.log(DIVIDER);
  console.log(chalk.bold.white('  牌型触发 (Patterns)'));
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
    console.log(`  ${chalk.bold(String(i + 1))}. ${rarityColor(c.name)} ${domainBadge(c.domain)} ${chalk.gray(`[${c.tags.join(',')}]`)} chips:${chalk.yellow(String(c.base_chips))}`);
    console.log(`     ${formatDelta(c.delta)} | 容量:${chalk.yellow(String(c.capacity_cost))}`);
    console.log(chalk.gray(`     ${c.desc}`));
  }
  console.log(DIVIDER);
}
