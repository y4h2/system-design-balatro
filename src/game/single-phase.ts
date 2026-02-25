import { loadGameData } from '../data/loader.js';
import { createGameState } from '../engine/state.js';
import { autoDeal } from '../engine/draft.js';
import { runPhase } from '../engine/phase-runner.js';
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
import type { School } from '../schemas/index.js';
import type { Panel } from '../engine/scoring.js';

function getBaseline(school: School): Panel {
  const overrides = school.modifiers.baseline_overrides ?? {};
  return {
    perf: (overrides as Record<string, number>)['perf'] ?? 2,
    rel: (overrides as Record<string, number>)['rel'] ?? 2,
    cx: (overrides as Record<string, number>)['cx'] ?? 2,
  };
}

/**
 * Run a single-phase (Small Blind only) game session.
 */
export async function playSinglePhase(): Promise<void> {
  const data = loadGameData();

  console.log('\n=== System Design Card Game ===\n');

  const school = await promptSchoolSelection(data.schools);
  renderSchoolInfo(school);

  const scenario = await promptScenarioSelection(data.scenarios);
  renderScenarioOverview(scenario);

  const state = createGameState(scenario, school);

  const ownedIds = new Set(state.componentPool.map(c => c.id));
  const dealt = autoDeal(data.components, ownedIds, school.modifiers.draft_rounds);
  state.componentPool.push(...dealt);
  console.log(`\nAuto-dealt ${dealt.length} components: ${dealt.map(c => c.name).join(', ')}\n`);

  const phase = scenario.phases[0];
  const effectiveBudget = phase.capacity_budget + school.modifiers.capacity_budget_offset;
  renderPhaseInfo(phase, 0);
  renderComponentPool(state.componentPool);

  const deployed = await promptDeploySelection(state.componentPool, effectiveBudget);

  const deployValidation = validateDeployment(deployed, effectiveBudget, school.modifiers);
  renderDeployment(deployed, deployValidation.totalCost, effectiveBudget);

  const baseline = getBaseline(school);

  const settlement = runPhase({
    phase,
    deployed,
    school,
    baseline,
    jokers: state.jokerSlots,
    patterns: data.patterns,
    superPatterns: data.superPatterns,
  });

  console.log('\n' + formatSettlement(settlement));

  if (!settlement.passed) {
    console.log('\nPhase failed! You may attempt a repair.\n');

    const repair = await promptRepairAction(state.componentPool, deployed);
    if (repair.action !== 'skip' && repair.component) {
      const repairedDeployed = [...deployed, repair.component];

      const repairedSettlement = runPhase({
        phase,
        deployed: repairedDeployed,
        school,
        baseline,
        jokers: state.jokerSlots,
        patterns: data.patterns,
        superPatterns: data.superPatterns,
      });

      console.log('\n--- After Repair ---');
      console.log(formatSettlement(repairedSettlement));
    }
  }

  console.log('\n=== Game Over ===\n');
}
