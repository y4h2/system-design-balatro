import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadGameData } from '../../data/loader.js';
import { createGameState } from '../state.js';
import {
  checkJokerSpecialCondition,
  applySchoolFreeComponents,
  applyVibeCodingStartBonuses,
  rollVibeCodingCapacityDiscount,
  rollVibeCodingExtraRisk,
} from '../joker-specials.js';

const data = loadGameData();

function makeState(schoolId: string) {
  const school = data.schools.find(s => s.id === schoolId)!;
  return createGameState(data.scenarios[0], school);
}

// ── checkJokerSpecialCondition ──

describe('checkJokerSpecialCondition', () => {
  it('returns true when no special condition', () => {
    const joker = data.jokers.find(j => !j.condition.special)!;
    const result = checkJokerSpecialCondition(joker, {
      capacityUsed: 100,
      capacityBudget: 50,
      deployedCount: 10,
    });
    expect(result).toBe(true);
  });

  it('capacity_under_budget passes when under budget', () => {
    const joker = data.jokers.find(j => j.id === 'jk_cost_ceiling')!;
    expect(joker.condition.special).toBe('capacity_under_budget');

    const result = checkJokerSpecialCondition(joker, {
      capacityUsed: 40,
      capacityBudget: 50,
      deployedCount: 3,
    });
    expect(result).toBe(true);
  });

  it('capacity_under_budget passes when exactly at budget', () => {
    const joker = data.jokers.find(j => j.id === 'jk_cost_ceiling')!;

    const result = checkJokerSpecialCondition(joker, {
      capacityUsed: 50,
      capacityBudget: 50,
      deployedCount: 3,
    });
    expect(result).toBe(true);
  });

  it('capacity_under_budget fails when over budget', () => {
    const joker = data.jokers.find(j => j.id === 'jk_cost_ceiling')!;

    const result = checkJokerSpecialCondition(joker, {
      capacityUsed: 60,
      capacityBudget: 50,
      deployedCount: 3,
    });
    expect(result).toBe(false);
  });

  it('component_count_lte_4 passes with 4 deployed', () => {
    const joker = data.jokers.find(j => j.id === 'jk_mvp_first')!;
    expect(joker.condition.special).toBe('component_count_lte_4');

    const result = checkJokerSpecialCondition(joker, {
      capacityUsed: 30,
      capacityBudget: 100,
      deployedCount: 4,
    });
    expect(result).toBe(true);
  });

  it('component_count_lte_4 passes with fewer than 4 deployed', () => {
    const joker = data.jokers.find(j => j.id === 'jk_mvp_first')!;

    const result = checkJokerSpecialCondition(joker, {
      capacityUsed: 20,
      capacityBudget: 100,
      deployedCount: 2,
    });
    expect(result).toBe(true);
  });

  it('component_count_lte_4 fails with more than 4 deployed', () => {
    const joker = data.jokers.find(j => j.id === 'jk_mvp_first')!;

    const result = checkJokerSpecialCondition(joker, {
      capacityUsed: 50,
      capacityBudget: 100,
      deployedCount: 5,
    });
    expect(result).toBe(false);
  });
});

// ── applySchoolFreeComponents ──

describe('applySchoolFreeComponents', () => {
  it('compliance school adds audit_log and encryption to pool', () => {
    const state = makeState('school_compliance');
    expect(state.componentPool).toHaveLength(0);

    applySchoolFreeComponents(state, data.components);

    expect(state.componentPool).toHaveLength(2);
    const ids = state.componentPool.map(c => c.id);
    expect(ids).toContain('cmp_audit_log');
    expect(ids).toContain('cmp_encryption');
  });

  it('does not duplicate if component already in pool', () => {
    const state = makeState('school_compliance');
    const auditLog = data.components.find(c => c.id === 'cmp_audit_log')!;
    state.componentPool = [auditLog];

    applySchoolFreeComponents(state, data.components);

    expect(state.componentPool).toHaveLength(2);
    const auditLogCount = state.componentPool.filter(c => c.id === 'cmp_audit_log').length;
    expect(auditLogCount).toBe(1);
  });

  it('no-op for schools without free_components', () => {
    const state = makeState('school_sre');

    applySchoolFreeComponents(state, data.components);

    expect(state.componentPool).toHaveLength(0);
  });

  it('no-op for school_startup (no free_components field)', () => {
    const state = makeState('school_startup');

    applySchoolFreeComponents(state, data.components);

    expect(state.componentPool).toHaveLength(0);
  });
});

