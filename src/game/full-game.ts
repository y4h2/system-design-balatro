import { loadGameData, type GameData } from '../data/loader.js';
import { createGameState } from '../engine/state.js';
import { autoDeal } from '../engine/draft.js';
import { runPhase } from '../engine/phase-runner.js';
import { generateShopInventory, calculatePhaseReward, calculateInterest } from '../engine/shop.js';
import { formatSettlement } from '../ui/explainer.js';
import {
  renderSchoolInfo,
  renderScenarioOverview,
  renderPhaseInfo,
  renderComponentPool,
  renderDeployment,
} from '../ui/renderer.js';
import {
  promptSchoolSelection,
  promptScenarioSelection,
  promptDeploySelection,
  promptRepairAction,
} from '../ui/prompts.js';
import { validateDeployment } from '../engine/deploy.js';
import {
  applySchoolFreeComponents,
  applyVibeCodingStartBonuses,
  getJokerHandSizeBonus,
  getJokerDiscardBonus,
} from '../engine/joker-specials.js';
import { runShopPhase } from '../ui/shop-prompts.js';
import type { Phase, School, Joker, Tarot, BossRule } from '../schemas/index.js';
import type { Panel } from '../engine/scoring.js';
import type { GameState } from '../engine/state.js';

// ── Helpers ─────────────────────────────────────────────────────────

async function loadInquirer() {
  return await import('@inquirer/prompts');
}

function getBaseline(school: School): Panel {
  const overrides = school.modifiers.baseline_overrides ?? {};
  return {
    perf: (overrides as Record<string, number>)['perf'] ?? 2,
    rel: (overrides as Record<string, number>)['rel'] ?? 2,
    cx: (overrides as Record<string, number>)['cx'] ?? 2,
  };
}

async function promptSkipOrPlay(phase: Phase): Promise<'skip' | 'play'> {
  const { select } = await loadInquirer();
  return select<'skip' | 'play'>({
    message: `This ${phase.blind} blind is skippable. Skip or play?`,
    choices: [
      { name: 'Play this blind', value: 'play' },
      { name: 'Skip (collect skip reward)', value: 'skip' },
    ],
  });
}

async function applySkipReward(
  state: GameState,
  phase: Phase,
  data: GameData,
): Promise<void> {
  const { select, checkbox } = await loadInquirer();
  const reward = phase.skip_reward;
  if (!reward) {
    console.log('\n  No skip reward defined for this phase.\n');
    return;
  }

  if (reward.type === 'tarot_pick') {
    const fromCount = typeof reward.from === 'number' ? reward.from : 4;
    const pickCount = reward.pick ?? 2;
    const shuffled = [...data.tarots].sort(() => Math.random() - 0.5);
    const offered = shuffled.slice(0, fromCount);

    console.log(`\n  Skip reward: Pick ${pickCount} tarot(s) from ${offered.length} offered\n`);

    if (pickCount === 1) {
      const picked = await select({
        message: `Choose ${pickCount} tarot:`,
        choices: offered.map(t => ({
          name: `${t.name} - ${t.desc}`,
          value: t,
        })),
      });
      state.tarotHand.push(picked);
      console.log(`  Received tarot: ${picked.name}`);
    } else {
      const picked = await checkbox<Tarot>({
        message: `Choose ${pickCount} tarots:`,
        choices: offered.map(t => ({
          name: `${t.name} - ${t.desc}`,
          value: t,
        })),
      });
      const toAdd = picked.slice(0, pickCount);
      for (const t of toAdd) {
        state.tarotHand.push(t);
        console.log(`  Received tarot: ${t.name}`);
      }
    }
  } else if (reward.type === 'joker_direct_pick') {
    const pickCount = reward.pick ?? 1;
    const ownedIds = state.jokerSlots.map(j => j.id);
    const available = data.jokers.filter(j => !ownedIds.includes(j.id));

    console.log(`\n  Skip reward: Pick ${pickCount} joker(s) from the full pool\n`);

    if (available.length === 0) {
      console.log('  No jokers available to pick.');
      return;
    }

    for (let i = 0; i < pickCount; i++) {
      if (state.jokerSlots.length >= state.jokerSlotMax) {
        console.log('  Joker slots full, cannot pick more.');
        break;
      }
      const remaining = available.filter(j => !state.jokerSlots.some(s => s.id === j.id));
      if (remaining.length === 0) break;

      const picked = await select<Joker>({
        message: `Choose a joker (${i + 1}/${pickCount}):`,
        choices: remaining.map(j => ({
          name: `${j.name} - ${j.desc}`,
          value: j,
        })),
      });
      state.jokerSlots.push(picked);
      console.log(`  Received joker: ${picked.name}`);
    }
  }
}

// ── Main game loop ──────────────────────────────────────────────────

