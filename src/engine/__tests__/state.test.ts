import { describe, it, expect } from 'vitest';
import { createGameState } from '../state.js';
import { loadGameData } from '../../data/loader.js';

describe('createGameState', () => {
  const data = loadGameData();

  it('creates initial game state for a scenario and school', () => {
    const scenario = data.scenarios[0];
    const school = data.schools[0]; // SRE
    const state = createGameState(scenario, school);

    expect(state.scenario.id).toBe(scenario.id);
    expect(state.school.id).toBe(school.id);
    expect(state.componentPool).toEqual([]);
    expect(state.jokerSlots).toHaveLength(0);
    expect(state.jokerSlotMax).toBe(school.modifiers.joker_slots);
    expect(state.currentPhaseIndex).toBe(0);
    expect(state.gold).toBeGreaterThan(0);
    expect(state.tarotHand).toEqual([]);
    expect(state.phaseResults).toEqual([]);
    expect(state.deployed.components).toEqual([]);
    expect(state.deployed.totalCapacity).toBe(0);
  });

  it('respects school tarot_hand_size', () => {
    const scenario = data.scenarios[0];
    const vibeSchool = data.schools.find(s => s.id === 'school_vibe_coding')!;
    const state = createGameState(scenario, vibeSchool);
    expect(state.tarotHandMax).toBe(3); // vibe coding has tarot_hand_size: 3
  });

  it('defaults tarot hand max to 2 when not specified', () => {
    const scenario = data.scenarios[0];
    const sreSchool = data.schools.find(s => s.id === 'school_sre')!;
    const state = createGameState(scenario, sreSchool);
    expect(state.tarotHandMax).toBe(2);
  });
});
