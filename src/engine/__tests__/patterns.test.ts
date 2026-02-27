import { describe, it, expect } from 'vitest';
import { detectPatterns, matchTagsDistinct, resolveRouteConflict, checkRouteMastery } from '../patterns.js';
import type { Component, Pattern } from '../../schemas/index.js';

// ── Helpers ──────────────────────────────────────────────────────────────

let _id = 0;
function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: `cmp_test_${_id++}`,
    name: 'test',
    desc: 'test',
    domain: 'compute',
    tags: [],
    base_chips: 3,
    delta: { perf: 0, rel: 0, cx: 0 },
    capacity_cost: 1,
    rarity: 'common',
    platform: 'generic',
    ...overrides,
  };
}

function makePattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: 'p_test',
    name: 'test',
    desc: 'test',
    requires_all_tags: [],
    requires_any_tags: [],
    route: 'free',
    effects: { mult_add: 1, chips_add: 5 },
    ...overrides,
  };
}

// A minimal set of patterns for domain-based tests
const domainPairPattern = makePattern({ id: 'p_domain_pair', name: 'Domain Pair' });
const domainTriplePattern = makePattern({ id: 'p_domain_triple', name: 'Domain Triple' });
const wideSpectrumPattern = makePattern({ id: 'p_wide_spectrum', name: 'Wide Spectrum' });

// ── Distinct-card matching ───────────────────────────────────────────────

describe('matchTagsDistinct', () => {
  it('returns null when a single card has both tags (needs distinct cards)', () => {
    // Redis has both [cache, db] but we need 2 distinct cards
    const played = [makeComponent({ tags: ['cache', 'db'] })];
    const result = matchTagsDistinct(played, ['cache', 'db']);
    expect(result).toBeNull();
  });

  it('matches when different cards provide each tag', () => {
    const played = [
      makeComponent({ tags: ['cache'] }),
      makeComponent({ tags: ['db'] }),
    ];
    const result = matchTagsDistinct(played, ['cache', 'db']);
    expect(result).not.toBeNull();
  });

  it('backtracks correctly: Redis[cache,db] + PG[db] → Redis=cache, PG=db', () => {
    const played = [
      makeComponent({ tags: ['cache', 'db'] }), // Redis
      makeComponent({ tags: ['db'] }),            // PG
    ];
    const result = matchTagsDistinct(played, ['cache', 'db']);
    expect(result).not.toBeNull();
  });

  it('CQRS requires 3 distinct cards for [db, queue, cache]', () => {
    // Only 2 cards, insufficient
    const two = [
      makeComponent({ tags: ['cache', 'db'] }),
      makeComponent({ tags: ['queue'] }),
    ];
    expect(matchTagsDistinct(two, ['db', 'queue', 'cache'])).toBeNull();

    // 3 cards, sufficient
    const three = [
      makeComponent({ tags: ['cache', 'db'] }),
      makeComponent({ tags: ['queue'] }),
      makeComponent({ tags: ['db'] }),
    ];
    expect(matchTagsDistinct(three, ['db', 'queue', 'cache'])).not.toBeNull();
  });

  it('returns empty mask (0) when tags list is empty', () => {
    const played = [makeComponent({ tags: ['cache'] })];
    expect(matchTagsDistinct(played, [])).toBe(0);
  });
});

// ── Tag-based pattern detection with distinct matching ───────────────────

