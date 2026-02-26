import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadGameData } from '../../data/loader.js';
import { createGameState } from '../state.js';
import {
  checkJokerSpecialCondition,
  computeJokerChipBonus,
  computeJokerMultAdd,
  getJokerMultipliers,
  getJokerHandSizeBonus,
  getJokerDiscardBonus,
  computeJokerGold,
  applySchoolFreeComponents,
  applyVibeCodingStartBonuses,
  rollVibeCodingCapacityDiscount,
  rollVibeCodingExtraRisk,
} from '../joker-specials.js';
import type { Component, Joker } from '../../schemas/index.js';

const data = loadGameData();

const mockPlatform = {
  id: 'aws' as const,
  name: 'AWS',
  desc: 'test',
  positioning: 'test',
  icon: '☁️',
  accent: '#FF9900',
  glow: 'rgba(255,153,0,0.4)',
  passive: { type: 'capacity_discount' as const, factor: 0.9, desc: 'test' },
  mechanic: { id: 'multi_region', name: 'Multi-Region', desc: 'test' },
  exclusive_pattern_id: 'p_serverless_full_stack',
};

function makeState(schoolId: string) {
  const school = data.schools.find(s => s.id === schoolId)!;
  return createGameState(data.scenarios[0], school, mockPlatform);
}

function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'cmp_test',
    name: 'Test Component',
    desc: 'A test component',
    domain: 'compute',
    tags: ['cache'],
    base_chips: 5,
    delta: { perf: 1, rel: 1, cx: 0 },
    capacity_cost: 10,
    rarity: 'common',
    platform: 'generic',
    ...overrides,
  };
}

// ── checkJokerSpecialCondition ──────────────────────────────────────

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

  describe('capacity_under_budget', () => {
    const joker: Joker = {
      id: 'jk_cost_ceiling',
      name: 'Cost Ceiling',
      desc: 'under budget bonus',
      rarity: 'uncommon',
      condition: { require_all_tags: [], require_any_tags: [], special: 'capacity_under_budget' },
      effect: { type: 'mult', value: 1.5 },
      shop_cost: 6,
    };

    it('passes when under budget', () => {
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 40,
        capacityBudget: 50,
        deployedCount: 3,
      });
      expect(result).toBe(true);
    });

    it('passes when exactly at budget', () => {
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 50,
        capacityBudget: 50,
        deployedCount: 3,
      });
      expect(result).toBe(true);
    });

    it('fails when over budget', () => {
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 60,
        capacityBudget: 50,
        deployedCount: 3,
      });
      expect(result).toBe(false);
    });
  });

  describe('component_count_lte_4', () => {
    const joker: Joker = {
      id: 'jk_mvp_first',
      name: 'MVP First',
      desc: 'lte 4 bonus',
      rarity: 'uncommon',
      condition: { require_all_tags: [], require_any_tags: [], special: 'component_count_lte_4' },
      effect: { type: 'mult', value: 1.3 },
      shop_cost: 6,
    };

    it('passes with 4 deployed', () => {
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 30,
        capacityBudget: 100,
        deployedCount: 4,
      });
      expect(result).toBe(true);
    });

    it('passes with fewer than 4 deployed', () => {
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 20,
        capacityBudget: 100,
        deployedCount: 2,
      });
      expect(result).toBe(true);
    });

    it('fails with more than 4 deployed', () => {
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 50,
        capacityBudget: 100,
        deployedCount: 5,
      });
      expect(result).toBe(false);
    });
  });

  describe('component_count_lte_3', () => {
    const joker = data.jokers.find(j => j.id === 'jk_minimalist')!;

    it('passes with 3 deployed', () => {
      expect(joker.condition.special).toBe('component_count_lte_3');
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 20,
        capacityBudget: 100,
        deployedCount: 3,
      });
      expect(result).toBe(true);
    });

    it('passes with fewer than 3 deployed', () => {
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 10,
        capacityBudget: 100,
        deployedCount: 1,
      });
      expect(result).toBe(true);
    });

    it('fails with more than 3 deployed', () => {
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 40,
        capacityBudget: 100,
        deployedCount: 4,
      });
      expect(result).toBe(false);
    });
  });

  describe('five_same_domain', () => {
    const joker = data.jokers.find(j => j.id === 'jk_all_in')!;

    it('passes with 5 components of the same domain', () => {
      expect(joker.condition.special).toBe('five_same_domain');
      const deployed = Array.from({ length: 5 }, (_, i) =>
        makeComponent({ id: `cmp_${i}`, domain: 'compute' }),
      );
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 50,
        capacityBudget: 100,
        deployedCount: 5,
        deployed,
      });
      expect(result).toBe(true);
    });

    it('fails with fewer than 5 same-domain components', () => {
      const deployed = [
        makeComponent({ id: 'cmp_0', domain: 'compute' }),
        makeComponent({ id: 'cmp_1', domain: 'compute' }),
        makeComponent({ id: 'cmp_2', domain: 'compute' }),
        makeComponent({ id: 'cmp_3', domain: 'compute' }),
        makeComponent({ id: 'cmp_4', domain: 'data' }),
      ];
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 50,
        capacityBudget: 100,
        deployedCount: 5,
        deployed,
      });
      expect(result).toBe(false);
    });

    it('fails when deployed is not provided', () => {
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 50,
        capacityBudget: 100,
        deployedCount: 5,
      });
      expect(result).toBe(false);
    });

    it('fails when fewer than 5 total components deployed', () => {
      const deployed = Array.from({ length: 4 }, (_, i) =>
        makeComponent({ id: `cmp_${i}`, domain: 'compute' }),
      );
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 40,
        capacityBudget: 100,
        deployedCount: 4,
        deployed,
      });
      expect(result).toBe(false);
    });

    it('passes with mixed domains if one has 5+', () => {
      const deployed = [
        ...Array.from({ length: 5 }, (_, i) =>
          makeComponent({ id: `cmp_compute_${i}`, domain: 'compute' }),
        ),
        makeComponent({ id: 'cmp_data_0', domain: 'data' }),
        makeComponent({ id: 'cmp_data_1', domain: 'data' }),
      ];
      const result = checkJokerSpecialCondition(joker, {
        capacityUsed: 70,
        capacityBudget: 100,
        deployedCount: 7,
        deployed,
      });
      expect(result).toBe(true);
    });
  });
});

