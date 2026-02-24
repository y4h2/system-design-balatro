import type { Scenario, School, Joker, Tarot, Component } from '../schemas/index.js';

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
  componentPool: Component[];
  jokerSlots: Joker[];
  jokerSlotMax: number;
  tarotHand: Tarot[];
  tarotHandMax: number;
  currentPhaseIndex: number;
  gold: number;
  phaseResults: PhaseResult[];
  deployed: DeployedState;
}

export function createGameState(scenario: Scenario, school: School): GameState {
  return {
    scenario,
    school,
    componentPool: [],
    jokerSlots: [],
    jokerSlotMax: school.modifiers.joker_slots,
    tarotHand: [],
    tarotHandMax: school.modifiers.tarot_hand_size ?? 2,
    currentPhaseIndex: 0,
    gold: 10,
    phaseResults: [],
    deployed: { components: [], totalCapacity: 0 },
  };
}
