import { describe, it, expect } from 'vitest';
import { loadGameData } from '../../data/loader.js';
import { createGameState } from '../state.js';
import {
  applyInfoRevealTarot,
  canApplyStateModifyTarot,
  applyStateModifyTarot,
  useTarot,
  type TarotContext,
} from '../tarot.js';
import type { Event, Component, Pattern, Tarot } from '../../schemas/index.js';

const data = loadGameData();

function makeState() {
  return createGameState(data.scenarios[0], data.schools[0]);
}

// ── Helpers: build minimal fixtures ─────────────────────────────────

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt_test',
    name: 'Test Event',
    desc: 'A test event',
    severity: 3,
    targets_risks: ['risk_single_point_failure'],
    penalty: { perf: -2, rel: -3, cx: 0 },
    flavor_text: 'Something bad happened',
    ...overrides,
  };
}

function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'comp_test',
    name: 'Test Component',
    desc: 'A test component',
    tags: ['cache', 'cdn'],
    delta: { perf: 3, rel: 0, cx: 1 },
    capacity_cost: 10,
    exposes: ['risk_stale_data'],
    seals: [],
    requires_tags: [],
    conflicts_tags: [],
    rarity: 'common',
    category: 'functional',
    ...overrides,
  };
}

function makePattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: 'pat_test',
    name: 'Test Pattern',
    desc: 'A test pattern',
    requires_all_tags: ['cache', 'cdn'],
    requires_any_tags: [],
    effects: { mult_add: 2, delta: { perf: 1, rel: 0, cx: 0 } },
    ...overrides,
  };
}

function makeContext(overrides: Partial<TarotContext> = {}): TarotContext {
  return {
    eventPool: [],
    drawnEvents: [],
    nextEvent: undefined,
    patterns: [],
    deployed: [],
    deployedTags: [],
    capacityBudget: 50,
    ...overrides,
  };
}

// ── Info-reveal tarots ──────────────────────────────────────────────

