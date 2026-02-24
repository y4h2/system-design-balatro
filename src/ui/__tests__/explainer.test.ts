import { describe, it, expect } from 'vitest';
import { formatSettlement } from '../explainer.js';
import type { PhaseSettlement } from '../../engine/phase-runner.js';
import type { Component, Pattern, SuperPattern, Joker, Event } from '../../schemas/index.js';

// ── Helpers to build mock data ──────────────────────────────────────

function mockComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'cmp_test',
    name: 'Test Component',
    desc: 'A test component',
    tags: ['test'],
    delta: { perf: 1, rel: 1, cx: 0 },
    capacity_cost: 10,
    exposes: [],
    seals: [],
    requires_tags: [],
    conflicts_tags: [],
    rarity: 'common',
    category: 'functional',
    ...overrides,
  };
}

function mockPattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: 'pattern_test',
    name: 'Test Pattern',
    desc: 'A test pattern',
    requires_all_tags: ['test'],
    requires_any_tags: [],
    effects: {
      mult_add: 2,
      delta: { perf: 1, rel: 0, cx: 0 },
    },
    ...overrides,
  };
}

function mockSuperPattern(overrides: Partial<SuperPattern> = {}): SuperPattern {
  return {
    id: 'sp_test',
    name: 'Test Super Pattern',
    desc: 'A test super pattern',
    trigger: { type: 'pattern_count', min_patterns: 2 },
    reward: { type: 'mult_burst', mult_add: 3 },
    ...overrides,
  };
}

function mockJoker(overrides: Partial<Joker> = {}): Joker {
  return {
    id: 'jk_test',
    name: 'Test Joker',
    desc: 'A test joker',
    rarity: 'common',
    multiplier: 1.5,
    condition: { require_all_tags: [], require_any_tags: [] },
    reduce_event_penalty: [],
    shop_cost: 10,
    ...overrides,
  };
}

function mockEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event_test',
    name: 'Test Event',
    desc: 'A test event',
    severity: 2,
    targets_risks: ['test_risk'],
    penalty: { perf: -2, rel: -1, cx: 1 },
    flavor_text: 'Something bad happened',
    ...overrides,
  };
}

// ── Full settlement fixture ─────────────────────────────────────────

function fullSettlement(): PhaseSettlement {
  const cdn = mockComponent({ id: 'cmp_cdn', name: 'CDN', tags: ['cdn', 'edge'] });
  const cache = mockComponent({ id: 'cmp_cache', name: 'Cache', tags: ['cache'] });
  const sqlDb = mockComponent({
    id: 'cmp_sql_db',
    name: 'SQL Database',
    tags: ['db', 'sql', 'primary_db'],
    exposes: ['db_single_point', 'slow_query'],
  });

  const readBeast = mockPattern({
    id: 'pattern_read_beast',
    name: 'Read Beast',
    effects: { mult_add: 2, delta: { perf: 1, rel: 0, cx: 0 } },
  });

  const fullStack = mockSuperPattern({
    id: 'sp_full_stack',
    name: 'Full Stack',
  });

  const hotspotTamer = mockJoker({
    id: 'jk_hotspot_tamer',
    name: 'Hotspot Tamer',
    multiplier: 1.2,
  });

  const dbSlowEvent = mockEvent({
    id: 'event_db_slow',
    name: 'DB Slow Query Storm',
    targets_risks: ['slow_query', 'db_single_point'],
    penalty: { perf: -3, rel: -2, cx: 1 },
  });

  return {
    deployedComponents: [cdn, cache, sqlDb],
    deployedTags: ['cdn', 'edge', 'cache', 'db', 'sql', 'primary_db'],
    capacityUsed: 43,
    capacityBudget: 130,
    panel: { perf: 7, rel: 1, cx: 5 },
    triggeredPatterns: [readBeast],
    triggeredSuperPatterns: [fullStack],
    riskReport: {
      allExposed: ['db_single_point', 'slow_query'],
      allSealed: [],
      exposed: ['db_single_point', 'slow_query'],
      sealed: [],
    },
    eventResults: [
      {
        event: dbSlowEvent,
        hit: true,
        matchedRisks: ['slow_query', 'db_single_point'],
        penalty: { perf: -3, rel: -2, cx: 1 },
      },
    ],
    activeJokers: [hotspotTamer],
    jokerMultipliers: [1.2],
    chips: 9.2,
    mult: 3.6,
    constraintPenalty: 5,
    finalScore: 28,
    targetScore: 12,
    passed: true,
  };
}

// ── Minimal settlement (empty arrays) ───────────────────────────────

