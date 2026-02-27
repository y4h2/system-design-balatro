import type { Scenario, School, Joker, Tarot, Component, Platform } from '../schemas/index.js';
import type { HandResult } from './phase-runner.js';

export interface DeployedState {
  components: Component[];
  totalCapacity: number;
}

export interface PhaseResult {
  blind: 'small' | 'big' | 'boss';
  score: number;
  targetScore: number;
  passed: boolean;
  skipped: boolean;
}

export interface GameState {
  scenario: Scenario;
  school: School;
  platform: Platform;
  componentPool: Component[];
  jokerSlots: Joker[];
  jokerSlotMax: number;
  tarotHand: Tarot[];
  tarotHandMax: number;
  currentPhaseIndex: number;
  gold: number;
  phaseResults: PhaseResult[];
  deployed: DeployedState;
  // Multi-hand state
  handResults: HandResult[];
  allPlayedCards: Component[];
}

export function createGameState(scenario: Scenario, school: School, platform: Platform): GameState {
  return {
    scenario,
    school,
    platform,
    componentPool: [],
    jokerSlots: [],
    jokerSlotMax: school.modifiers.joker_slots,
    tarotHand: [],
    tarotHandMax: school.modifiers.tarot_hand_size ?? 2,
    currentPhaseIndex: 0,
    gold: 10,
    phaseResults: [],
    deployed: { components: [], totalCapacity: 0 },
    handResults: [],
    allPlayedCards: [],
  };
}