describe('detectPatterns – tag-based (distinct)', () => {
  it('does NOT trigger p_read_path with a single card having [cache, db]', () => {
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      route: 'A',
    });
    // Single card with both tags — should NOT trigger with distinct matching
    const played = [makeComponent({ tags: ['cache', 'db'] })];
    const result = detectPatterns(played, [readPath]);
    expect(result.some(p => p.id === 'p_read_path')).toBe(false);
  });

  it('triggers p_read_path when two cards provide cache and db separately', () => {
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      route: 'A',
    });
    const played = [
      makeComponent({ tags: ['cache'] }),
      makeComponent({ tags: ['db'] }),
    ];
    const result = detectPatterns(played, [readPath]);
    expect(result.some(p => p.id === 'p_read_path')).toBe(true);
  });

  it('triggers with backtracking: Redis[cache,db] + PG[db]', () => {
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      route: 'A',
    });
    const played = [
      makeComponent({ tags: ['cache', 'db'] }),
      makeComponent({ tags: ['db'] }),
    ];
    const result = detectPatterns(played, [readPath]);
    expect(result.some(p => p.id === 'p_read_path')).toBe(true);
  });

  it('does NOT trigger CQRS with only 2 cards (Redis + Kafka)', () => {
    const cqrs = makePattern({
      id: 'p_cqrs',
      requires_all_tags: ['db', 'queue', 'cache'],
      route: 'free',
    });
    const played = [
      makeComponent({ tags: ['cache', 'db'] }),     // Redis
      makeComponent({ tags: ['queue', 'async'] }),   // Kafka
    ];
    const result = detectPatterns(played, [cqrs]);
    expect(result.some(p => p.id === 'p_cqrs')).toBe(false);
  });

  it('triggers CQRS with 3 cards (Redis + Kafka + PG)', () => {
    const cqrs = makePattern({
      id: 'p_cqrs',
      requires_all_tags: ['db', 'queue', 'cache'],
      route: 'free',
    });
    const played = [
      makeComponent({ tags: ['cache', 'db'] }),
      makeComponent({ tags: ['queue', 'async'] }),
      makeComponent({ tags: ['db'] }),
    ];
    const result = detectPatterns(played, [cqrs]);
    expect(result.some(p => p.id === 'p_cqrs')).toBe(true);
  });

  it('detects a pattern using requires_any_tags with distinct card', () => {
    const observability = makePattern({
      id: 'p_observability',
      requires_all_tags: ['monitor'],
      requires_any_tags: ['search', 'deploy'],
      route: 'C',
    });
    const played = [
      makeComponent({ tags: ['monitor'] }),
      makeComponent({ tags: ['search'] }),
    ];
    const result = detectPatterns(played, [observability]);
    expect(result.some(p => p.id === 'p_observability')).toBe(true);
  });

  it('does NOT trigger observability with single card having [monitor, search]', () => {
    const observability = makePattern({
      id: 'p_observability',
      requires_all_tags: ['monitor'],
      requires_any_tags: ['search', 'deploy'],
      route: 'C',
    });
    // Single card has both monitor and search, but we need distinct cards:
    // monitor uses this card, then search needs a different unused card
    const played = [makeComponent({ tags: ['monitor', 'search'] })];
    const result = detectPatterns(played, [observability]);
    expect(result.some(p => p.id === 'p_observability')).toBe(false);
  });

  it('does NOT trigger when requires_any_tags has no match', () => {
    const observability = makePattern({
      id: 'p_observability',
      requires_all_tags: ['monitor'],
      requires_any_tags: ['search', 'deploy'],
      route: 'C',
    });
    const played = [makeComponent({ tags: ['monitor'] })];
    const result = detectPatterns(played, [observability]);
    expect(result.some(p => p.id === 'p_observability')).toBe(false);
  });

  it('returns empty array when no patterns match', () => {
    const pattern = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      route: 'A',
    });
    const played = [makeComponent({ tags: ['nosql'] })];
    const result = detectPatterns(played, [pattern]);
    expect(result).toEqual([]);
  });

  it('detects multiple tag-based patterns simultaneously', () => {
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      route: 'A',
    });
    const writePipeline = makePattern({
      id: 'p_write_pipeline',
      requires_all_tags: ['queue', 'db'],
      route: 'B',
    });
    const played = [
      makeComponent({ tags: ['cache'] }),
      makeComponent({ tags: ['db'] }),
      makeComponent({ tags: ['queue'] }),
    ];

    const result = detectPatterns(played, [readPath, writePipeline]);
    const ids = result.map(p => p.id);
    expect(ids).toContain('p_read_path');
    expect(ids).toContain('p_write_pipeline');
  });
});

// ── Wildcard matching ────────────────────────────────────────────────────