function minimalSettlement(): PhaseSettlement {
  const gateway = mockComponent({ id: 'cmp_api_gw', name: 'API Gateway', tags: ['gateway'] });

  return {
    deployedComponents: [gateway],
    deployedTags: ['gateway'],
    capacityUsed: 5,
    capacityBudget: 110,
    panel: { perf: 2, rel: 3, cx: 3 },
    triggeredPatterns: [],
    triggeredSuperPatterns: [],
    riskReport: {
      allExposed: [],
      allSealed: [],
      exposed: [],
      sealed: [],
    },
    eventResults: [],
    activeJokers: [],
    jokerMultipliers: [],
    chips: 2.6,
    mult: 1,
    constraintPenalty: 0,
    finalScore: 3,
    targetScore: 100,
    passed: false,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('formatSettlement', () => {
  describe('full settlement (PASS)', () => {
    const output = formatSettlement(fullSettlement());

    it('contains header', () => {
      expect(output).toContain('结算报告 Settlement');
    });

    it('contains deployed component names', () => {
      expect(output).toContain('CDN');
      expect(output).toContain('Cache');
      expect(output).toContain('SQL Database');
    });

    it('contains capacity usage', () => {
      expect(output).toContain('43');
      expect(output).toContain('130');
    });

    it('contains risk report with exposed risks', () => {
      expect(output).toContain('风险敞口');
      expect(output).toContain('db_single_point');
      expect(output).toContain('slow_query');
    });

    it('contains triggered pattern names and mult', () => {
      expect(output).toContain('Read Beast');
      expect(output).toContain('+2');
    });

    it('contains triggered super pattern', () => {
      expect(output).toContain('Full Stack');
      expect(output).toContain('超级牌型');
    });

    it('contains active joker with multiplier', () => {
      expect(output).toContain('Hotspot Tamer');
      expect(output).toContain('1.2');
    });

    it('contains event results with hit status', () => {
      expect(output).toContain('DB Slow Query Storm');
      expect(output).toContain('命中');
    });

    it('contains event penalty details', () => {
      expect(output).toContain('perf');
      expect(output).toContain('rel');
      expect(output).toContain('cx');
    });

    it('contains event matched risks', () => {
      expect(output).toContain('攻击风险');
      expect(output).toContain('slow_query');
    });

    it('contains constraint penalty', () => {
      expect(output).toContain('约束扣分');
      expect(output).toContain('5');
    });

    it('contains final panel values', () => {
      expect(output).toContain('Perf: 7');
      expect(output).toContain('Rel: 1');
      expect(output).toContain('Cx: 5');
    });

    it('contains score breakdown with chips and mult', () => {
      expect(output).toContain('Chips: 9.2');
      expect(output).toContain('3.60');
    });

    it('contains final score and target', () => {
      expect(output).toContain('28');
      expect(output).toContain('12');
    });

    it('contains PASS result', () => {
      expect(output).toContain('PASS');
    });
  });

  describe('minimal settlement (FAIL, empty events/patterns/jokers)', () => {
    const output = formatSettlement(minimalSettlement());

    it('contains deployed component name', () => {
      expect(output).toContain('API Gateway');
    });

    it('contains capacity usage', () => {
      expect(output).toContain('5');
      expect(output).toContain('110');
    });

    it('shows no risk exposure message', () => {
      expect(output).toContain('无风险暴露');
    });

    it('shows no pattern triggered message', () => {
      expect(output).toContain('无牌型触发');
    });

    it('shows no joker message', () => {
      expect(output).toContain('无 Joker 生效');
    });

    it('shows no event message', () => {
      expect(output).toContain('无事件');
    });

    it('contains FAIL result', () => {
      expect(output).toContain('FAIL');
    });

    it('does not contain PASS', () => {
      // FAIL output should not accidentally match PASS
      expect(output).not.toContain('PASS');
    });
  });

  describe('settlement with sealed risks', () => {
    it('shows sealed risks', () => {
      const settlement = fullSettlement();
      settlement.riskReport.sealed = ['db_single_point'];
      settlement.riskReport.exposed = ['slow_query'];

      const output = formatSettlement(settlement);
      expect(output).toContain('已封堵');
      expect(output).toContain('db_single_point');
    });
  });

  describe('settlement with event miss', () => {
    it('shows miss status for event that did not hit', () => {
      const settlement = fullSettlement();
      settlement.eventResults = [
        {
          event: mockEvent({ name: 'Traffic Spike' }),
          hit: false,
          matchedRisks: [],
          penalty: { perf: 0, rel: 0, cx: 0 },
        },
      ];

      const output = formatSettlement(settlement);
      expect(output).toContain('Traffic Spike');
      expect(output).toContain('未命中');
      expect(output).toContain('无惩罚');
    });
  });

  describe('output structure', () => {
    it('includes all nine sections in order', () => {
      const output = formatSettlement(fullSettlement());

      const sectionOrder = [
        '方案摘要',
        '风险报告',
        '牌型触发',
        'Joker 生效',
        '事件回放',
        '约束校验',
        '最终面板',
        '评分明细',
        '结果',   // Implicit via PASS/FAIL
      ];

      // Verify that each section appears, and the earlier sections come before later ones
      let lastIndex = -1;
      for (const section of sectionOrder.slice(0, -1)) { // Skip '结果' since it's implicit
        const idx = output.indexOf(section);
        expect(idx).toBeGreaterThan(lastIndex);
        lastIndex = idx;
      }
    });

    it('starts and ends with decorative borders', () => {
      const output = formatSettlement(fullSettlement());
      const lines = output.split('\n');
      expect(lines[0]).toContain('═');
      expect(lines[lines.length - 1]).toContain('═');
    });
  });
});