describe('applyInfoRevealTarot', () => {
  const revealNextTarot = data.tarots.find(t => t.id === 'tarot_user_research')!;
  const revealOptimalTarot = data.tarots.find(t => t.id === 'tarot_competitive_analysis')!;
  const revealNearestTarot = data.tarots.find(t => t.id === 'tarot_ab_test')!;
  const revealPoolTarot = data.tarots.find(t => t.id === 'tarot_market_report')!;

  describe('reveal_next_event', () => {
    it('returns event info when next event exists', () => {
      const evt = makeEvent({ name: 'DDoS Attack', severity: 4, targets_risks: ['risk_ddos'] });
      const ctx = makeContext({ nextEvent: evt });
      const result = applyInfoRevealTarot(revealNextTarot, ctx);

      expect(result.success).toBe(true);
      expect(result.revealedInfo).toContain('DDoS Attack');
      expect(result.revealedInfo).toContain('severity 4');
      expect(result.revealedInfo).toContain('risk_ddos');
    });

    it('fails when no next event', () => {
      const ctx = makeContext({ nextEvent: undefined });
      const result = applyInfoRevealTarot(revealNextTarot, ctx);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No upcoming events');
    });
  });

  describe('reveal_optimal_pattern_with_cost', () => {
    it('returns pattern analysis with missing tags', () => {
      const pattern = makePattern({
        name: 'CDN Pattern',
        requires_all_tags: ['cache', 'cdn', 'lb'],
        requires_any_tags: [],
        effects: { mult_add: 3, delta: { perf: 2, rel: 0, cx: 0 } },
      });
      const ctx = makeContext({
        patterns: [pattern],
        deployedTags: ['cache'],
      });

      const result = applyInfoRevealTarot(revealOptimalTarot, ctx);

      expect(result.success).toBe(true);
      expect(result.revealedInfo).toContain('CDN Pattern');
      expect(result.revealedInfo).toContain('mult +3');
      expect(result.revealedInfo).toContain('cdn');
      expect(result.revealedInfo).toContain('lb');
    });

    it('shows "ok" for any-tags when satisfied', () => {
      const pattern = makePattern({
        name: 'Flex Pattern',
        requires_all_tags: ['cache'],
        requires_any_tags: ['cdn', 'lb'],
        effects: { mult_add: 2, delta: { perf: 1, rel: 0, cx: 0 } },
      });
      const ctx = makeContext({
        patterns: [pattern],
        deployedTags: ['cache', 'cdn'],
      });

      const result = applyInfoRevealTarot(revealOptimalTarot, ctx);

      expect(result.success).toBe(true);
      expect(result.revealedInfo).toContain('any=ok');
    });

    it('shows "need" for any-tags when not satisfied', () => {
      const pattern = makePattern({
        requires_all_tags: ['cache'],
        requires_any_tags: ['cdn', 'lb'],
        effects: { mult_add: 2, delta: { perf: 1, rel: 0, cx: 0 } },
      });
      const ctx = makeContext({
        patterns: [pattern],
        deployedTags: ['cache'],
      });

      const result = applyInfoRevealTarot(revealOptimalTarot, ctx);

      expect(result.revealedInfo).toContain('any=need');
    });
  });

  describe('reveal_nearest_patterns', () => {
    it('sorts patterns by missing tag count', () => {
      const nearPat = makePattern({
        name: 'Near',
        requires_all_tags: ['cache', 'cdn'],
        requires_any_tags: [],
      });
      const farPat = makePattern({
        id: 'pat_far',
        name: 'Far',
        requires_all_tags: ['cache', 'cdn', 'lb', 'queue'],
        requires_any_tags: [],
      });
      const ctx = makeContext({
        patterns: [farPat, nearPat],
        deployedTags: ['cache'],
      });

      const result = applyInfoRevealTarot(revealNearestTarot, ctx);

      expect(result.success).toBe(true);
      // Near (1 missing) should appear before Far (3 missing)
      const lines = result.revealedInfo!.split('\n');
      expect(lines[0]).toContain('Near');
      expect(lines[1]).toContain('Far');
    });

    it('marks fully triggered patterns as TRIGGERED', () => {
      const pat = makePattern({
        name: 'Active',
        requires_all_tags: ['cache'],
        requires_any_tags: [],
      });
      const ctx = makeContext({
        patterns: [pat],
        deployedTags: ['cache'],
      });

      const result = applyInfoRevealTarot(revealNearestTarot, ctx);

      expect(result.revealedInfo).toContain('TRIGGERED');
    });

    it('counts missing any-tag as +1 missing', () => {
      const pat = makePattern({
        name: 'NeedAny',
        requires_all_tags: ['cache'],
        requires_any_tags: ['lb', 'queue'],
      });
      const ctx = makeContext({
        patterns: [pat],
        deployedTags: ['cache'],
      });

      const result = applyInfoRevealTarot(revealNearestTarot, ctx);

      expect(result.revealedInfo).toContain('needs 1 more tag(s)');
    });
  });

  describe('reveal_event_pool', () => {
    it('lists all events in pool', () => {
      const evt1 = makeEvent({ name: 'Event A', severity: 2, targets_risks: ['risk_a'] });
      const evt2 = makeEvent({ id: 'evt2', name: 'Event B', severity: 4, targets_risks: ['risk_b', 'risk_c'] });
      const ctx = makeContext({ eventPool: [evt1, evt2] });

      const result = applyInfoRevealTarot(revealPoolTarot, ctx);

      expect(result.success).toBe(true);
      expect(result.revealedInfo).toContain('Event A');
      expect(result.revealedInfo).toContain('severity 2');
      expect(result.revealedInfo).toContain('Event B');
      expect(result.revealedInfo).toContain('risk_b, risk_c');
    });

    it('handles empty event pool', () => {
      const ctx = makeContext({ eventPool: [] });
      const result = applyInfoRevealTarot(revealPoolTarot, ctx);

      expect(result.success).toBe(true);
      expect(result.revealedInfo).toContain('No events in pool');
    });
  });

  it('returns failure for unknown effect', () => {
    const unknownTarot: Tarot = {
      id: 'tarot_unknown',
      name: 'Unknown',
      desc: 'unknown',
      type: 'info_reveal',
      effect: 'reveal_something_else',
      shop_cost: 1,
      rarity: 'common',
    };
    const ctx = makeContext();
    const result = applyInfoRevealTarot(unknownTarot, ctx);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown effect');
  });
});

