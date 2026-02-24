import { loadGameData } from '../data/loader.js';
import { createGameState } from '../engine/state.js';
import { generateDraftChoices, applyDraftChoice } from '../engine/draft.js';
import { runPhase } from '../engine/phase-runner.js';
import { formatSettlement } from '../ui/explainer.js';
import {
  renderSchoolInfo,
  renderScenarioOverview,
  renderPhaseInfo,
  renderComponentPool,
  renderDraftChoices,
  renderRiskReport,
  renderDeployment,
} from '../ui/renderer.js';
import {
  promptSchoolSelection,
  promptScenarioSelection,
  promptDraftChoice,
  promptDeploySelection,
  promptRepairAction,
} from '../ui/prompts.js';
import { computeRiskExposure } from '../engine/risk.js';
import { validateDeployment } from '../engine/deploy.js';
import type { Event } from '../schemas/index.js';

/**
 * Select a random event matching the phase's severity range.
 */
function selectEvent(events: Event[], severityRange: number[]): Event | undefined {
  const [minSev, maxSev] = severityRange;
  const eligible = events.filter(e => e.severity >= minSev && e.severity <= maxSev);
  if (eligible.length === 0) return undefined;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

/**
 * Run a single-phase (Small Blind only) game session.
 */
export async function playSinglePhase(): Promise<void> {
  const data = loadGameData();

  console.log('\n=== System Design Card Game ===\n');

  // 1. School selection
  const school = await promptSchoolSelection(data.schools);
  renderSchoolInfo(school);

  // 2. Scenario selection
  const scenario = await promptScenarioSelection(data.scenarios);
  renderScenarioOverview(scenario);

  // 3. Create game state
  const state = createGameState(scenario, school);

  // 4. Draft phase
  const draftRounds = school.modifiers.draft_rounds;
  const draftOptions = school.modifiers.draft_options ?? 3;
  console.log(`\nDraft Phase: ${draftRounds} rounds, ${draftOptions} choices each\n`);

  for (let i = 0; i < draftRounds; i++) {
    const choices = generateDraftChoices(data.components, draftOptions);
    renderDraftChoices(choices, i + 1, draftRounds);
    const picked = await promptDraftChoice(choices);
    applyDraftChoice(state, picked);
    console.log(`  Added ${picked.name} to pool\n`);
  }

  // 5. Deploy phase (Small Blind only)
  const phase = scenario.phases[0];
  const effectiveBudget = phase.capacity_budget + school.modifiers.capacity_budget_offset;
  renderPhaseInfo(phase, 0);
  renderComponentPool(state.componentPool);

  const deployed = await promptDeploySelection(state.componentPool, effectiveBudget);

  // Show deployment summary
  const deployValidation = validateDeployment(deployed, effectiveBudget, school.modifiers);
  renderDeployment(deployed, deployValidation.totalCost, effectiveBudget);

  // Show risk report before event
  const riskReport = computeRiskExposure(deployed);
  const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
  const triggeredPatternNames = data.patterns
    .filter(p => {
      const hasAll = p.requires_all_tags.every((t: string) => deployedTags.includes(t));
      if (!hasAll) return false;
      if (p.requires_any_tags.length === 0) return true;
      return p.requires_any_tags.some((t: string) => deployedTags.includes(t));
    })
    .map(p => p.name);

  renderRiskReport(riskReport, triggeredPatternNames, []);

  // 6. Draw event
  const event = selectEvent(data.events, phase.event_pool_severity);
  if (event) {
    console.log(`\n--- Event Drawn ---`);
    console.log(`  ${event.name}: ${event.desc}`);
    console.log(`  Severity: ${event.severity}`);
    console.log(`  Targets: ${event.targets_risks.join(', ')}`);
    console.log(`  "${event.flavor_text}"\n`);
  } else {
    console.log('\n  No matching event for this phase.\n');
  }

  // 7. Build baseline (from school overrides)
  const baselineOverrides = school.modifiers.baseline_overrides ?? {};
  const baseline = {
    perf: (baselineOverrides as Record<string, number>)['perf'] ?? 2,
    rel: (baselineOverrides as Record<string, number>)['rel'] ?? 2,
    cx: (baselineOverrides as Record<string, number>)['cx'] ?? 2,
  };

  // 8. Run phase
  const settlement = runPhase({
    phase,
    deployed,
    school,
    baseline,
    jokers: state.jokerSlots,
    patterns: data.patterns,
    superPatterns: data.superPatterns,
    events: event ? [event] : [],
  });

  // 9. Show settlement
  console.log('\n' + formatSettlement(settlement));

  // 10. Repair phase
  if (!settlement.passed && event) {
    console.log('\nPhase failed! You may attempt a repair.\n');

    const repair = await promptRepairAction(state.componentPool, deployed);
    if (repair.action !== 'skip' && repair.component) {
      const repairedDeployed = [...deployed];

      if (repair.action === 'swap') {
        // Swap: add the new component (simplified - adds to deployment)
        repairedDeployed.push(repair.component);
      } else {
        // Add: add a defensive component
        repairedDeployed.push(repair.component);
      }

      // Re-run with repaired deployment
      const repairedSettlement = runPhase({
        phase,
        deployed: repairedDeployed,
        school,
        baseline,
        jokers: state.jokerSlots,
        patterns: data.patterns,
        superPatterns: data.superPatterns,
        events: event ? [event] : [],
      });

      console.log('\n--- After Repair ---');
      console.log(formatSettlement(repairedSettlement));
    }
  }

  // 11. Final result
  console.log('\n=== Game Over ===\n');
}
