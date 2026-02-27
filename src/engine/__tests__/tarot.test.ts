import { describe, it, expect } from 'vitest';
import { applyTarot, canApplyTarot } from '../tarot.js';
import type { Component, Tarot } from '../../schemas/index.js';

// ── Helpers ─────────────────────────────────────────────────────────

function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'comp_test',
    name: 'Test Component',
    desc: 'A test component',
    domain: 'compute',
    tags: ['cache', 'cdn'],
    base_chips: 5,
    delta: { perf: 3, rel: 0, cx: 1 },
    capacity_cost: 10,
    rarity: 'common',
    platform: 'generic',
    ...overrides,
  };
}

function makeTarot(overrides: Partial<Tarot>): Tarot {
  return {
    id: 'tarot_test',
    name: 'Test Tarot',
    desc: 'A test tarot',
    shop_cost: 3,
    rarity: 'common',
    ...overrides,
  } as Tarot;
}

// ── add_tag ─────────────────────────────────────────────────────────

describe('applyTarot — add_tag', () => {
  const tarot = makeTarot({
    effect: { type: 'add_tag', target_tag: 'cache', add_tag: 'ha' },
  });

  it('adds tag to component that has the target tag', () => {
    const comp = makeComponent({ tags: ['cache'] });
    const result = applyTarot(tarot, comp);
    expect(result.tags).toContain('ha');
    expect(result.tags).toContain('cache');
  });

  it('returns same component when target tag does not match', () => {
    const comp = makeComponent({ tags: ['db'] });
    const result = applyTarot(tarot, comp);
    expect(result).toBe(comp);
    expect(result.tags).not.toContain('ha');
  });

  it('returns same component when tag already present', () => {
    const comp = makeComponent({ tags: ['cache', 'ha'] });
    const result = applyTarot(tarot, comp);
    expect(result).toBe(comp);
  });

  it('wildcard target_tag matches any component', () => {
    const wildTarot = makeTarot({
      effect: { type: 'add_tag', target_tag: '*', add_tag: 'ha' },
    });
    const comp = makeComponent({ tags: ['db'] });
    const result = applyTarot(wildTarot, comp);
    expect(result.tags).toContain('ha');
  });

  it('produces a new object (immutable)', () => {
    const comp = makeComponent({ tags: ['cache'] });
    const result = applyTarot(tarot, comp);
    expect(result).not.toBe(comp);
    expect(comp.tags).not.toContain('ha');
  });
});

describe('canApplyTarot — add_tag', () => {
  const tarot = makeTarot({
    effect: { type: 'add_tag', target_tag: 'cache', add_tag: 'ha' },
  });

  it('returns true when target matches and tag is missing', () => {
    const comp = makeComponent({ tags: ['cache'] });
    expect(canApplyTarot(tarot, comp)).toBe(true);
  });

  it('returns false when target tag does not match', () => {
    const comp = makeComponent({ tags: ['db'] });
    expect(canApplyTarot(tarot, comp)).toBe(false);
  });

  it('returns false when component already has the tag', () => {
    const comp = makeComponent({ tags: ['cache', 'ha'] });
    expect(canApplyTarot(tarot, comp)).toBe(false);
  });

  it('returns true with wildcard target_tag', () => {
    const wildTarot = makeTarot({
      effect: { type: 'add_tag', target_tag: '*', add_tag: 'ha' },
    });
    const comp = makeComponent({ tags: ['db'] });
    expect(canApplyTarot(wildTarot, comp)).toBe(true);
  });
});

// ── add_chips ───────────────────────────────────────────────────────