// ── canApplyStateModifyTarot ────────────────────────────────────────

describe('canApplyStateModifyTarot', () => {
  const techSpike = data.tarots.find(t => t.id === 'tarot_tech_spike')!;
  const archReview = data.tarots.find(t => t.id === 'tarot_arch_review')!;
  const emergencyScaleup = data.tarots.find(t => t.id === 'tarot_emergency_scaleup')!;
  const refactorSprint = data.tarots.find(t => t.id === 'tarot_refactor_sprint')!;
  const techDebtCleanup = data.tarots.find(t => t.id === 'tarot_tech_debt_cleanup')!;
  const postmortem = data.tarots.find(t => t.id === 'tarot_postmortem')!;

  it('add_tag_to_component: true when deployed components exist', () => {
    const ctx = makeContext({ deployed: [makeComponent()] });
    expect(canApplyStateModifyTarot(techSpike, ctx)).toBe(true);
  });

  it('add_tag_to_component: false when no deployed components', () => {
    const ctx = makeContext({ deployed: [] });
    expect(canApplyStateModifyTarot(techSpike, ctx)).toBe(false);
  });

  it('seal_risk: always true', () => {
    const ctx = makeContext();
    expect(canApplyStateModifyTarot(archReview, ctx)).toBe(true);
  });

  it('add_capacity_budget: always true', () => {
    const ctx = makeContext();
    expect(canApplyStateModifyTarot(emergencyScaleup, ctx)).toBe(true);
  });

  it('reduce_component_capacity: true when deployed components exist', () => {
    const ctx = makeContext({ deployed: [makeComponent()] });
    expect(canApplyStateModifyTarot(refactorSprint, ctx)).toBe(true);
  });

  it('reduce_component_capacity: false when no deployed components', () => {
    const ctx = makeContext({ deployed: [] });
    expect(canApplyStateModifyTarot(refactorSprint, ctx)).toBe(false);
  });

  it('remove_exposed_risk: true when a component has exposed risks', () => {
    const comp = makeComponent({ exposes: ['risk_stale_data'] });
    const ctx = makeContext({ deployed: [comp] });
    expect(canApplyStateModifyTarot(techDebtCleanup, ctx)).toBe(true);
  });

  it('remove_exposed_risk: false when no exposed risks', () => {
    const comp = makeComponent({ exposes: [] });
    const ctx = makeContext({ deployed: [comp] });
    expect(canApplyStateModifyTarot(techDebtCleanup, ctx)).toBe(false);
  });

  it('next_event_penalty_factor: always true', () => {
    const ctx = makeContext();
    expect(canApplyStateModifyTarot(postmortem, ctx)).toBe(true);
  });

  it('returns false for unknown action', () => {
    const unknownTarot: Tarot = {
      id: 'tarot_unknown',
      name: 'Unknown',
      desc: 'unknown',
      type: 'state_modify',
      effect: { action: 'do_something_weird' },
      shop_cost: 1,
      rarity: 'common',
    };
    const ctx = makeContext();
    expect(canApplyStateModifyTarot(unknownTarot, ctx)).toBe(false);
  });
});

// ── applyStateModifyTarot ───────────────────────────────────────────

