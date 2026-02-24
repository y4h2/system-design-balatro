import { loadGameData, type GameData } from '../data/loader.js';
import { createGameState } from '../engine/state.js';
import { generateDraftChoices, applyDraftChoice } from '../engine/draft.js';
import { runPhase } from '../engine/phase-runner.js';
import { generateShopInventory, calculatePhaseReward } from '../engine/shop.js';
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
import { runShopPhase } from '../ui/shop-prompts.js';
import { computeRiskExposure } from '../engine/risk.js';
import { validateDeployment } from '../engine/deploy.js';
import type { Event, Phase, School, Joker, Tarot } from '../schemas/index.js';
import type { Panel } from '../engine/scoring.js';
import type { GameState } from '../engine/state.js';

// ── Helpers ─────────────────────────────────────────────────────────

async function loadInquirer() {
  return await import('@inquirer/prompts');
}

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
 * Derive baseline panel values from school modifiers.
 */
function getBaseline(school: School): Panel {
  const overrides = school.modifiers.baseline_overrides ?? {};
  return {
    perf: (overrides as Record<string, number>)['perf'] ?? 2,
    rel: (overrides as Record<string, number>)['rel'] ?? 2,
    cx: (overrides as Record<string, number>)['cx'] ?? 2,
  };
}

/**
 * Prompt player to skip or play a skippable blind.
 */
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

/**
 * Apply skip reward based on the phase's skip_reward definition.
 *
 * - Small blind skip: pick 2 tarots from 4 random
 * - Big blind skip: pick 1 joker from the full pool
 */
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
    // Offer N random tarots, player picks `pick` of them
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
    // Pick from full joker pool
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
          name: `${j.name} (x${j.multiplier}) - ${j.desc}`,
          value: j,
        })),
      });
      state.jokerSlots.push(picked);
      console.log(`  Received joker: ${picked.name}`);
    }
  }
}

// ── Main game loop ──────────────────────────────────────────────────

/**
 * Run the full three-phase game with shop phases and skip-blind mechanics.
 */
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

  // 5. Run 3 phases
  const baseline = getBaseline(school);
  let allPassed = true;

  for (let phaseIdx = 0; phaseIdx < 3; phaseIdx++) {
    const phase = scenario.phases[phaseIdx];
    renderPhaseInfo(phase, phaseIdx);

    // Skip check (Small/Big only, Boss cannot be skipped)
    if (phase.skippable) {
      const skipChoice = await promptSkipOrPlay(phase);
      if (skipChoice === 'skip') {
        // Apply skip reward
        await applySkipReward(state, phase, data);

        state.phaseResults.push({
          blind: phase.blind,
          score: 0,
          targetScore: phase.target_score,
          passed: false,
          skipped: true,
        });

        // Skipped phases do not count towards allPassed failure
        // (only non-skipped failures count)
        console.log(`\n  Skipped ${phase.blind} blind.\n`);
        // Skip the Shop after this phase too
        continue;
      }
    }

    // Deploy
    const effectiveBudget = phase.capacity_budget + school.modifiers.capacity_budget_offset;
    renderComponentPool(state.componentPool);
    const deployed = await promptDeploySelection(state.componentPool, effectiveBudget);

    // Show deployment summary
    const deployValidation = validateDeployment(deployed, effectiveBudget, school.modifiers);
    renderDeployment(deployed, deployValidation.totalCost, effectiveBudget);

    // Risk report
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

    // Events: Boss gets 2, others get 1
    const eventCount = phase.blind === 'boss' ? 2 : 1;
    const events: Event[] = [];
    for (let i = 0; i < eventCount; i++) {
      const evt = selectEvent(data.events, phase.event_pool_severity);
      if (evt) events.push(evt);
    }

    // Show events
    for (const evt of events) {
      console.log(`\n  Event: ${evt.name} (severity ${evt.severity})`);
      console.log(`  ${evt.flavor_text}`);
      console.log(`  Targets: ${evt.targets_risks.join(', ')}`);
    }
    if (events.length === 0) {
      console.log('\n  No matching event for this phase.\n');
    }

    // Run phase
    let settlement = runPhase({
      phase,
      deployed,
      school,
      baseline,
      jokers: state.jokerSlots,
      patterns: data.patterns,
      superPatterns: data.superPatterns,
      events,
    });

    console.log('\n' + formatSettlement(settlement));

    // Repair (if failed and has repair count)
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
            events,
          });

          console.log('\n--- After Repair ---');
          console.log(formatSettlement(settlement));

          if (settlement.passed) break;
        } else {
          break; // Player chose to skip repair
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

    if (!settlement.passed) allPassed = false;

    // Gold reward
    const reward = calculatePhaseReward(settlement.passed, phase.blind);
    state.gold += reward;
    console.log(`\n  Gold reward: +${reward} (total: ${state.gold})`);

    // Shop (only after Small and Big blinds, not after Boss)
    if (phaseIdx < 2) {
      const ownedComponentIds = state.componentPool.map(c => c.id);
      const ownedJokerIds = state.jokerSlots.map(j => j.id);
      const inventory = generateShopInventory(
        data.components, data.jokers, data.tarots,
        ownedComponentIds, ownedJokerIds,
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

  // Only non-skipped phases need to pass for victory
  const nonSkipped = state.phaseResults.filter(r => !r.skipped);
  const allNonSkippedPassed = nonSkipped.every(r => r.passed);

  if (allNonSkippedPassed && nonSkipped.length > 0) {
    console.log('\n  Victory!\n');
  } else {
    console.log('\n  Defeat.\n');
  }
}