// ── computeJokerChipBonus ───────────────────────────────────────────

describe('computeJokerChipBonus', () => {
  it('returns 0 when no chips jokers', () => {
    const multJoker: Joker = {
      id: 'jk_mult',
      name: 'Mult',
      desc: 'mult',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'mult', value: 1.5 },
      shop_cost: 5,
    };
    const deployed = [makeComponent({ tags: ['db'] })];
    expect(computeJokerChipBonus([multJoker], deployed)).toBe(0);
  });

  it('computes chip bonus from per_tag matching', () => {
    const chipsJoker: Joker = {
      id: 'jk_db_chips',
      name: 'DB Chips',
      desc: 'chips per db',
      rarity: 'uncommon',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'chips', value: 3, per_tag: 'db' },
      shop_cost: 5,
    };
    const deployed = [
      makeComponent({ id: 'c1', tags: ['db', 'sql'] }),
      makeComponent({ id: 'c2', tags: ['db', 'nosql'] }),
      makeComponent({ id: 'c3', tags: ['cache'] }),
    ];
    // 2 components with 'db' tag, 3 chips each = 6
    expect(computeJokerChipBonus([chipsJoker], deployed)).toBe(6);
  });

  it('sums chip bonuses from multiple chips jokers', () => {
    const j1: Joker = {
      id: 'jk_chips_1',
      name: 'J1',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'chips', value: 2, per_tag: 'db' },
      shop_cost: 5,
    };
    const j2: Joker = {
      id: 'jk_chips_2',
      name: 'J2',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'chips', value: 4, per_tag: 'cache' },
      shop_cost: 5,
    };
    const deployed = [
      makeComponent({ id: 'c1', tags: ['db'] }),
      makeComponent({ id: 'c2', tags: ['cache'] }),
    ];
    // j1: 1 db * 2 = 2, j2: 1 cache * 4 = 4, total = 6
    expect(computeJokerChipBonus([j1, j2], deployed)).toBe(6);
  });

  it('returns 0 when no deployed components match', () => {
    const chipsJoker: Joker = {
      id: 'jk_chips',
      name: 'J',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'chips', value: 5, per_tag: 'db' },
      shop_cost: 5,
    };
    const deployed = [makeComponent({ tags: ['cache'] })];
    expect(computeJokerChipBonus([chipsJoker], deployed)).toBe(0);
  });
});

// ── computeJokerMultAdd ─────────────────────────────────────────────