describe('applyStateModifyTarot', () => {
  const techSpike = data.tarots.find(t => t.id === 'tarot_tech_spike')!;
  const archReview = data.tarots.find(t => t.id === 'tarot_arch_review')!;
  const emergencyScaleup = data.tarots.find(t => t.id === 'tarot_emergency_scaleup')!;
  const refactorSprint = data.tarots.find(t => t.id === 'tarot_refactor_sprint')!;
  const techDebtCleanup = data.tarots.find(t => t.id === 'tarot_tech_debt_cleanup')!;
  const postmortem = data.tarots.find(t => t.id === 'tarot_postmortem')!;

  it('add_tag_to_component: succeeds with valid target', () => {
    const comp = makeComponent({ name: 'Redis Cache' });
    const ctx = makeContext({ deployed: [comp] });
    const result = applyStateModifyTarot(techSpike, ctx, 0);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Redis Cache');
    expect(result.stateChange).toBe('add_tag_to_component:0');
  });

  it('add_tag_to_component: fails with no deployed', () => {
    const ctx = makeContext({ deployed: [] });
    const result = applyStateModifyTarot(techSpike, ctx);

    expect(result.success).toBe(false);
  });

  it('add_tag_to_component: fails with invalid index', () => {
    const ctx = makeContext({ deployed: [makeComponent()] });
    const result = applyStateModifyTarot(techSpike, ctx, 5);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid component index');
  });

  it('seal_risk: succeeds with count', () => {
    const ctx = makeContext();
    const result = applyStateModifyTarot(archReview, ctx);

    expect(result.success).toBe(true);
    expect(result.stateChange).toBe('seal_risk:1');
  });

  it('add_capacity_budget: succeeds with amount', () => {
    const ctx = makeContext();
    const result = applyStateModifyTarot(emergencyScaleup, ctx);

    expect(result.success).toBe(true);
    expect(result.message).toContain('+15');
    expect(result.stateChange).toBe('add_capacity_budget:15');
  });

  it('reduce_component_capacity: succeeds and calculates new cost', () => {
    const comp = makeComponent({ name: 'Big Service', capacity_cost: 20 });
    const ctx = makeContext({ deployed: [comp] });
    const result = applyStateModifyTarot(refactorSprint, ctx, 0);

    expect(result.success).toBe(true);
    // 20 * 0.7 = 14
    expect(result.message).toContain('20 -> 14');
    expect(result.stateChange).toBe('reduce_component_capacity:0:0.7');
  });

  it('reduce_component_capacity: fails with no deployed', () => {
    const ctx = makeContext({ deployed: [] });
    const result = applyStateModifyTarot(refactorSprint, ctx);

    expect(result.success).toBe(false);
  });

  it('remove_exposed_risk: succeeds when exposed risks exist', () => {
    const comp = makeComponent({ exposes: ['risk_stale_data'] });
    const ctx = makeContext({ deployed: [comp] });
    const result = applyStateModifyTarot(techDebtCleanup, ctx);

    expect(result.success).toBe(true);
    expect(result.stateChange).toBe('remove_exposed_risk:1');
  });

  it('remove_exposed_risk: fails when no exposed risks', () => {
    const comp = makeComponent({ exposes: [] });
    const ctx = makeContext({ deployed: [comp] });
    const result = applyStateModifyTarot(techDebtCleanup, ctx);

    expect(result.success).toBe(false);
  });

  it('next_event_penalty_factor: succeeds with factor', () => {
    const ctx = makeContext();
    const result = applyStateModifyTarot(postmortem, ctx);

    expect(result.success).toBe(true);
    expect(result.message).toContain('x0.5');
    expect(result.stateChange).toBe('next_event_penalty_factor:0.5');
  });
});

// ── useTarot (hand management) ──────────────────────────────────────

describe('useTarot', () => {
  it('removes tarot from hand and returns it', () => {
    const state = makeState();
    const t1 = data.tarots[0];
    const t2 = data.tarots[1];
    state.tarotHand = [t1, t2];

    const used = useTarot(state, 0);

    expect(used).toBe(t1);
    expect(state.tarotHand).toHaveLength(1);
    expect(state.tarotHand[0]).toBe(t2);
  });

  it('returns undefined for negative index', () => {
    const state = makeState();
    state.tarotHand = [data.tarots[0]];

    expect(useTarot(state, -1)).toBeUndefined();
    expect(state.tarotHand).toHaveLength(1);
  });

  it('returns undefined for out-of-range index', () => {
    const state = makeState();
    state.tarotHand = [data.tarots[0]];

    expect(useTarot(state, 5)).toBeUndefined();
    expect(state.tarotHand).toHaveLength(1);
  });

  it('returns undefined when hand is empty', () => {
    const state = makeState();
    state.tarotHand = [];

    expect(useTarot(state, 0)).toBeUndefined();
  });
});