// ── applyVibeCodingStartBonuses ──

describe('applyVibeCodingStartBonuses', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a random joker and tarot for vibe coding school', () => {
    const state = makeState('school_vibe_coding');
    expect(state.jokerSlots).toHaveLength(0);
    expect(state.tarotHand).toHaveLength(0);

    applyVibeCodingStartBonuses(state, data.jokers, data.tarots);

    expect(state.jokerSlots).toHaveLength(1);
    expect(state.tarotHand).toHaveLength(1);
    // The added items should be from the game data
    expect(data.jokers.some(j => j.id === state.jokerSlots[0].id)).toBe(true);
    expect(data.tarots.some(t => t.id === state.tarotHand[0].id)).toBe(true);
  });

  it('no-op for non-vibe schools (no special_rules)', () => {
    const state = makeState('school_sre');

    applyVibeCodingStartBonuses(state, data.jokers, data.tarots);

    expect(state.jokerSlots).toHaveLength(0);
    expect(state.tarotHand).toHaveLength(0);
  });

  it('does not exceed joker slot max', () => {
    const state = makeState('school_vibe_coding');
    // Fill all joker slots
    state.jokerSlotMax = 1;
    state.jokerSlots = [data.jokers[0]];

    applyVibeCodingStartBonuses(state, data.jokers, data.tarots);

    expect(state.jokerSlots).toHaveLength(1); // unchanged
    expect(state.tarotHand).toHaveLength(1);  // tarot still added
  });

  it('does not exceed tarot hand max', () => {
    const state = makeState('school_vibe_coding');
    // Fill all tarot slots
    state.tarotHandMax = 1;
    state.tarotHand = [data.tarots[0]];

    applyVibeCodingStartBonuses(state, data.jokers, data.tarots);

    expect(state.jokerSlots).toHaveLength(1); // joker still added
    expect(state.tarotHand).toHaveLength(1);  // unchanged
  });
});

// ── rollVibeCodingCapacityDiscount ──

describe('rollVibeCodingCapacityDiscount', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns discount factor when random < chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.3
    const vibeSchool = data.schools.find(s => s.id === 'school_vibe_coding')!;

    const factor = rollVibeCodingCapacityDiscount(vibeSchool);
    expect(factor).toBe(0.7);
  });

  it('returns 1.0 when random >= chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // >= 0.3
    const vibeSchool = data.schools.find(s => s.id === 'school_vibe_coding')!;

    const factor = rollVibeCodingCapacityDiscount(vibeSchool);
    expect(factor).toBe(1.0);
  });

  it('returns 1.0 for non-vibe school', () => {
    const sreSchool = data.schools.find(s => s.id === 'school_sre')!;

    const factor = rollVibeCodingCapacityDiscount(sreSchool);
    expect(factor).toBe(1.0);
  });
});

// ── rollVibeCodingExtraRisk ──

describe('rollVibeCodingExtraRisk', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns extra risk count when random < chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.2
    const vibeSchool = data.schools.find(s => s.id === 'school_vibe_coding')!;

    const count = rollVibeCodingExtraRisk(vibeSchool);
    expect(count).toBe(1);
  });

  it('returns 0 when random >= chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // >= 0.2
    const vibeSchool = data.schools.find(s => s.id === 'school_vibe_coding')!;

    const count = rollVibeCodingExtraRisk(vibeSchool);
    expect(count).toBe(0);
  });

  it('returns 0 for non-vibe school', () => {
    const sreSchool = data.schools.find(s => s.id === 'school_sre')!;

    const count = rollVibeCodingExtraRisk(sreSchool);
    expect(count).toBe(0);
  });
});