export async function playFullGame(): Promise<void> {
  const data = loadGameData();

  console.log('\n=== System Design Card Game (Full Game) ===\n');

  // 1. School selection
  const school = await promptSchoolSelection(data.schools);
  renderSchoolInfo(school);

  // 2. Scenario selection
  const scenario = await promptScenarioSelection(data.scenarios);
  renderScenarioOverview(scenario);

  // 3. Create game state
  const state = createGameState(scenario, school);
  applySchoolFreeComponents(state, data.components);
  applyVibeCodingStartBonuses(state, data.jokers, data.tarots);

  // 4. Auto-deal initial components
  const ownedIds = new Set(state.componentPool.map(c => c.id));
  const dealt = autoDeal(data.components, ownedIds, school.modifiers.draft_rounds);
  state.componentPool.push(...dealt);
  console.log(`\nAuto-dealt ${dealt.length} components: ${dealt.map(c => c.name).join(', ')}\n`);

  // 5. Run 3 phases
  const baseline = getBaseline(school);

  for (let phaseIdx = 0; phaseIdx < 3; phaseIdx++) {
    const phase = scenario.phases[phaseIdx];
    renderPhaseInfo(phase, phaseIdx);

    // Skip check
    if (phase.skippable) {
      const skipChoice = await promptSkipOrPlay(phase);
      if (skipChoice === 'skip') {
        await applySkipReward(state, phase, data);
        state.phaseResults.push({
          blind: phase.blind,
          score: 0,
          targetScore: phase.target_score,
          passed: false,
          skipped: true,
        });
        console.log(`\n  Skipped ${phase.blind} blind.\n`);
        continue;
      }
    }

    // Look up boss rule
    const bossRuleId = phase.boss_rule;
    const bossRule = bossRuleId
      ? data.bossRules.find(br => br.id === bossRuleId || br.id === `boss_${bossRuleId}`)
      : undefined;

    if (bossRule) {
      console.log(`\n  Boss Rule: ${bossRule.name} - ${bossRule.effect}`);
    }

    // Deploy
    const effectiveBudget = phase.capacity_budget + school.modifiers.capacity_budget_offset;
    renderComponentPool(state.componentPool);
    const deployed = await promptDeploySelection(state.componentPool, effectiveBudget);

    const deployValidation = validateDeployment(deployed, effectiveBudget, school.modifiers);
    renderDeployment(deployed, deployValidation.totalCost, effectiveBudget);

    // Show constraints
    const constraints = phase.constraints;
    console.log('\n  Constraints:');
    if (constraints.min_perf !== undefined) console.log(`    P >= ${constraints.min_perf}`);
    if (constraints.min_rel !== undefined) console.log(`    R >= ${constraints.min_rel}`);
    if (constraints.max_cx !== undefined) console.log(`    CX <= ${constraints.max_cx}`);
    if (constraints.min_domains !== undefined) console.log(`    ${constraints.min_domains}+ domains`);
    if (constraints.required_tags?.length) console.log(`    Required: ${constraints.required_tags.join(', ')}`);
    console.log(`    Penalty per failure: -${constraints.constraint_penalty}`);

    // Run phase
    let settlement = runPhase({
      phase,
      deployed,
      school,
      baseline,
      jokers: state.jokerSlots,
      patterns: data.patterns,
      superPatterns: data.superPatterns,
      bossRule,
    });

    console.log('\n' + formatSettlement(settlement));

    // Repair
    if (!settlement.passed) {
      const repairCount = school.modifiers.repair_count;
      if (repairCount > 0) {
        console.log(`\n  Phase failed! You have ${repairCount} repair attempt(s).\n`);
      }

      for (let r = 0; r < repairCount; r++) {
        const repair = await promptRepairAction(state.componentPool, deployed);
        if (repair.action !== 'skip' && repair.component) {
          deployed.push(repair.component);

          settlement = runPhase({
            phase,
            deployed,
            school,
            baseline,
            jokers: state.jokerSlots,
            patterns: data.patterns,
            superPatterns: data.superPatterns,
            bossRule,
          });

          console.log('\n--- After Repair ---');
          console.log(formatSettlement(settlement));

          if (settlement.passed) break;
        } else {
          break;
        }
      }
    }

    // Record result
    state.phaseResults.push({
      blind: phase.blind,
      score: settlement.finalScore,
      targetScore: settlement.targetScore,
      passed: settlement.passed,
      skipped: false,
    });

    // Gold reward
    const reward = calculatePhaseReward(settlement.passed, phase.blind);
    state.gold += reward + settlement.jokerGold;
    console.log(`\n  Gold reward: +${reward} + ${settlement.jokerGold} joker gold (total: ${state.gold})`);

    // Shop (only after Small and Big blinds)
    if (phaseIdx < 2) {
      const interest = calculateInterest(state.gold);
      if (interest > 0) {
        state.gold += interest;
        console.log(`\n  Interest: +${interest} gold (total: ${state.gold})`);
      }

      const inventory = generateShopInventory(
        data.components, data.jokers, data.tarots,
        state.componentPool.map(c => c.id),
        state.jokerSlots.map(j => j.id),
      );
      await runShopPhase(state, inventory, data);
    }
  }

  // Final result
  console.log('\n=== Game Over ===\n');
  for (const result of state.phaseResults) {
    const status = result.skipped ? 'SKIPPED' : result.passed ? 'PASS' : 'FAIL';
    console.log(`  ${result.blind}: ${status} (${result.score}/${result.targetScore})`);
  }

  const nonSkipped = state.phaseResults.filter(r => !r.skipped);
  const allPassed = nonSkipped.every(r => r.passed);
  console.log(allPassed && nonSkipped.length > 0 ? '\n  Victory!\n' : '\n  Defeat.\n');
}
