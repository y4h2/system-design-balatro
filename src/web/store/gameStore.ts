import { create } from 'zustand';
import { loadGameDataWeb, type GameData } from '../../data/loader-web.js';
import { createGameState, type GameState } from '../../engine/state.js';
import { autoDeal } from '../../engine/draft.js';
import { runPhase, type PhaseSettlement } from '../../engine/phase-runner.js';
import { validateDeployment } from '../../engine/deploy.js';
import { dealHand, discardAndDraw, type HandState } from '../../engine/hand.js';
import {
  generateShopInventory,
  buyComponent,
  sellComponent,
  buyJoker,
  sellJoker,
  buyTarot,
  removeComponent,
  calculatePhaseReward,
  calculateInterest,
  type ShopInventory,
} from '../../engine/shop.js';
import { applySchoolFreeComponents, applyVibeCodingStartBonuses, getJokerHandSizeBonus, getJokerDiscardBonus } from '../../engine/joker-specials.js';
import { detectPatterns } from '../../engine/patterns.js';
import { computePanel, computeChips, computeMult, computeFinalScore, type Panel } from '../../engine/scoring.js';
import { computeJokerChipBonus, computeJokerMultAdd, getJokerMultipliers, computeJokerGold } from '../../engine/joker-specials.js';
import { validateConstraints } from '../../engine/constraints.js';
import { applyTarot } from '../../engine/tarot.js';
import type { Component, Joker, Tarot, School, Phase } from '../../schemas/index.js';
import { MAX_DEPLOY_SLOTS, type Screen } from './types.js';

function getBaseline(school: School): Panel {
  const ov = (school.modifiers.baseline_overrides ?? {}) as Record<string, number>;
  return { perf: ov.perf ?? 2, rel: ov.rel ?? 2, cx: ov.cx ?? 2 };
}

interface GameStore {
  // ── Data ──
  gameData: GameData;
  gameState: GameState | null;
  currentScreen: Screen;

  // ── Play ──
  handState: HandState | null;
  selectedForDeploy: string[];
  selectedForDiscard: string[];
  patternPreview: string[];
  scorePreview: {
    panel: Panel;
    baseChips: number;
    patternChips: number;
    jokerChips: number;
    chips: number;
    mult: number;
    patternMultAdds: number[];
    jokerMults: number[];
    penalty: number;
    constraintFailures: string[];
    finalScore: number;
  } | null;
  settlement: PhaseSettlement | null;

  // ── Shop ──
  shopInventory: ShopInventory | null;

  // ── Actions ──
  startGame(schoolId: string, scenarioId: string): void;

  skipBlind(): void;
  startPlay(): void;
  toggleDeploy(componentId: string): void;
  toggleDiscard(componentId: string): void;
  executeDiscard(): void;
  updatePreview(): void;
  runCurrentPhase(): void;
  applyTarotCard(tarotIndex: number, targetComponentId: string, newDomain?: string): void;

  continueAfterSettlement(): void;

  openShop(): void;
  shopBuyComponent(component: Component): void;
  shopSellComponent(component: Component): void;
  shopBuyJoker(joker: Joker): void;
  shopSellJoker(joker: Joker): void;
  shopBuyTarot(tarot: Tarot): void;
  shopRemoveComponent(component: Component): void;
  closeShop(): void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ── Initial state ──
  gameData: loadGameDataWeb(),
  gameState: null,
  currentScreen: 'title',
  handState: null,
  selectedForDeploy: [],
  selectedForDiscard: [],
  patternPreview: [],
  scorePreview: null,
  settlement: null,
  shopInventory: null,

  // ── Actions ──

  startGame(schoolId, scenarioId) {
    const { gameData } = get();
    const school = gameData.schools.find(s => s.id === schoolId)!;
    const scenario = gameData.scenarios.find(s => s.id === scenarioId)!;
    const state = createGameState(scenario, school);
    applySchoolFreeComponents(state, gameData.components);
    applyVibeCodingStartBonuses(state, gameData.jokers, gameData.tarots);

    // Auto-deal: assign random components to pool
    const ownedIds = new Set(state.componentPool.map(c => c.id));
    const dealt = autoDeal(gameData.components, ownedIds, school.modifiers.draft_rounds);
    state.componentPool.push(...dealt);

    set({ gameState: state, currentScreen: 'blindSelect' });
  },

  skipBlind() {
    const { gameState } = get();
    if (!gameState) return;
    const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
    const nextPhaseIndex = gameState.currentPhaseIndex + 1;
    const updated = {
      ...gameState,
      currentPhaseIndex: nextPhaseIndex,
      phaseResults: [...gameState.phaseResults, {
        blind: phase.blind,
        score: 0,
        targetScore: phase.target_score,
        passed: false,
        skipped: true,
      }],
    };
    if (nextPhaseIndex >= 3) {
      set({ gameState: updated, currentScreen: 'gameOver' });
    } else {
      set({ gameState: updated, currentScreen: 'blindSelect' });
    }
  },

