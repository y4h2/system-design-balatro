import { describe, it, expect } from 'vitest';
import { formatSettlement } from '../explainer.js';
import type { PhaseSettlement } from '../../engine/phase-runner.js';
import type { Component, Pattern, SuperPattern, Joker } from '../../schemas/index.js';

// ── Helpers to build mock data ──────────────────────────────────────

function mockComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: 'cmp_test',
    name: 'Test Component',
    desc: 'A test component',
    domain: 'compute',
    tags: ['test'],
    base_chips: 5,
    delta: { perf: 1, rel: 1, cx: 0 },
    capacity_cost: 10,
    rarity: 'common',
    platform: 'generic',
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
      chips_add: 5,
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
    condition: { require_all_tags: [], require_any_tags: [] },
    effect: { type: 'mult', value: 1.5 },
    shop_cost: 10,
    ...overrides,
  };
}

// ── Full settlement fixture ─────────────────────────────────────────

function fullSettlement(): PhaseSettlement {
  const cdn = mockComponent({ id: 'cmp_cdn', name: 'CDN', domain: 'network', tags: ['cdn', 'edge'] });
  const cache = mockComponent({ id: 'cmp_cache', name: 'Cache', domain: 'data', tags: ['cache'] });
  const sqlDb = mockComponent({
    id: 'cmp_sql_db',
    name: 'SQL Database',
    domain: 'data',
    tags: ['db', 'sql', 'primary_db'],
  });

  const readBeast = mockPattern({
    id: 'pattern_read_beast',
    name: 'Read Beast',
    effects: { mult_add: 2, chips_add: 8 },
  });

  const fullStack = mockSuperPattern({
    id: 'sp_full_stack',
    name: 'Full Stack',
  });

  const hotspotTamer = mockJoker({
    id: 'jk_hotspot_tamer',
    name: 'Hotspot Tamer',
    effect: { type: 'mult', value: 1.2 },
  });

  return {
    deployedComponents: [cdn, cache, sqlDb],
    deployedTags: ['cdn', 'edge', 'cache', 'db', 'sql', 'primary_db'],
    capacityUsed: 43,
    capacityBudget: 130,
    panel: { perf: 7, rel: 1, cx: 5 },
    triggeredPatterns: [readBeast],
    triggeredSuperPatterns: [fullStack],
    superPatternRewards: [],
    activeJokers: [hotspotTamer],
    baseChips: 15,
    patternChips: 8,
    jokerChips: 0,
    chips: 23,
    mult: 3.6,
    constraintResult: { passed: true, penalty: 0, failures: [] },
    constraintPenalty: 0,
    bossPenalty: 0,
    jokerGold: 5,
    finalScore: 83,
    targetScore: 50,
    passed: true,
  };
}

// ── Minimal settlement (empty arrays) ───────────────────────────────