describe('matchTagsDistinct – wildcard', () => {
  it('wildcard card satisfies a tag it does not have', () => {
    const played = [
      makeComponent({ tags: ['compute', 'wildcard'] }), // wildcard acts as cache
      makeComponent({ tags: ['db'] }),
    ];
    const result = matchTagsDistinct(played, ['cache', 'db']);
    expect(result).not.toBeNull();
  });

  it('two wildcard cards satisfy two different tags', () => {
    const played = [
      makeComponent({ tags: ['compute', 'wildcard'] }),
      makeComponent({ tags: ['deploy', 'wildcard'] }),
    ];
    // Each wildcard fills one tag: one acts as cache, the other as queue
    const result = matchTagsDistinct(played, ['cache', 'queue']);
    expect(result).not.toBeNull();
  });

  it('wildcard still obeys distinct-card constraint (one card per tag)', () => {
    // Single wildcard cannot fill 2 tag slots
    const played = [
      makeComponent({ tags: ['compute', 'wildcard'] }),
    ];
    const result = matchTagsDistinct(played, ['cache', 'db']);
    expect(result).toBeNull();
  });

  it('wildcard + normal tag mixed matching', () => {
    const played = [
      makeComponent({ tags: ['compute', 'wildcard'] }), // wildcard acts as cache
      makeComponent({ tags: ['db'] }),                   // normal db
      makeComponent({ tags: ['queue'] }),                // normal queue
    ];
    // CQRS needs [db, queue, cache] — wildcard provides cache
    const result = matchTagsDistinct(played, ['db', 'queue', 'cache']);
    expect(result).not.toBeNull();
  });
});

describe('detectPatterns – wildcard', () => {
  it('wildcard card triggers a pattern it could not normally trigger', () => {
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      route: 'A',
    });
    // Wildcard card has [compute, wildcard], not [cache] — but wildcard fills it
    const played = [
      makeComponent({ tags: ['compute', 'wildcard'] }),
      makeComponent({ tags: ['db'] }),
    ];
    const result = detectPatterns(played, [readPath]);
    expect(result.some(p => p.id === 'p_read_path')).toBe(true);
  });

  it('wildcard satisfies requires_any_tags', () => {
    const observability = makePattern({
      id: 'p_observability',
      requires_all_tags: ['monitor'],
      requires_any_tags: ['search', 'deploy'],
      route: 'C',
    });
    const played = [
      makeComponent({ tags: ['monitor'] }),
      makeComponent({ tags: ['compute', 'wildcard'] }), // wildcard satisfies any of [search, deploy]
    ];
    const result = detectPatterns(played, [observability]);
    expect(result.some(p => p.id === 'p_observability')).toBe(true);
  });

  it('wildcard does NOT affect domain counting', () => {
    // Wildcard cards don't magically add new domains
    const played = [
      makeComponent({ domain: 'compute', tags: ['compute', 'wildcard'] }),
      makeComponent({ domain: 'compute', tags: ['deploy', 'wildcard'] }),
    ];
    const result = detectPatterns(played, [wideSpectrumPattern]);
    // Only 1 domain (compute), wide spectrum needs 4
    expect(result.some(p => p.id === 'p_wide_spectrum')).toBe(false);
  });
});

// ── Domain-based pattern detection ───────────────────────────────────────

describe('detectPatterns – domain-based', () => {
  it('detects p_domain_pair when 2+ components share a domain', () => {
    const played = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'compute' }),
    ];
    const result = detectPatterns(played, [domainPairPattern]);
    expect(result.some(p => p.id === 'p_domain_pair')).toBe(true);
  });

  it('does NOT trigger p_domain_pair with only 1 component per domain', () => {
    const played = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'data' }),
    ];
    const result = detectPatterns(played, [domainPairPattern]);
    expect(result.some(p => p.id === 'p_domain_pair')).toBe(false);
  });

  it('detects p_domain_triple when 3+ components share a domain', () => {
    const played = [
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'data' }),
    ];
    const result = detectPatterns(played, [domainTriplePattern]);
    expect(result.some(p => p.id === 'p_domain_triple')).toBe(true);
  });

  it('does NOT trigger p_domain_triple with only 2 of same domain', () => {
    const played = [
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'data' }),
    ];
    const result = detectPatterns(played, [domainTriplePattern]);
    expect(result.some(p => p.id === 'p_domain_triple')).toBe(false);
  });

  it('detects p_wide_spectrum when 4+ distinct domains are present', () => {
    const played = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'network' }),
      makeComponent({ domain: 'infra' }),
    ];
    const result = detectPatterns(played, [wideSpectrumPattern]);
    expect(result.some(p => p.id === 'p_wide_spectrum')).toBe(true);
  });

  it('does NOT trigger p_wide_spectrum with only 3 distinct domains', () => {
    const played = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'network' }),
    ];
    const result = detectPatterns(played, [wideSpectrumPattern]);
    expect(result.some(p => p.id === 'p_wide_spectrum')).toBe(false);
  });

  it('detects both p_domain_pair and p_domain_triple when 3+ share a domain', () => {
    const played = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'compute' }),
    ];
    const result = detectPatterns(played, [domainPairPattern, domainTriplePattern]);
    const ids = result.map(p => p.id);
    expect(ids).toContain('p_domain_pair');
    expect(ids).toContain('p_domain_triple');
  });
});

