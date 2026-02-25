import { describe, it, expect } from 'vitest';
import { detectPatterns } from '../patterns.js';
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
    effects: { mult_add: 1, chips_add: 5 },
    ...overrides,
  };
}

// A minimal set of patterns for domain-based tests
const domainPairPattern = makePattern({ id: 'p_domain_pair', name: 'Domain Pair' });
const domainTriplePattern = makePattern({ id: 'p_domain_triple', name: 'Domain Triple' });
const wideSpectrumPattern = makePattern({ id: 'p_wide_spectrum', name: 'Wide Spectrum' });
const fullStackPattern = makePattern({ id: 'p_full_stack', name: 'Full Stack' });

// ── Tag-based pattern detection ──────────────────────────────────────────

describe('detectPatterns – tag-based', () => {
  it('detects a pattern when all requires_all_tags are present', () => {
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      requires_any_tags: [],
    });
    const deployed = [
      makeComponent({ tags: ['cache'] }),
      makeComponent({ tags: ['db'] }),
    ];

    const result = detectPatterns(deployed, [readPath]);
    expect(result.some(p => p.id === 'p_read_path')).toBe(true);
  });

  it('does NOT trigger when a required tag is missing', () => {
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      requires_any_tags: [],
    });
    const deployed = [makeComponent({ tags: ['cache'] })]; // missing db

    const result = detectPatterns(deployed, [readPath]);
    expect(result.some(p => p.id === 'p_read_path')).toBe(false);
  });

  it('detects a pattern using requires_any_tags (one of the alternatives)', () => {
    const observability = makePattern({
      id: 'p_observability',
      requires_all_tags: ['monitor'],
      requires_any_tags: ['search', 'deploy'],
    });
    const deployed = [
      makeComponent({ tags: ['monitor'] }),
      makeComponent({ tags: ['search'] }),
    ];

    const result = detectPatterns(deployed, [observability]);
    expect(result.some(p => p.id === 'p_observability')).toBe(true);
  });

  it('does NOT trigger when requires_any_tags has no match', () => {
    const observability = makePattern({
      id: 'p_observability',
      requires_all_tags: ['monitor'],
      requires_any_tags: ['search', 'deploy'],
    });
    const deployed = [makeComponent({ tags: ['monitor'] })]; // none of search/deploy

    const result = detectPatterns(deployed, [observability]);
    expect(result.some(p => p.id === 'p_observability')).toBe(false);
  });

  it('returns empty array when no patterns match', () => {
    const pattern = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
    });
    const deployed = [makeComponent({ tags: ['nosql'] })];

    const result = detectPatterns(deployed, [pattern]);
    expect(result).toEqual([]);
  });

  it('detects multiple tag-based patterns simultaneously', () => {
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      requires_any_tags: [],
    });
    const writePipeline = makePattern({
      id: 'p_write_pipeline',
      requires_all_tags: ['queue', 'db'],
      requires_any_tags: [],
    });
    const deployed = [
      makeComponent({ tags: ['cache'] }),
      makeComponent({ tags: ['db'] }),
      makeComponent({ tags: ['queue'] }),
    ];

    const result = detectPatterns(deployed, [readPath, writePipeline]);
    const ids = result.map(p => p.id);
    expect(ids).toContain('p_read_path');
    expect(ids).toContain('p_write_pipeline');
  });
});

// ── Domain-based pattern detection ───────────────────────────────────────

describe('detectPatterns – domain-based', () => {
  it('detects p_domain_pair when 2+ components share a domain', () => {
    const deployed = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'compute' }),
    ];

    const result = detectPatterns(deployed, [domainPairPattern]);
    expect(result.some(p => p.id === 'p_domain_pair')).toBe(true);
  });

  it('does NOT trigger p_domain_pair with only 1 component per domain', () => {
    const deployed = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'data' }),
    ];

    const result = detectPatterns(deployed, [domainPairPattern]);
    expect(result.some(p => p.id === 'p_domain_pair')).toBe(false);
  });

  it('detects p_domain_triple when 3+ components share a domain', () => {
    const deployed = [
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'data' }),
    ];

    const result = detectPatterns(deployed, [domainTriplePattern]);
    expect(result.some(p => p.id === 'p_domain_triple')).toBe(true);
  });

  it('does NOT trigger p_domain_triple with only 2 of same domain', () => {
    const deployed = [
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'data' }),
    ];

    const result = detectPatterns(deployed, [domainTriplePattern]);
    expect(result.some(p => p.id === 'p_domain_triple')).toBe(false);
  });

  it('detects p_wide_spectrum when 4+ distinct domains are present', () => {
    const deployed = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'network' }),
      makeComponent({ domain: 'defense' }),
    ];

    const result = detectPatterns(deployed, [wideSpectrumPattern]);
    expect(result.some(p => p.id === 'p_wide_spectrum')).toBe(true);
  });

  it('does NOT trigger p_wide_spectrum with only 3 distinct domains', () => {
    const deployed = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'data' }),
      makeComponent({ domain: 'network' }),
    ];

    const result = detectPatterns(deployed, [wideSpectrumPattern]);
    expect(result.some(p => p.id === 'p_wide_spectrum')).toBe(false);
  });

  it('detects both p_domain_pair and p_domain_triple when 3+ share a domain', () => {
    const deployed = [
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'compute' }),
      makeComponent({ domain: 'compute' }),
    ];

    const result = detectPatterns(deployed, [domainPairPattern, domainTriplePattern]);
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
    const deployed = [
      makeComponent({ domain: 'data', tags: [] }),
      makeComponent({ domain: 'data', tags: [] }),
    ];

    const result = detectPatterns(deployed, [pattern]);
    expect(result.some(p => p.id === 'p_custom_domain')).toBe(true);
  });

  it('does NOT trigger when requires_domain count is not met', () => {
    const pattern = makePattern({
      id: 'p_custom_domain',
      requires_all_tags: [],
      requires_any_tags: [],
      requires_domain: { domain: 'data', count: 3 },
    });
    const deployed = [
      makeComponent({ domain: 'data', tags: [] }),
      makeComponent({ domain: 'data', tags: [] }),
    ];

    const result = detectPatterns(deployed, [pattern]);
    expect(result.some(p => p.id === 'p_custom_domain')).toBe(false);
  });
});