describe('applyTarot — add_chips', () => {
  const tarot = makeTarot({
    effect: { type: 'add_chips', target_tag: 'db', chips: 10 },
  });

  it('adds chips to component with matching tag', () => {
    const comp = makeComponent({ tags: ['db'], base_chips: 5 });
    const result = applyTarot(tarot, comp);
    expect(result.base_chips).toBe(15);
  });

  it('returns same component when target tag does not match', () => {
    const comp = makeComponent({ tags: ['cache'], base_chips: 5 });
    const result = applyTarot(tarot, comp);
    expect(result).toBe(comp);
    expect(result.base_chips).toBe(5);
  });

  it('wildcard target_tag adds chips to any component', () => {
    const wildTarot = makeTarot({
      effect: { type: 'add_chips', target_tag: '*', chips: 7 },
    });
    const comp = makeComponent({ tags: ['cache'], base_chips: 3 });
    const result = applyTarot(wildTarot, comp);
    expect(result.base_chips).toBe(10);
  });

  it('produces a new object (immutable)', () => {
    const comp = makeComponent({ tags: ['db'], base_chips: 5 });
    const result = applyTarot(tarot, comp);
    expect(result).not.toBe(comp);
    expect(comp.base_chips).toBe(5);
  });
});

describe('canApplyTarot — add_chips', () => {
  const tarot = makeTarot({
    effect: { type: 'add_chips', target_tag: 'db', chips: 10 },
  });

  it('returns true when component has target tag', () => {
    const comp = makeComponent({ tags: ['db'] });
    expect(canApplyTarot(tarot, comp)).toBe(true);
  });

  it('returns false when component lacks target tag', () => {
    const comp = makeComponent({ tags: ['cache'] });
    expect(canApplyTarot(tarot, comp)).toBe(false);
  });

  it('returns true with wildcard target_tag', () => {
    const wildTarot = makeTarot({
      effect: { type: 'add_chips', target_tag: '*', chips: 10 },
    });
    const comp = makeComponent({ tags: ['cache'] });
    expect(canApplyTarot(wildTarot, comp)).toBe(true);
  });
});

// ── change_domain ───────────────────────────────────────────────────

describe('applyTarot — change_domain', () => {
  const tarot = makeTarot({
    effect: { type: 'change_domain', from_domain: 'compute', to_domain: 'network' },
  });

  it('changes domain when from_domain matches', () => {
    const comp = makeComponent({ domain: 'compute' });
    const result = applyTarot(tarot, comp);
    expect(result.domain).toBe('network');
  });

  it('returns same component when from_domain does not match', () => {
    const comp = makeComponent({ domain: 'data' });
    const result = applyTarot(tarot, comp);
    expect(result).toBe(comp);
    expect(result.domain).toBe('data');
  });

  it('wildcard from_domain matches any domain', () => {
    const wildTarot = makeTarot({
      effect: { type: 'change_domain', from_domain: '*', to_domain: 'infra' },
    });
    const comp = makeComponent({ domain: 'data' });
    const result = applyTarot(wildTarot, comp);
    expect(result.domain).toBe('infra');
  });

  it('wildcard to_domain does not change domain', () => {
    const wildToTarot = makeTarot({
      effect: { type: 'change_domain', from_domain: 'compute', to_domain: '*' },
    });
    const comp = makeComponent({ domain: 'compute' });
    const result = applyTarot(wildToTarot, comp);
    expect(result).toBe(comp);
    expect(result.domain).toBe('compute');
  });

  it('produces a new object (immutable)', () => {
    const comp = makeComponent({ domain: 'compute' });
    const result = applyTarot(tarot, comp);
    expect(result).not.toBe(comp);
    expect(comp.domain).toBe('compute');
  });
});

describe('canApplyTarot — change_domain', () => {
  const tarot = makeTarot({
    effect: { type: 'change_domain', from_domain: 'compute', to_domain: 'network' },
  });

  it('returns true when from_domain matches', () => {
    const comp = makeComponent({ domain: 'compute' });
    expect(canApplyTarot(tarot, comp)).toBe(true);
  });

  it('returns false when from_domain does not match', () => {
    const comp = makeComponent({ domain: 'data' });
    expect(canApplyTarot(tarot, comp)).toBe(false);
  });

  it('returns true with wildcard from_domain', () => {
    const wildTarot = makeTarot({
      effect: { type: 'change_domain', from_domain: '*', to_domain: 'infra' },
    });
    const comp = makeComponent({ domain: 'infra' });
    expect(canApplyTarot(wildTarot, comp)).toBe(true);
  });
});