  startPlay() {
    const { gameState } = get();
    if (!gameState) return;

    // Dynamic hand size/discards from joker bonuses
    const handSizeBonus = getJokerHandSizeBonus(gameState.jokerSlots);
    const discardBonus = getJokerDiscardBonus(gameState.jokerSlots);
    const handState = dealHand(gameState.componentPool, 8 + handSizeBonus, 3 + discardBonus);

    set({
      currentScreen: 'play',
      handState,
      selectedForDeploy: [],
      selectedForDiscard: [],
      patternPreview: [],
      scorePreview: null,
      settlement: null,
    });
  },

  toggleDeploy(componentId) {
    set(s => {
      const selected = s.selectedForDeploy.includes(componentId)
        ? s.selectedForDeploy.filter(id => id !== componentId)
        : s.selectedForDeploy.length < MAX_DEPLOY_SLOTS
          ? [...s.selectedForDeploy, componentId]
          : s.selectedForDeploy;
      return { selectedForDeploy: selected };
    });
    setTimeout(() => get().updatePreview(), 0);
  },

  toggleDiscard(componentId) {
    set(s => {
      const selected = s.selectedForDiscard.includes(componentId)
        ? s.selectedForDiscard.filter(id => id !== componentId)
        : s.selectedForDiscard.length < 5
          ? [...s.selectedForDiscard, componentId]
          : s.selectedForDiscard;
      return { selectedForDiscard: selected };
    });
  },

  executeDiscard() {
    const { handState, selectedForDiscard } = get();
    if (!handState || selectedForDiscard.length === 0) return;
    const newHandState = discardAndDraw(handState, selectedForDiscard);
    set({
      handState: newHandState,
      selectedForDiscard: [],
      selectedForDeploy: [],
    });
  },

  updatePreview() {
    const { gameState, gameData, selectedForDeploy, handState } = get();
    if (!gameState) return;
    const deployed = handState?.hand.filter(c => selectedForDeploy.includes(c.id)) ?? [];
    const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
    const triggeredPatterns = detectPatterns(deployed, gameData.patterns);
    const patternPreview = triggeredPatterns.map(p => p.name);

    let scorePreview: GameStore['scorePreview'] = null;
    if (deployed.length > 0) {
      const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
      const baseline = getBaseline(gameState.school);
      const panel = computePanel(deployed, baseline);

      // Joker activation
      const activeJokers = gameState.jokerSlots.filter(j => {
        const { require_all_tags, require_any_tags } = j.condition;
        if (!require_all_tags.every(t => deployedTags.includes(t))) return false;
        if (require_any_tags.length === 0) return true;
        return require_any_tags.some(t => deployedTags.includes(t));
      });

      // Chips
      const baseChips = deployed.reduce((sum, c) => sum + c.base_chips, 0);
      const patternChips = triggeredPatterns.reduce((sum, p) => sum + p.effects.chips_add, 0);
      const jokerChips = computeJokerChipBonus(activeJokers, deployed);
      const chips = computeChips(deployed, patternChips, jokerChips);

      // Mult
      const jokerMultAddTotal = computeJokerMultAdd(activeJokers, triggeredPatterns.length);
      const jokerMultipliers = getJokerMultipliers(activeJokers, triggeredPatterns.length);
      const patternMultAdds = triggeredPatterns.map(p => p.effects.mult_add);
      const jokerMults = jokerMultipliers;
      const mult = computeMult(triggeredPatterns, jokerMultAddTotal, jokerMultipliers);

      // Constraints
      const constraintResult = validateConstraints(panel, deployed, phase.constraints);
      const penalty = constraintResult.penalty;
      const budget = phase.capacity_budget + gameState.school.modifiers.capacity_budget_offset;
      const { penalty: capacityPenalty } = validateDeployment(deployed, budget, gameState.school.modifiers);
      const totalPenalty = penalty + capacityPenalty;

      const finalScore = computeFinalScore(chips, mult, totalPenalty);
      scorePreview = {
        panel, baseChips, patternChips, jokerChips, chips, mult,
        patternMultAdds, jokerMults, penalty: totalPenalty,
        constraintFailures: constraintResult.failures,
        finalScore,
      };
    }

    set({ patternPreview, scorePreview });
  },