// ── p_full_stack (special: 3+ tier-2 patterns) ──────────────────────────

describe('detectPatterns – p_full_stack', () => {
  it('triggers p_full_stack when 3+ tier-2 tag patterns are triggered', () => {
    // Build 3 distinct tier-2 tag patterns + the full_stack pattern
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      requires_any_tags: [],
    });
    const writePipeline = makePattern({
      id: 'p_write_pipeline',
      requires_all_tags: ['queue', 'db'],
      requires_any_tags: [],
    });
    const observability = makePattern({
      id: 'p_observability',
      requires_all_tags: ['monitor'],
      requires_any_tags: ['search', 'deploy'],
    });

    const deployed = [
      makeComponent({ tags: ['cache'] }),
      makeComponent({ tags: ['db'] }),
      makeComponent({ tags: ['queue'] }),
      makeComponent({ tags: ['monitor'] }),
      makeComponent({ tags: ['search'] }),
    ];

    const allPatterns = [readPath, writePipeline, observability, fullStackPattern];
    const result = detectPatterns(deployed, allPatterns);
    const ids = result.map(p => p.id);
    expect(ids).toContain('p_full_stack');
  });

  it('does NOT trigger p_full_stack when fewer than 3 tier-2 patterns match', () => {
    const readPath = makePattern({
      id: 'p_read_path',
      requires_all_tags: ['cache', 'db'],
      requires_any_tags: [],
    });
    const writePipeline = makePattern({
      id: 'p_write_pipeline',
      requires_all_tags: ['queue', 'db'],
      requires_any_tags: [],
    });

    // Only 2 tier-2 patterns can trigger
    const deployed = [
      makeComponent({ tags: ['cache'] }),
      makeComponent({ tags: ['db'] }),
      makeComponent({ tags: ['queue'] }),
    ];

    const allPatterns = [readPath, writePipeline, fullStackPattern];
    const result = detectPatterns(deployed, allPatterns);
    const ids = result.map(p => p.id);
    expect(ids).not.toContain('p_full_stack');
  });
});

// ── Integration with real game data ──────────────────────────────────────

describe('detectPatterns – integration with game data', () => {
  // Import real patterns from game data for integration-style tests
  let gamePatterns: Pattern[];

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadGameData } = require('../../data/loader.js');
    gamePatterns = loadGameData().patterns;
  } catch {
    gamePatterns = [];
  }

  // Only run integration tests if game data is available
  const describeIfData = gamePatterns.length > 0 ? describe : describe.skip;

  describeIfData('with real game data', () => {
    it('detects p_read_path when components have cache + db tags', () => {
      const deployed = [
        makeComponent({ tags: ['cache'] }),
        makeComponent({ tags: ['db'] }),
      ];
      const result = detectPatterns(deployed, gamePatterns);
      expect(result.some(p => p.id === 'p_read_path')).toBe(true);
    });

    it('detects p_write_pipeline when components have queue + db tags', () => {
      const deployed = [
        makeComponent({ tags: ['queue'] }),
        makeComponent({ tags: ['db'] }),
      ];
      const result = detectPatterns(deployed, gamePatterns);
      expect(result.some(p => p.id === 'p_write_pipeline')).toBe(true);
    });

    it('detects p_domain_pair with 2 compute-domain components', () => {
      const deployed = [
        makeComponent({ domain: 'compute' }),
        makeComponent({ domain: 'compute' }),
      ];
      const result = detectPatterns(deployed, gamePatterns);
      expect(result.some(p => p.id === 'p_domain_pair')).toBe(true);
    });

    it('returns empty array when no tags or domains match any pattern', () => {
      const deployed = [makeComponent({ domain: 'compute', tags: ['nosql'] })];
      const result = detectPatterns(deployed, gamePatterns);
      expect(result).toEqual([]);
    });
  });
});