describe('computeJokerMultAdd', () => {
  it('returns 0 when no pattern_enhance jokers', () => {
    const multJoker: Joker = {
      id: 'jk_mult',
      name: 'Mult',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'mult', value: 1.5 },
      shop_cost: 5,
    };
    expect(computeJokerMultAdd([multJoker], 3)).toBe(0);
  });

  it('computes extra_mult per pattern', () => {
    const enhancer: Joker = {
      id: 'jk_enhance',
      name: 'Enhancer',
      desc: 'd',
      rarity: 'rare',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'pattern_enhance', extra_mult: 1 },
      shop_cost: 8,
    };
    // 3 patterns * 1 extra_mult = 3
    expect(computeJokerMultAdd([enhancer], 3)).toBe(3);
  });

  it('returns 0 when pattern count is 0', () => {
    const enhancer: Joker = {
      id: 'jk_enhance',
      name: 'Enhancer',
      desc: 'd',
      rarity: 'rare',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'pattern_enhance', extra_mult: 2 },
      shop_cost: 8,
    };
    expect(computeJokerMultAdd([enhancer], 0)).toBe(0);
  });

  it('sums from multiple pattern_enhance jokers', () => {
    const j1: Joker = {
      id: 'jk_e1',
      name: 'E1',
      desc: 'd',
      rarity: 'rare',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'pattern_enhance', extra_mult: 1 },
      shop_cost: 8,
    };
    const j2: Joker = {
      id: 'jk_e2',
      name: 'E2',
      desc: 'd',
      rarity: 'rare',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'pattern_enhance', extra_mult: 2 },
      shop_cost: 8,
    };
    // 2 patterns * (1 + 2) = 6
    expect(computeJokerMultAdd([j1, j2], 2)).toBe(6);
  });
});

// ── getJokerMultipliers ─────────────────────────────────────────────

describe('getJokerMultipliers', () => {
  it('returns multipliers from mult-type jokers', () => {
    const multJoker: Joker = {
      id: 'jk_mult',
      name: 'Mult',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'mult', value: 1.5 },
      shop_cost: 5,
    };
    expect(getJokerMultipliers([multJoker], 0)).toEqual([1.5]);
  });

  it('includes combo_mult when pattern count meets threshold', () => {
    const comboJoker: Joker = {
      id: 'jk_combo',
      name: 'Combo',
      desc: 'd',
      rarity: 'rare',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'combo_mult', min_patterns: 2, value: 1.5 },
      shop_cost: 9,
    };
    expect(getJokerMultipliers([comboJoker], 2)).toEqual([1.5]);
    expect(getJokerMultipliers([comboJoker], 3)).toEqual([1.5]);
  });

  it('excludes combo_mult when pattern count is below threshold', () => {
    const comboJoker: Joker = {
      id: 'jk_combo',
      name: 'Combo',
      desc: 'd',
      rarity: 'rare',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'combo_mult', min_patterns: 2, value: 1.5 },
      shop_cost: 9,
    };
    expect(getJokerMultipliers([comboJoker], 1)).toEqual([]);
  });

  it('returns mixed mult and combo_mult multipliers', () => {
    const multJoker: Joker = {
      id: 'jk_mult',
      name: 'Mult',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'mult', value: 1.3 },
      shop_cost: 5,
    };
    const comboJoker: Joker = {
      id: 'jk_combo',
      name: 'Combo',
      desc: 'd',
      rarity: 'rare',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'combo_mult', min_patterns: 2, value: 2.0 },
      shop_cost: 9,
    };
    expect(getJokerMultipliers([multJoker, comboJoker], 3)).toEqual([1.3, 2.0]);
  });

  it('ignores non-mult, non-combo_mult jokers', () => {
    const chipsJoker: Joker = {
      id: 'jk_chips',
      name: 'Chips',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'chips', value: 3, per_tag: 'db' },
      shop_cost: 5,
    };
    expect(getJokerMultipliers([chipsJoker], 5)).toEqual([]);
  });

  it('returns empty array when no jokers', () => {
    expect(getJokerMultipliers([], 5)).toEqual([]);
  });
});

// ── getJokerHandSizeBonus ───────────────────────────────────────────

describe('getJokerHandSizeBonus', () => {
  it('returns 0 when no hand_size jokers', () => {
    const multJoker: Joker = {
      id: 'jk_mult',
      name: 'Mult',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'mult', value: 1.5 },
      shop_cost: 5,
    };
    expect(getJokerHandSizeBonus([multJoker])).toBe(0);
  });

  it('sums hand_size bonuses', () => {
    const j1: Joker = {
      id: 'jk_hs1',
      name: 'HS1',
      desc: 'd',
      rarity: 'uncommon',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'hand_size', value: 2 },
      shop_cost: 6,
    };
    const j2: Joker = {
      id: 'jk_hs2',
      name: 'HS2',
      desc: 'd',
      rarity: 'uncommon',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'hand_size', value: 3 },
      shop_cost: 6,
    };
    expect(getJokerHandSizeBonus([j1, j2])).toBe(5);
  });

  it('returns 0 for empty joker array', () => {
    expect(getJokerHandSizeBonus([])).toBe(0);
  });
});