// ── reduce_cost ─────────────────────────────────────────────────────

describe('applyTarot — reduce_cost', () => {
  const tarot = makeTarot({
    effect: { type: 'reduce_cost', target_tag: 'cache', amount: 3 },
  });

  it('reduces capacity_cost for matching component', () => {
    const comp = makeComponent({ tags: ['cache'], capacity_cost: 10 });
    const result = applyTarot(tarot, comp);
    expect(result.capacity_cost).toBe(7);
  });

  it('clamps minimum capacity_cost to 1', () => {
    const comp = makeComponent({ tags: ['cache'], capacity_cost: 2 });
    const result = applyTarot(tarot, comp);
    expect(result.capacity_cost).toBe(1);
  });

  it('returns same component when target tag does not match', () => {
    const comp = makeComponent({ tags: ['db'], capacity_cost: 10 });
    const result = applyTarot(tarot, comp);
    expect(result).toBe(comp);
    expect(result.capacity_cost).toBe(10);
  });

  it('wildcard target_tag reduces any component', () => {
    const wildTarot = makeTarot({
      effect: { type: 'reduce_cost', target_tag: '*', amount: 5 },
    });
    const comp = makeComponent({ tags: ['db'], capacity_cost: 12 });
    const result = applyTarot(wildTarot, comp);
    expect(result.capacity_cost).toBe(7);
  });

  it('produces a new object (immutable)', () => {
    const comp = makeComponent({ tags: ['cache'], capacity_cost: 10 });
    const result = applyTarot(tarot, comp);
    expect(result).not.toBe(comp);
    expect(comp.capacity_cost).toBe(10);
  });
});

describe('canApplyTarot — reduce_cost', () => {
  const tarot = makeTarot({
    effect: { type: 'reduce_cost', target_tag: 'cache', amount: 3 },
  });

  it('returns true when target matches and cost > 1', () => {
    const comp = makeComponent({ tags: ['cache'], capacity_cost: 10 });
    expect(canApplyTarot(tarot, comp)).toBe(true);
  });

  it('returns false when target tag does not match', () => {
    const comp = makeComponent({ tags: ['db'], capacity_cost: 10 });
    expect(canApplyTarot(tarot, comp)).toBe(false);
  });

  it('returns false when capacity_cost is already 1', () => {
    const comp = makeComponent({ tags: ['cache'], capacity_cost: 1 });
    expect(canApplyTarot(tarot, comp)).toBe(false);
  });

  it('returns true with wildcard target_tag and cost > 1', () => {
    const wildTarot = makeTarot({
      effect: { type: 'reduce_cost', target_tag: '*', amount: 3 },
    });
    const comp = makeComponent({ tags: ['db'], capacity_cost: 5 });
    expect(canApplyTarot(wildTarot, comp)).toBe(true);
  });
});

// ── Unknown effect type ─────────────────────────────────────────────

describe('canApplyTarot — unknown effect type', () => {
  it('returns false for unrecognized effect type', () => {
    const unknownTarot = {
      id: 'tarot_unknown',
      name: 'Unknown',
      desc: 'unknown',
      effect: { type: 'something_weird' },
      shop_cost: 1,
      rarity: 'common',
    } as unknown as Tarot;
    const comp = makeComponent();
    expect(canApplyTarot(unknownTarot, comp)).toBe(false);
  });
});

describe('applyTarot — unknown effect type', () => {
  it('returns target unchanged for unrecognized effect type', () => {
    const unknownTarot = {
      id: 'tarot_unknown',
      name: 'Unknown',
      desc: 'unknown',
      effect: { type: 'something_weird' },
      shop_cost: 1,
      rarity: 'common',
    } as unknown as Tarot;
    const comp = makeComponent();
    const result = applyTarot(unknownTarot, comp);
    expect(result).toBe(comp);
  });
});
