import { create } from 'zustand';
import { loadGameDataWeb, type GameData } from '../../data/loader-web.js';
import { createGameState, type GameState } from '../../engine/state.js';
import { autoDeal } from '../../engine/draft.js';
import { runPhase, type PhaseSettlement } from '../../engine/phase-runner.js';
import { validateDeployment } from '../../engine/deploy.js';
import { dealHand, discardAndDraw, type HandState } from '../../engine/hand.js';
import {
  generateShopInventory,
  drawPackTarots,
  buyComponent,
  sellComponent,
  buyJoker,
  sellJoker,
  removeComponent,
  calculatePhaseReward,
  calculateInterest,
  type ShopInventory,
} from '../../engine/shop.js';
import { PACK_CATALOG, type PackType } from '../components/TarotPack.js';
import { applySchoolFreeComponents, applyVibeCodingStartBonuses, getJokerHandSizeBonus, getJokerDiscardBonus } from '../../engine/joker-specials.js';
import { detectPatterns } from '../../engine/patterns.js';
import { computePanel, computeChips, computeMult, computeFinalScore, type Panel } from '../../engine/scoring.js';
import { computeJokerChipBonus, computeJokerMultAdd, getJokerMultipliers, computeJokerGold } from '../../engine/joker-specials.js';
import { validateConstraints } from '../../engine/constraints.js';
import { applyTarot } from '../../engine/tarot.js';
import { filterComponentsByPlatform, filterPatternsByPlatform, getPlatformChipBonus, applyAwsMultiRegion, applySelfhostedCxPenalty } from '../../engine/platform.js';
import type { Component, Joker, Tarot, School, Phase, PlatformId } from '../../schemas/index.js';
import { BASE_DEPLOY_SLOTS, type Screen } from './types.js';

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
  selectedInHand: string[];
  patternPreview: { name: string; desc: string }[];
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
  openedPack: { pack: PackType; tarots: Tarot[] } | null;

  // ── Actions ──
  setScreen(screen: Screen): void;
  startGame(schoolId: string, scenarioId: string, platformId: PlatformId): void;

  skipBlind(): void;
  startPlay(): void;
  toggleDeploy(componentId: string): void;
  toggleDiscard(componentId: string): void;
  toggleHandSelect(componentId: string): void;
  deploySelected(): void;
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
  shopBuyTarotPack(packIndex: number): void;
  shopSelectFromPack(tarot: Tarot): void;
  shopClosePack(): void;
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
  selectedInHand: [],
  patternPreview: [],
  scorePreview: null,
  settlement: null,
  shopInventory: null,
  openedPack: null,

  // ── Actions ──

  setScreen(screen) {
    set({ currentScreen: screen });
  },

  startGame(schoolId, scenarioId, platformId) {
    const { gameData } = get();
    const school = gameData.schools.find(s => s.id === schoolId)!;
    const scenario = gameData.scenarios.find(s => s.id === scenarioId)!;
    const platform = gameData.platforms.find(p => p.id === platformId)!;
    const state = createGameState(scenario, school, platform);

    // Filter components by platform (generic + platform-exclusive only)
    const platformComponents = filterComponentsByPlatform(gameData.components, platformId);
    applySchoolFreeComponents(state, platformComponents);
    applyVibeCodingStartBonuses(state, gameData.jokers, gameData.tarots);

    // Add remaining platform-filtered components to pool
    const ownedIds = new Set(state.componentPool.map(c => c.id));
    const remaining = platformComponents.filter(c => !ownedIds.has(c.id));
    state.componentPool.push(...remaining);

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

    // Dynamic hand size/discards from joker + school bonuses
    const handSizeBonus = getJokerHandSizeBonus(gameState.jokerSlots);
    const discardBonus = getJokerDiscardBonus(gameState.jokerSlots);
    const schoolHandBonus = gameState.school.modifiers.hand_size_bonus ?? 0;
    const schoolDiscardBonus = gameState.school.modifiers.discard_bonus ?? 0;
    const handState = dealHand(gameState.componentPool, 8 + handSizeBonus + schoolHandBonus, 3 + discardBonus + schoolDiscardBonus);

    set({
      currentScreen: 'play',
      handState,
      selectedForDeploy: [],
      selectedForDiscard: [],
      selectedInHand: [],
      patternPreview: [],
      scorePreview: null,
      settlement: null,
    });
  },

  toggleHandSelect(componentId) {
    const maxSlots = BASE_DEPLOY_SLOTS + (get().gameState?.school.modifiers.deploy_slots_bonus ?? 0);
    const maxSelect = Math.max(maxSlots, 5);
    set(s => {
      const selected = s.selectedInHand.includes(componentId)
        ? s.selectedInHand.filter(id => id !== componentId)
        : s.selectedInHand.length < maxSelect
          ? [...s.selectedInHand, componentId]
          : s.selectedInHand;
      return { selectedInHand: selected };
    });
    setTimeout(() => get().updatePreview(), 0);
  },

  deploySelected() {
    const maxSlots = BASE_DEPLOY_SLOTS + (get().gameState?.school.modifiers.deploy_slots_bonus ?? 0);
    set(s => {
      const toAdd = s.selectedInHand.filter(id => !s.selectedForDeploy.includes(id));
      const newDeploy = [...s.selectedForDeploy, ...toAdd].slice(0, maxSlots);
      return { selectedForDeploy: newDeploy, selectedInHand: [] };
    });
    // Deploy and immediately run the phase
    setTimeout(() => get().runCurrentPhase(), 0);
  },

  toggleDeploy(componentId) {
    const maxSlots = BASE_DEPLOY_SLOTS + (get().gameState?.school.modifiers.deploy_slots_bonus ?? 0);
    set(s => {
      const selected = s.selectedForDeploy.includes(componentId)
        ? s.selectedForDeploy.filter(id => id !== componentId)
        : s.selectedForDeploy.length < maxSlots
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
    const { handState, selectedInHand } = get();
    if (!handState || selectedInHand.length === 0) return;
    const newHandState = discardAndDraw(handState, selectedInHand);
    set({
      handState: newHandState,
      selectedInHand: [],
      selectedForDiscard: [],
      selectedForDeploy: [],
    });
  },

  updatePreview() {
    const { gameState, gameData, selectedForDeploy, selectedInHand, handState } = get();
    if (!gameState) return;
    const deployedIds = [...selectedForDeploy, ...selectedInHand];
    const deployed = handState?.hand.filter(c => deployedIds.includes(c.id)) ?? [];
    const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
    const platform = gameState.platform;
    const platformPatterns = filterPatternsByPlatform(gameData.patterns, platform.id);
    const triggeredPatterns = detectPatterns(deployed, platformPatterns);
    const patternPreview = triggeredPatterns.map(p => ({ name: p.name, desc: p.desc }));

    let scorePreview: GameStore['scorePreview'] = null;
    if (deployed.length > 0) {
      const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
      const baseline = getBaseline(gameState.school);
      let panel = computePanel(deployed, baseline);

      // Apply platform panel mechanics
      if (platform.id === 'aws') {
        panel = applyAwsMultiRegion(deployed, panel);
      }
      if (platform.id === 'selfhosted') {
        panel = applySelfhostedCxPenalty(deployed, panel);
      }

      // Joker activation
      const activeJokers = gameState.jokerSlots.filter(j => {
        const { require_all_tags, require_any_tags } = j.condition;
        if (!require_all_tags.every(t => deployedTags.includes(t))) return false;
        if (require_any_tags.length === 0) return true;
        return require_any_tags.some(t => deployedTags.includes(t));
      });

      // Chips (including platform chip bonus)
      const baseChips = deployed.reduce((sum, c) => sum + c.base_chips, 0);
      const patternChips = triggeredPatterns.reduce((sum, p) => sum + p.effects.chips_add, 0);
      const jokerChips = computeJokerChipBonus(activeJokers, deployed);
      const platformChips = getPlatformChipBonus(deployed, platform);
      const chips = computeChips(deployed, patternChips, jokerChips + platformChips);

      // Mult
      const jokerMultAddTotal = computeJokerMultAdd(activeJokers, triggeredPatterns.length);
      const jokerMultipliers = getJokerMultipliers(activeJokers, triggeredPatterns.length);
      const patternMultAdds = triggeredPatterns.map(p => p.effects.mult_add);
      const jokerMults = jokerMultipliers;
      const mult = computeMult(triggeredPatterns, jokerMultAddTotal, jokerMultipliers);

      // Constraints (with platform mechanic: Azure Compliance Shield)
      const constraintResult = validateConstraints(panel, deployed, phase.constraints, platform);
      const penalty = constraintResult.penalty;
      const budget = phase.capacity_budget + gameState.school.modifiers.capacity_budget_offset;
      const { penalty: capacityPenalty } = validateDeployment(deployed, budget, gameState.school.modifiers, platform);
      const totalPenalty = penalty + capacityPenalty;

      const finalScore = computeFinalScore(chips, mult, totalPenalty);
      scorePreview = {
        panel, baseChips, patternChips, jokerChips: jokerChips + platformChips, chips, mult,
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
      const platform = gameState.platform;
      const platformPatterns = filterPatternsByPlatform(gameData.patterns, platform.id);

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
        patterns: platformPatterns,
        superPatterns: gameData.superPatterns,
        bossRule,
        platform,
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
    // Filter shop components by platform (only generic + current platform)
    const shopComponents = filterComponentsByPlatform(gameData.components, gameState.platform.id);
    const inventory = generateShopInventory(
      shopComponents,
      gameData.jokers,
      gameData.tarots,
      gameState.componentPool.map(c => c.id),
      gameState.jokerSlots.map(j => j.id),
      PACK_CATALOG.length,
    );
    set({
      gameState: { ...gameState, gold: gameState.gold + interest },
      shopInventory: inventory,
      openedPack: null,
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

  shopBuyTarotPack(packIndex) {
    const { gameState, gameData, shopInventory } = get();
    if (!gameState || !shopInventory) return;
    const pack = PACK_CATALOG[shopInventory.packIndices[packIndex]];
    if (!pack) return;
    if (gameState.gold < pack.price) return;
    if (gameState.tarotHand.length >= gameState.tarotHandMax) return;

    // Deduct gold
    const updatedGold = gameState.gold - pack.price;
    // Draw random tarots
    const tarots = drawPackTarots(gameData.tarots, pack.cardCount);
    // Remove this pack from shop
    const updatedPackIndices = shopInventory.packIndices.filter((_, i) => i !== packIndex);

    set({
      gameState: { ...gameState, gold: updatedGold },
      shopInventory: { ...shopInventory, packIndices: updatedPackIndices },
      openedPack: { pack, tarots },
    });
  },

  shopSelectFromPack(tarot) {
    const { gameState } = get();
    if (!gameState) return;
    if (gameState.tarotHand.length >= gameState.tarotHandMax) return;

    set({
      gameState: {
        ...gameState,
        tarotHand: [...gameState.tarotHand, tarot],
      },
      openedPack: null,
    });
  },

  shopClosePack() {
    set({ openedPack: null });
  },

  shopRemoveComponent(component) {
    const { gameState } = get();
    if (!gameState) return;
    removeComponent(gameState, component);
    set({ gameState: { ...gameState } });
  },

  closeShop() {
    set({ currentScreen: 'blindSelect', shopInventory: null, openedPack: null });
  },
}));
