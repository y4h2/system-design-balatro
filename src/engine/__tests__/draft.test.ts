import { describe, it, expect } from 'vitest';
import { generateDraftChoices, applyDraftChoice } from '../draft.js';
import { loadGameData } from '../../data/loader.js';
import { createGameState } from '../state.js';

describe('Draft', () => {
  const data = loadGameData();
  const scenario = data.scenarios[0];
  const school = data.schools[0];

  it('generates correct number of choices', () => {
    const choices = generateDraftChoices(data.components, 3);
    expect(choices).toHaveLength(3);
  });

  it('generates distinct choices', () => {
    const choices = generateDraftChoices(data.components, 3);
    const ids = choices.map(c => c.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('applyDraftChoice adds chosen component to pool', () => {
    const state = createGameState(scenario, school);
    const choices = generateDraftChoices(data.components, 3);
    const picked = choices[0];
    applyDraftChoice(state, picked);
    expect(state.componentPool).toContain(picked);
    expect(state.componentPool.length).toBe(1);
  });

  it('respects school draft_options (Vibe Coding = 2 choices)', () => {
    const vibeSchool = data.schools.find(s => s.id === 'school_vibe_coding')!;
    const draftOptions = vibeSchool.modifiers.draft_options ?? 3;
    const choices = generateDraftChoices(data.components, draftOptions);
    expect(choices).toHaveLength(2);
  });
});