// ── requires_domain check ────────────────────────────────────────────────

describe('detectPatterns – requires_domain', () => {
  it('triggers a pattern when requires_domain count is met', () => {
    const pattern = makePattern({
      id: 'p_custom_domain',
      requires_all_tags: [],
      requires_any_tags: [],
      requires_domain: { domain: 'data', count: 2 },
    });
    const played = [
      makeComponent({ domain: 'data', tags: [] }),
      makeComponent({ domain: 'data', tags: [] }),
    ];
    const result = detectPatterns(played, [pattern]);
    expect(result.some(p => p.id === 'p_custom_domain')).toBe(true);
  });

  it('does NOT trigger when requires_domain count is not met', () => {
    const pattern = makePattern({
      id: 'p_custom_domain',
      requires_all_tags: [],
      requires_any_tags: [],
      requires_domain: { domain: 'data', count: 3 },
    });
    const played = [
      makeComponent({ domain: 'data', tags: [] }),
      makeComponent({ domain: 'data', tags: [] }),
    ];
    const result = detectPatterns(played, [pattern]);
    expect(result.some(p => p.id === 'p_custom_domain')).toBe(false);
  });
});

// ── Route conflict resolution ────────────────────────────────────────────

describe('resolveRouteConflict', () => {
  it('returns only free patterns when no route patterns triggered', () => {
    const freePattern = makePattern({ id: 'p_domain_pair', route: 'free', effects: { mult_add: 1, chips_add: 5 } });
    const result = resolveRouteConflict([freePattern]);
    expect(result.activePatterns).toEqual([freePattern]);
    expect(result.discardedPatterns).toEqual([]);
    expect(result.winningRoute).toBeNull();
  });

  it('keeps route A patterns when only route A triggered', () => {
    const free = makePattern({ id: 'p_domain_pair', route: 'free' });
    const routeA = makePattern({ id: 'p_read_path', route: 'A', effects: { mult_add: 3, chips_add: 10 } });
    const result = resolveRouteConflict([free, routeA]);
    expect(result.activePatterns).toContain(free);
    expect(result.activePatterns).toContain(routeA);
    expect(result.winningRoute).toBe('A');
  });

  it('when A and B conflict, higher total reward wins', () => {
    const routeA1 = makePattern({ id: 'p_read_path', route: 'A', effects: { mult_add: 3, chips_add: 10 } });
    const routeA2 = makePattern({ id: 'p_edge_accel', route: 'A', effects: { mult_add: 3, chips_add: 10 } });
    const routeB1 = makePattern({ id: 'p_write_pipeline', route: 'B', effects: { mult_add: 2, chips_add: 8 } });

    // A total: (3+10)+(3+10) = 26, B total: (2+8) = 10 → A wins
    const result = resolveRouteConflict([routeA1, routeA2, routeB1]);
    expect(result.winningRoute).toBe('A');
    expect(result.activePatterns).toContain(routeA1);
    expect(result.activePatterns).toContain(routeA2);
    expect(result.discardedPatterns).toContain(routeB1);
  });

  it('free patterns always survive route conflict', () => {
    const free = makePattern({ id: 'p_cqrs', route: 'free', effects: { mult_add: 4, chips_add: 12 } });
    const routeA = makePattern({ id: 'p_read_path', route: 'A', effects: { mult_add: 3, chips_add: 10 } });
    const routeB = makePattern({ id: 'p_write_pipeline', route: 'B', effects: { mult_add: 2, chips_add: 8 } });

    const result = resolveRouteConflict([free, routeA, routeB]);
    expect(result.activePatterns).toContain(free);
    expect(result.activePatterns.length).toBe(2); // free + winning route
  });
});