  runCurrentPhase() {
    const { gameState, gameData, selectedForDeploy } = get();
    if (!gameState) return;

    try {
      const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
      const { handState } = get();
      const deployed = handState?.hand.filter(c => selectedForDeploy.includes(c.id)) ?? [];

      // Look up boss rule
      const bossRuleId = phase.boss_rule;
      const bossRule = bossRuleId
        ? gameData.bossRules.find(br => br.id === bossRuleId || br.id === `boss_${bossRuleId}`)
        : undefined;

      const settlement = runPhase({
        phase,
        deployed,
        school: gameState.school,
        baseline: getBaseline(gameState.school),
        jokers: gameState.jokerSlots,
        patterns: gameData.patterns,
        superPatterns: gameData.superPatterns,
        bossRule,
      });

      // Record result
      const updatedPhaseResults = [...gameState.phaseResults, {
        blind: phase.blind,
        score: settlement.finalScore,
        targetScore: settlement.targetScore,
        passed: settlement.passed,
        skipped: false,
      }];

      // Gold reward + joker gold earnings
      const reward = calculatePhaseReward(settlement.passed, phase.blind);
      const updatedGold = gameState.gold + reward + settlement.jokerGold;

      set({
        gameState: {
          ...gameState,
          phaseResults: updatedPhaseResults,
          gold: updatedGold,
        },
        settlement,
        currentScreen: 'settlement',
      });
    } catch (err) {
      console.error('[runCurrentPhase] Error:', err);
    }
  },

  applyTarotCard(tarotIndex, targetComponentId, newDomain) {
    const { gameState } = get();
    if (!gameState) return;
    if (tarotIndex < 0 || tarotIndex >= gameState.tarotHand.length) return;

    const tarot = gameState.tarotHand[tarotIndex];
    const targetIdx = gameState.componentPool.findIndex(c => c.id === targetComponentId);
    if (targetIdx === -1) return;

    let tarotToApply = tarot;
    // For change_domain with wildcard, create a concrete version
    if (tarot.effect.type === 'change_domain' && tarot.effect.to_domain === '*' && newDomain) {
      tarotToApply = {
        ...tarot,
        effect: { ...tarot.effect, to_domain: newDomain },
      };
    }

    const modified = applyTarot(tarotToApply, gameState.componentPool[targetIdx]);
    const updatedPool = [...gameState.componentPool];
    updatedPool[targetIdx] = modified;

    const updatedTarotHand = gameState.tarotHand.filter((_, i) => i !== tarotIndex);

    set({
      gameState: {
        ...gameState,
        componentPool: updatedPool,
        tarotHand: updatedTarotHand,
      },
    });
  },

  continueAfterSettlement() {
    const { gameState } = get();
    if (!gameState) return;
    const nextPhaseIndex = gameState.currentPhaseIndex + 1;
    const updated = { ...gameState, currentPhaseIndex: nextPhaseIndex };
    if (nextPhaseIndex >= 3) {
      set({ gameState: updated, currentScreen: 'gameOver' });
    } else {
      if (nextPhaseIndex <= 2) {
        set({ gameState: updated });
        get().openShop();
      } else {
        set({ gameState: updated, currentScreen: 'blindSelect' });
      }
    }
  },

  openShop() {
    const { gameState, gameData } = get();
    if (!gameState) return;
    const interest = calculateInterest(gameState.gold);
    const inventory = generateShopInventory(
      gameData.components,
      gameData.jokers,
      gameData.tarots,
      gameState.componentPool.map(c => c.id),
      gameState.jokerSlots.map(j => j.id),
    );
    set({
      gameState: { ...gameState, gold: gameState.gold + interest },
      shopInventory: inventory,
      currentScreen: 'shop',
    });
  },

  shopBuyComponent(component) {
    const { gameState } = get();
    if (!gameState) return;
    buyComponent(gameState, component);
    set({ gameState: { ...gameState } });
  },

  shopSellComponent(component) {
    const { gameState } = get();
    if (!gameState) return;
    sellComponent(gameState, component);
    set({ gameState: { ...gameState } });
  },

  shopBuyJoker(joker) {
    const { gameState } = get();
    if (!gameState) return;
    buyJoker(gameState, joker);
    set({ gameState: { ...gameState } });
  },

  shopSellJoker(joker) {
    const { gameState } = get();
    if (!gameState) return;
    sellJoker(gameState, joker);
    set({ gameState: { ...gameState } });
  },

  shopBuyTarot(tarot) {
    const { gameState } = get();
    if (!gameState) return;
    buyTarot(gameState, tarot);
    set({ gameState: { ...gameState } });
  },

  shopRemoveComponent(component) {
    const { gameState } = get();
    if (!gameState) return;
    removeComponent(gameState, component);
    set({ gameState: { ...gameState } });
  },

  closeShop() {
    set({ currentScreen: 'blindSelect', shopInventory: null });
  },
}));