// ── getJokerDiscardBonus ────────────────────────────────────────────

describe('getJokerDiscardBonus', () => {
  it('returns 0 when no discard jokers', () => {
    const multJoker: Joker = {
      id: 'jk_mult',
      name: 'Mult',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'mult', value: 1.5 },
      shop_cost: 5,
    };
    expect(getJokerDiscardBonus([multJoker])).toBe(0);
  });

  it('sums discard bonuses', () => {
    const j1: Joker = {
      id: 'jk_d1',
      name: 'D1',
      desc: 'd',
      rarity: 'uncommon',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'discard', value: 2 },
      shop_cost: 5,
    };
    const j2: Joker = {
      id: 'jk_d2',
      name: 'D2',
      desc: 'd',
      rarity: 'uncommon',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'discard', value: 1 },
      shop_cost: 5,
    };
    expect(getJokerDiscardBonus([j1, j2])).toBe(3);
  });

  it('returns 0 for empty joker array', () => {
    expect(getJokerDiscardBonus([])).toBe(0);
  });
});

// ── computeJokerGold ────────────────────────────────────────────────

describe('computeJokerGold', () => {
  it('returns 0 when no gold jokers', () => {
    const multJoker: Joker = {
      id: 'jk_mult',
      name: 'Mult',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'mult', value: 1.5 },
      shop_cost: 5,
    };
    expect(computeJokerGold([multJoker], 3)).toBe(0);
  });

  it('computes gold per pattern', () => {
    const goldJoker: Joker = {
      id: 'jk_gold',
      name: 'Gold',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'gold', value: 5, per: 'pattern' },
      shop_cost: 4,
    };
    // 3 patterns * 5 gold = 15
    expect(computeJokerGold([goldJoker], 3)).toBe(15);
  });

  it('computes gold per phase', () => {
    const goldJoker: Joker = {
      id: 'jk_gold',
      name: 'Gold',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'gold', value: 10, per: 'phase' },
      shop_cost: 4,
    };
    // per phase = flat 10 regardless of pattern count
    expect(computeJokerGold([goldJoker], 0)).toBe(10);
    expect(computeJokerGold([goldJoker], 5)).toBe(10);
  });

  it('sums multiple gold jokers', () => {
    const j1: Joker = {
      id: 'jk_g1',
      name: 'G1',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'gold', value: 5, per: 'pattern' },
      shop_cost: 4,
    };
    const j2: Joker = {
      id: 'jk_g2',
      name: 'G2',
      desc: 'd',
      rarity: 'common',
      condition: { require_all_tags: [], require_any_tags: [] },
      effect: { type: 'gold', value: 8, per: 'phase' },
      shop_cost: 4,
    };
    // j1: 2 * 5 = 10, j2: 8 flat = 8, total = 18
    expect(computeJokerGold([j1, j2], 2)).toBe(18);
  });

  it('returns 0 for empty joker array', () => {
    expect(computeJokerGold([], 5)).toBe(0);
  });
});

// ── applySchoolFreeComponents ───────────────────────────────────────

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

// ── applyVibeCodingStartBonuses ─────────────────────────────────────

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
    state.jokerSlotMax = 1;
    state.jokerSlots = [data.jokers[0]];

    applyVibeCodingStartBonuses(state, data.jokers, data.tarots);

    expect(state.jokerSlots).toHaveLength(1); // unchanged
    expect(state.tarotHand).toHaveLength(1);  // tarot still added
  });

  it('does not exceed tarot hand max', () => {
    const state = makeState('school_vibe_coding');
    state.tarotHandMax = 1;
    state.tarotHand = [data.tarots[0]];

    applyVibeCodingStartBonuses(state, data.jokers, data.tarots);

    expect(state.jokerSlots).toHaveLength(1); // joker still added
    expect(state.tarotHand).toHaveLength(1);  // unchanged
  });
});

// ── rollVibeCodingCapacityDiscount ──────────────────────────────────

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

// ── rollVibeCodingExtraRisk ─────────────────────────────────────────

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
