import { create } from 'zustand';
import { loadGameDataWeb, type GameData } from '../../data/loader-web.js';
import { createGameState, type GameState } from '../../engine/state.js';
import { generateDraftChoices, applyDraftChoice } from '../../engine/draft.js';
import { runPhase, type PhaseSettlement } from '../../engine/phase-runner.js';
import { validateDeployment } from '../../engine/deploy.js';
import { computeRiskExposure, type RiskReport } from '../../engine/risk.js';
import { selectEvents, rollTarotDropFromEvent } from '../../engine/event-selection.js';
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
import { applySchoolFreeComponents, applyVibeCodingStartBonuses } from '../../engine/joker-specials.js';
import { detectPatterns } from '../../engine/patterns.js';
import type { Component, Joker, Tarot, Event, School, Phase } from '../../schemas/index.js';
import type { Panel } from '../../engine/scoring.js';
import type { Screen } from './types.js';

function getBaseline(school: School): Panel {
  const ov = (school.modifiers.baseline_overrides ?? {}) as Record<string, number>;
  return { perf: ov.perf ?? 2, rel: ov.rel ?? 2, cx: ov.cx ?? 2 };
}

interface GameStore {
  // ── Data ──
  gameData: GameData;
  gameState: GameState | null;
  currentScreen: Screen;

  // ── Draft ──
  draftRound: number;
  draftChoices: Component[];

  // ── Play ──
  selectedForDeploy: string[]; // component IDs toggled for deploy
  riskPreview: RiskReport | null;
  patternPreview: string[];    // triggered pattern names
  currentEvents: Event[];
  settlement: PhaseSettlement | null;

  // ── Shop ──
  shopInventory: ShopInventory | null;

  // ── Actions ──
  startGame(schoolId: string, scenarioId: string): void;
  generateDraft(): void;
  pickDraftComponent(component: Component): void;
  finishDraft(): void;

  skipBlind(): void;
  startPlay(): void;
  toggleDeploy(componentId: string): void;
  updatePreview(): void;
  runCurrentPhase(): void;

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
  draftRound: 0,
  draftChoices: [],
  selectedForDeploy: [],
  riskPreview: null,
  patternPreview: [],
  currentEvents: [],
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
    set({ gameState: state, currentScreen: 'draft', draftRound: 0 });
    get().generateDraft();
  },

  generateDraft() {
    const { gameData, gameState } = get();
    if (!gameState) return;
    const options = gameState.school.modifiers.draft_options ?? 3;
    const ownedIds = new Set(gameState.componentPool.map(c => c.id));
    const available = gameData.components.filter(c => !ownedIds.has(c.id));
    const choices = generateDraftChoices(available, options);
    set(s => ({ draftChoices: choices, draftRound: s.draftRound + 1 }));
  },

  pickDraftComponent(component) {
    const { gameState, draftRound } = get();
    if (!gameState) return;
    applyDraftChoice(gameState, component);
    const totalRounds = gameState.school.modifiers.draft_rounds;
    if (draftRound >= totalRounds) {
      set({ gameState: { ...gameState }, currentScreen: 'blindSelect', draftChoices: [] });
    } else {
      set({ gameState: { ...gameState }, draftChoices: [] });
      get().generateDraft();
    }
  },

  finishDraft() {
    set({ currentScreen: 'blindSelect' });
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
    set({ currentScreen: 'play', selectedForDeploy: [], riskPreview: null, patternPreview: [], settlement: null });
  },

  toggleDeploy(componentId) {
    set(s => {
      const selected = s.selectedForDeploy.includes(componentId)
        ? s.selectedForDeploy.filter(id => id !== componentId)
        : [...s.selectedForDeploy, componentId];
      return { selectedForDeploy: selected };
    });
    // Trigger preview update after state change
    setTimeout(() => get().updatePreview(), 0);
  },

  updatePreview() {
    const { gameState, gameData, selectedForDeploy } = get();
    if (!gameState) return;
    const deployed = gameState.componentPool.filter(c => selectedForDeploy.includes(c.id));
    const riskPreview = computeRiskExposure(deployed);
    const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];
    const patternPreview = detectPatterns(deployedTags, gameData.patterns).map(p => p.name);
    set({ riskPreview, patternPreview });
  },

  runCurrentPhase() {
    const { gameState, gameData, selectedForDeploy } = get();
    if (!gameState) return;

    try {
      const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
      const deployed = gameState.componentPool.filter(c => selectedForDeploy.includes(c.id));

      // Select events
      const eventCount = phase.blind === 'boss' ? 2 : 1;
      const events = selectEvents(gameData.events, phase.event_pool_severity, eventCount);

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
        events,
        bossRule,
      });

      // Record result (clone to avoid mutation issues)
      const updatedPhaseResults = [...gameState.phaseResults, {
        blind: phase.blind,
        score: settlement.finalScore,
        targetScore: settlement.targetScore,
        passed: settlement.passed,
        skipped: false,
      }];

      // Gold reward
      const reward = calculatePhaseReward(settlement.passed, phase.blind);
      const updatedGold = gameState.gold + reward;

      // Tarot drops
      const updatedTarotHand = [...gameState.tarotHand];
      for (const evt of events) {
        if (rollTarotDropFromEvent(evt.severity)) {
          const shuffled = [...gameData.tarots].sort(() => Math.random() - 0.5);
          if (shuffled[0] && updatedTarotHand.length < gameState.tarotHandMax) {
            updatedTarotHand.push(shuffled[0]);
          }
        }
      }

      set({
        gameState: {
          ...gameState,
          phaseResults: updatedPhaseResults,
          gold: updatedGold,
          tarotHand: updatedTarotHand,
        },
        settlement,
        currentEvents: events,
        currentScreen: 'settlement',
      });
    } catch (err) {
      console.error('[runCurrentPhase] Error:', err);
    }
  },

  continueAfterSettlement() {
    const { gameState } = get();
    if (!gameState) return;
    const nextPhaseIndex = gameState.currentPhaseIndex + 1;
    const updated = { ...gameState, currentPhaseIndex: nextPhaseIndex };
    if (nextPhaseIndex >= 3) {
      set({ gameState: updated, currentScreen: 'gameOver' });
    } else {
      // Shop after Small and Big blinds (phases 0 and 1)
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