// ── Route mastery ────────────────────────────────────────────────────────

describe('checkRouteMastery', () => {
  it('achieves mastery when all 3 route A patterns triggered across hands', () => {
    const hands = [
      {
        winningRoute: 'A' as const,
        triggeredPatterns: [
          makePattern({ id: 'p_read_path', route: 'A' }),
        ],
      },
      {
        winningRoute: 'A' as const,
        triggeredPatterns: [
          makePattern({ id: 'p_edge_accel', route: 'A' }),
        ],
      },
      {
        winningRoute: 'A' as const,
        triggeredPatterns: [
          makePattern({ id: 'p_hot_protect', route: 'A' }),
        ],
      },
    ];
    const result = checkRouteMastery(hands);
    expect(result.achieved).toBe(true);
    expect(result.route).toBe('A');
    expect(result.bonus).toBe(20);
  });

  it('does NOT achieve mastery when only 2 of 3 patterns triggered', () => {
    const hands = [
      {
        winningRoute: 'A' as const,
        triggeredPatterns: [makePattern({ id: 'p_read_path', route: 'A' })],
      },
      {
        winningRoute: 'A' as const,
        triggeredPatterns: [makePattern({ id: 'p_edge_accel', route: 'A' })],
      },
    ];
    const result = checkRouteMastery(hands);
    expect(result.achieved).toBe(false);
  });

  it('does NOT achieve mastery when same pattern repeated across hands', () => {
    const hands = [
      {
        winningRoute: 'B' as const,
        triggeredPatterns: [makePattern({ id: 'p_write_pipeline', route: 'B' })],
      },
      {
        winningRoute: 'B' as const,
        triggeredPatterns: [makePattern({ id: 'p_write_pipeline', route: 'B' })],
      },
      {
        winningRoute: 'B' as const,
        triggeredPatterns: [makePattern({ id: 'p_event_driven', route: 'B' })],
      },
    ];
    const result = checkRouteMastery(hands);
    expect(result.achieved).toBe(false);
  });
});

// ── Integration with real game data ──────────────────────────────────────

describe('detectPatterns – integration with game data', () => {
  let gamePatterns: Pattern[];

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadGameData } = require('../../data/loader.js');
    gamePatterns = loadGameData().patterns;
  } catch {
    gamePatterns = [];
  }

  const describeIfData = gamePatterns.length > 0 ? describe : describe.skip;

  describeIfData('with real game data', () => {
    it('does NOT trigger p_read_path with single card having cache+db', () => {
      const played = [makeComponent({ tags: ['cache', 'db'] })];
      const result = detectPatterns(played, gamePatterns);
      expect(result.some(p => p.id === 'p_read_path')).toBe(false);
    });

    it('triggers p_read_path when 2 cards provide cache and db', () => {
      const played = [
        makeComponent({ tags: ['cache'] }),
        makeComponent({ tags: ['db'] }),
      ];
      const result = detectPatterns(played, gamePatterns);
      expect(result.some(p => p.id === 'p_read_path')).toBe(true);
    });

    it('triggers p_write_pipeline when components have queue + db on separate cards', () => {
      const played = [
        makeComponent({ tags: ['queue'] }),
        makeComponent({ tags: ['db'] }),
      ];
      const result = detectPatterns(played, gamePatterns);
      expect(result.some(p => p.id === 'p_write_pipeline')).toBe(true);
    });

    it('detects p_domain_pair with 2 compute-domain components', () => {
      const played = [
        makeComponent({ domain: 'compute' }),
        makeComponent({ domain: 'compute' }),
      ];
      const result = detectPatterns(played, gamePatterns);
      expect(result.some(p => p.id === 'p_domain_pair')).toBe(true);
    });

    it('returns empty array when no tags or domains match any pattern', () => {
      const played = [makeComponent({ domain: 'compute', tags: ['nosql'] })];
      const result = detectPatterns(played, gamePatterns);
      expect(result).toEqual([]);
    });

    it('all patterns have a route field', () => {
      for (const p of gamePatterns) {
        expect(['A', 'B', 'C', 'free']).toContain(p.route);
      }
    });
  });
});