function minimalSettlement(): PhaseSettlement {
  const gateway = mockComponent({
    id: 'cmp_api_gw',
    name: 'API Gateway',
    domain: 'network',
    tags: ['gateway'],
  });

  return {
    deployedComponents: [gateway],
    deployedTags: ['gateway'],
    capacityUsed: 5,
    capacityBudget: 110,
    panel: { perf: 2, rel: 3, cx: 3 },
    triggeredPatterns: [],
    triggeredSuperPatterns: [],
    superPatternRewards: [],
    activeJokers: [],
    baseChips: 5,
    patternChips: 0,
    jokerChips: 0,
    chips: 5,
    mult: 1,
    constraintResult: { passed: true, penalty: 0, failures: [] },
    constraintPenalty: 0,
    bossPenalty: 0,
    jokerGold: 0,
    finalScore: 5,
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

    it('contains triggered pattern names with chips and mult', () => {
      expect(output).toContain('Read Beast');
      expect(output).toContain('+8');   // chips_add
      expect(output).toContain('+2');   // mult_add
    });

    it('contains triggered super pattern', () => {
      expect(output).toContain('Full Stack');
      expect(output).toContain('超级牌型');
    });

    it('contains active joker with effect', () => {
      expect(output).toContain('Hotspot Tamer');
      expect(output).toContain('1.2');
    });

    it('contains constraint info when all passed', () => {
      expect(output).toContain('约束');
    });

    it('contains final panel values', () => {
      expect(output).toContain('Perf: 7');
      expect(output).toContain('Rel: 1');
      expect(output).toContain('Cx: 5');
    });

    it('contains score breakdown with chips and mult', () => {
      expect(output).toContain('Chips');
      expect(output).toContain('23');
      expect(output).toContain('3.60');
    });

    it('contains base chips, pattern chips, and joker chips', () => {
      expect(output).toContain('Base Chips: 15');
      expect(output).toContain('Pattern Chips: 8');
      expect(output).toContain('Joker Chips: 0');
    });

    it('contains final score and target', () => {
      expect(output).toContain('83');
      expect(output).toContain('50');
    });

    it('contains PASS result', () => {
      expect(output).toContain('PASS');
    });
  });

  describe('minimal settlement (FAIL, empty patterns/jokers)', () => {
    const output = formatSettlement(minimalSettlement());

    it('contains deployed component name', () => {
      expect(output).toContain('API Gateway');
    });

    it('contains capacity usage', () => {
      expect(output).toContain('5');
      expect(output).toContain('110');
    });

    it('shows no pattern triggered message', () => {
      expect(output).toContain('无牌型触发');
    });

    it('shows no joker message', () => {
      expect(output).toContain('无 Joker 生效');
    });

    it('contains FAIL result', () => {
      expect(output).toContain('FAIL');
    });

    it('does not contain PASS', () => {
      expect(output).not.toContain('PASS');
    });
  });

  describe('settlement with constraint failures', () => {
    it('shows constraint failures and penalty', () => {
      const settlement = fullSettlement();
      settlement.constraintResult = {
        passed: false,
        penalty: 10,
        failures: ['Must include caching', 'Max 5 components'],
      };
      settlement.constraintPenalty = 10;

      const output = formatSettlement(settlement);
      expect(output).toContain('Must include caching');
      expect(output).toContain('Max 5 components');
      expect(output).toContain('约束扣分');
      expect(output).toContain('10');
    });
  });

  describe('settlement with boss penalty', () => {
    it('shows boss penalty when nonzero', () => {
      const settlement = fullSettlement();
      settlement.bossPenalty = 15;

      const output = formatSettlement(settlement);
      expect(output).toContain('Boss');
      expect(output).toContain('15');
    });
  });

  describe('settlement with joker effect types', () => {
    it('shows chips joker effect', () => {
      const settlement = fullSettlement();
      settlement.activeJokers = [
        mockJoker({
          id: 'jk_chips',
          name: 'Data Hoarder',
          effect: { type: 'chips', value: 3, per_tag: 'db' },
        }),
      ];

      const output = formatSettlement(settlement);
      expect(output).toContain('Data Hoarder');
      expect(output).toContain('chips');
      expect(output).toContain('db');
    });

    it('shows pattern_enhance joker effect', () => {
      const settlement = fullSettlement();
      settlement.activeJokers = [
        mockJoker({
          id: 'jk_enhance',
          name: 'Pattern Amp',
          effect: { type: 'pattern_enhance', extra_mult: 1 },
        }),
      ];

      const output = formatSettlement(settlement);
      expect(output).toContain('Pattern Amp');
      expect(output).toContain('mult');
      expect(output).toContain('pattern');
    });

    it('shows gold joker effect', () => {
      const settlement = fullSettlement();
      settlement.activeJokers = [
        mockJoker({
          id: 'jk_gold',
          name: 'Gold Mine',
          effect: { type: 'gold', value: 5, per: 'pattern' },
        }),
      ];

      const output = formatSettlement(settlement);
      expect(output).toContain('Gold Mine');
      expect(output).toContain('gold');
    });

    it('shows combo_mult joker effect', () => {
      const settlement = fullSettlement();
      settlement.activeJokers = [
        mockJoker({
          id: 'jk_combo',
          name: 'Combo King',
          effect: { type: 'combo_mult', min_patterns: 2, value: 1.5 },
        }),
      ];

      const output = formatSettlement(settlement);
      expect(output).toContain('Combo King');
      expect(output).toContain('1.5');
    });
  });

  describe('output structure', () => {
    it('includes all sections in order', () => {
      const output = formatSettlement(fullSettlement());

      const sectionOrder = [
        '方案摘要',
        '牌型触发',
        'Joker 生效',
        '约束',
        '最终面板',
        '评分明细',
      ];

      let lastIndex = -1;
      for (const section of sectionOrder) {
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
