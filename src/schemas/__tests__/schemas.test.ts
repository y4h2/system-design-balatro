import { describe, it, expect } from 'vitest';
import {
  ComponentSchema,
  ScenarioSchema,
  JokerSchema,
  EventSchema,
  PatternSchema,
  SuperPatternSchema,
  SchoolSchema,
  BossRuleSchema,
  TarotSchema,
  type Component,
  type Scenario,
  type ScenarioInput,
  type Joker,
  type Event,
  type Pattern,
  type SuperPattern,
  type School,
  type SchoolInput,
  type BossRule,
  type Tarot,
} from '../index.js';

// ---------- Component ----------
describe('ComponentSchema', () => {
  const validFunctional: Component = {
    id: 'comp_cdn',
    name: 'CDN',
    desc: 'Content delivery network',
    tags: ['caching', 'edge'],
    delta: { perf: 3, rel: 1, cx: 2 },
    capacity_cost: 2,
    exposes: ['cache_invalidation'],
    seals: [],
    requires_tags: [],
    conflicts_tags: ['on_prem_only'],
    rarity: 'common',
    category: 'functional',
  };

  it('parses a valid functional component', () => {
    const result = ComponentSchema.safeParse(validFunctional);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('comp_cdn');
      expect(result.data.category).toBe('functional');
    }
  });

  it('parses a valid defensive component', () => {
    const defensive: Component = {
      ...validFunctional,
      id: 'comp_waf',
      name: 'WAF',
      category: 'defensive',
      seals: ['sql_injection'],
      exposes: [],
    };
    const result = ComponentSchema.safeParse(defensive);
    expect(result.success).toBe(true);
  });

  it('rejects a component missing required fields', () => {
    const missing = { id: 'comp_bad', name: 'Bad' };
    const result = ComponentSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it('rejects capacity_cost less than 1', () => {
    const result = ComponentSchema.safeParse({ ...validFunctional, capacity_cost: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid rarity', () => {
    const result = ComponentSchema.safeParse({ ...validFunctional, rarity: 'legendary' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid category', () => {
    const result = ComponentSchema.safeParse({ ...validFunctional, category: 'utility' });
    expect(result.success).toBe(false);
  });
});

// ---------- Scenario ----------
describe('ScenarioSchema', () => {
  const validPhase = (blind: 'small' | 'big' | 'boss') => ({
    blind,
    subtitle: `${blind} blind subtitle`,
    capacity_budget: 10,
    target_score: 100,
    weights: { perf: 0.4, rel: 0.3, cx: 0.3 },
    constraints: { sla: 99.9, compliance_level: 'medium' as const },
    event_pool_severity: [1, 2, 3],
  });

  const validScenario: ScenarioInput = {
    id: 'sc_ecommerce',
    name: 'E-Commerce Platform',
    desc: 'Build a scalable e-commerce platform',
    tags: ['web', 'commerce'],
    initial: { target_qps: 1000, peak_factor: 3, data_gb: 500 },
    phases: [validPhase('small'), validPhase('big'), validPhase('boss')],
  };

  it('parses a valid scenario with 3 phases', () => {
    const result = ScenarioSchema.safeParse(validScenario);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phases).toHaveLength(3);
      expect(result.data.phases[0].blind).toBe('small');
    }
  });

  it('rejects a scenario with fewer than 3 phases', () => {
    const result = ScenarioSchema.safeParse({
      ...validScenario,
      phases: [validPhase('small'), validPhase('big')],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a scenario with more than 3 phases', () => {
    const result = ScenarioSchema.safeParse({
      ...validScenario,
      phases: [validPhase('small'), validPhase('big'), validPhase('boss'), validPhase('boss')],
    });
    expect(result.success).toBe(false);
  });

  it('supports optional phase fields (skippable, skip_reward, boss_rule)', () => {
    const phaseWithOptionals = {
      ...validPhase('boss'),
      skippable: true,
      skip_reward: { type: 'draft', pick: 1, from: 3 },
      boss_rule: 'br_no_cache',
    };
    const result = ScenarioSchema.safeParse({
      ...validScenario,
      phases: [validPhase('small'), validPhase('big'), phaseWithOptionals],
    });
    expect(result.success).toBe(true);
  });

  it('defaults skippable to false when omitted', () => {
    const result = ScenarioSchema.safeParse(validScenario);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phases[0].skippable).toBe(false);
    }
  });

  it('supports optional constraints (budget_cost_max, delivery_weeks_max)', () => {
    const phaseWithConstraints = {
      ...validPhase('big'),
      constraints: {
        sla: 99.95,
        budget_cost_max: 50,
        compliance_level: 'high' as const,
        delivery_weeks_max: 12,
      },
    };
    const result = ScenarioSchema.safeParse({
      ...validScenario,
      phases: [validPhase('small'), phaseWithConstraints, validPhase('boss')],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phases[1].constraints.budget_cost_max).toBe(50);
      expect(result.data.phases[1].constraints.delivery_weeks_max).toBe(12);
    }
  });
});

// ---------- Joker ----------
describe('JokerSchema', () => {
  const validJoker: Joker = {
    id: 'jk_cache_master',
    name: 'Cache Master',
    desc: 'Bonus for caching components',
    rarity: 'uncommon',
    multiplier: 1.5,
    condition: { require_all_tags: ['caching'], require_any_tags: [] },
    reduce_event_penalty: [{ event_id: 'ev_cache_miss', factor: 0.5 }],
    shop_cost: 3,
  };

  it('parses a valid joker', () => {
    const result = JokerSchema.safeParse(validJoker);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.multiplier).toBe(1.5);
    }
  });

  it('rejects multiplier less than 1', () => {
    const result = JokerSchema.safeParse({ ...validJoker, multiplier: 0.5 });
    expect(result.success).toBe(false);
  });

  it('supports optional special condition', () => {
    const withSpecial = {
      ...validJoker,
      condition: { require_all_tags: [], require_any_tags: [], special: 'all_same_category' },
    };
    const result = JokerSchema.safeParse(withSpecial);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.condition.special).toBe('all_same_category');
    }
  });
});

// ---------- Event ----------
describe('EventSchema', () => {
  const validEvent: Event = {
    id: 'ev_ddos',
    name: 'DDoS Attack',
    desc: 'Distributed denial of service attack',
    severity: 4,
    targets_risks: ['network_flood', 'no_waf'],
    penalty: { perf: -5, rel: -3, cx: -2 },
    flavor_text: 'Your servers are under heavy load!',
  };

  it('parses a valid event', () => {
    const result = EventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severity).toBe(4);
    }
  });

  it('rejects severity below 1', () => {
    const result = EventSchema.safeParse({ ...validEvent, severity: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects severity above 5', () => {
    const result = EventSchema.safeParse({ ...validEvent, severity: 6 });
    expect(result.success).toBe(false);
  });
});

// ---------- Pattern ----------
describe('PatternSchema', () => {
  const validPattern: Pattern = {
    id: 'pat_micro',
    name: 'Microservices',
    desc: 'Distributed microservices pattern',
    requires_all_tags: ['api_gateway', 'service_mesh'],
    requires_any_tags: ['container', 'serverless'],
    effects: {
      mult_add: 0.2,
      delta: { perf: 1, rel: 2, cx: 0 },
    },
  };

  it('parses a valid pattern', () => {
    const result = PatternSchema.safeParse(validPattern);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.mult_add).toBe(0.2);
    }
  });

  it('supports optional global_event_penalty_factor', () => {
    const withFactor = {
      ...validPattern,
      effects: { ...validPattern.effects, global_event_penalty_factor: 0.8 },
    };
    const result = PatternSchema.safeParse(withFactor);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.global_event_penalty_factor).toBe(0.8);
    }
  });
});

// ---------- SuperPattern ----------
describe('SuperPatternSchema', () => {
  it('parses a pattern_count trigger with mult_burst reward', () => {
    const sp: SuperPattern = {
      id: 'sp_arch_mastery',
      name: 'Architecture Mastery',
      desc: 'Achieve pattern mastery',
      trigger: { type: 'pattern_count', min_patterns: 3 },
      reward: { type: 'mult_burst', mult_add: 1.5 },
    };
    const result = SuperPatternSchema.safeParse(sp);
    expect(result.success).toBe(true);
  });

  it('parses a risk_and_pattern trigger with event_immunity reward', () => {
    const sp: SuperPattern = {
      id: 'sp_risk_zero',
      name: 'Risk Zero',
      desc: 'Mitigate all risks while maintaining patterns',
      trigger: { type: 'risk_and_pattern', min_patterns: 2, max_exposed_risks: 0 },
      reward: { type: 'event_immunity' },
    };
    const result = SuperPatternSchema.safeParse(sp);
    expect(result.success).toBe(true);
  });

  it('parses a budget_and_pattern trigger with capacity_refund reward', () => {
    const sp: SuperPattern = {
      id: 'sp_lean',
      name: 'Lean Architecture',
      desc: 'Efficient use of budget',
      trigger: { type: 'budget_and_pattern', min_patterns: 2, max_budget_usage_percent: 70 },
      reward: { type: 'capacity_refund', refund_amount: 3 },
    };
    const result = SuperPatternSchema.safeParse(sp);
    expect(result.success).toBe(true);
  });

  it('parses a dimension_flip reward', () => {
    const sp: SuperPattern = {
      id: 'sp_flip',
      name: 'Dimension Flip',
      desc: 'Flip scoring dimensions',
      trigger: { type: 'pattern_count', min_patterns: 4 },
      reward: { type: 'dimension_flip', flip_dimension: 'perf', from: 'low', to: 'high' },
    };
    const result = SuperPatternSchema.safeParse(sp);
    expect(result.success).toBe(true);
  });

  it('rejects invalid trigger type', () => {
    const bad = {
      id: 'sp_bad',
      name: 'Bad',
      desc: 'Bad trigger',
      trigger: { type: 'invalid', min_patterns: 1 },
      reward: { type: 'mult_burst', mult_add: 1.0 },
    };
    const result = SuperPatternSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

// ---------- School ----------
describe('SchoolSchema', () => {
  const validSchool: SchoolInput = {
    id: 'sch_cloud_native',
    name: 'Cloud Native',
    desc: 'Cloud-first architecture school',
    modifiers: {
      capacity_discount_tags: ['cloud', 'serverless'],
      capacity_discount_factor: 0.8,
      event_severity_offset: -1,
      draft_rounds: 5,
      repair_count: 2,
      joker_slots: 3,
      capacity_budget_offset: 2,
    },
  };

  it('parses a valid school', () => {
    const result = SchoolSchema.safeParse(validSchool);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modifiers.capacity_discount_factor).toBe(0.8);
    }
  });

  it('defaults baseline_overrides to empty object', () => {
    const result = SchoolSchema.safeParse(validSchool);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modifiers.baseline_overrides).toEqual({});
    }
  });

  it('supports all optional modifier fields', () => {
    const withOptionals: SchoolInput = {
      ...validSchool,
      modifiers: {
        ...validSchool.modifiers,
        draft_options: 5,
        tarot_hand_size: 4,
        baseline_overrides: { perf: 10 },
        scoring_overrides: { bonus_round: true },
        constraint_overrides: { max_latency: 200 },
        free_components: ['comp_lb'],
        special_rules: { double_events: true, extra_capacity: 5 },
      },
    };
    const result = SchoolSchema.safeParse(withOptionals);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modifiers.draft_options).toBe(5);
      expect(result.data.modifiers.free_components).toEqual(['comp_lb']);
    }
  });
});

// ---------- BossRule ----------
describe('BossRuleSchema', () => {
  const validBossRule: BossRule = {
    id: 'br_no_cache',
    name: 'No Caching Allowed',
    desc: 'Caching components are banned',
    effect: 'ban_tag',
    modifier: { banned_tag: 'caching' },
  };

  it('parses a valid boss rule', () => {
    const result = BossRuleSchema.safeParse(validBossRule);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effect).toBe('ban_tag');
    }
  });
});

// ---------- Tarot ----------
describe('TarotSchema', () => {
  it('parses a valid info_reveal tarot with string effect', () => {
    const tarot: Tarot = {
      id: 'tar_reveal_events',
      name: 'The Oracle',
      desc: 'Reveals upcoming events',
      type: 'info_reveal',
      effect: 'show_next_events',
      shop_cost: 2,
      rarity: 'common',
    };
    const result = TarotSchema.safeParse(tarot);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('info_reveal');
      expect(result.data.effect).toBe('show_next_events');
    }
  });

  it('parses a valid state_modify tarot with object effect', () => {
    const tarot: Tarot = {
      id: 'tar_capacity_boost',
      name: 'The Builder',
      desc: 'Increases capacity budget',
      type: 'state_modify',
      effect: { capacity_add: 3, duration: 'phase' },
      shop_cost: 4,
      rarity: 'rare',
    };
    const result = TarotSchema.safeParse(tarot);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('state_modify');
      expect(result.data.effect).toEqual({ capacity_add: 3, duration: 'phase' });
    }
  });

  it('rejects an invalid type', () => {
    const result = TarotSchema.safeParse({
      id: 'tar_bad',
      name: 'Bad',
      desc: 'Bad tarot',
      type: 'attack',
      effect: 'nope',
      shop_cost: 1,
      rarity: 'common',
    });
    expect(result.success).toBe(false);
  });
});

// ---------- Index re-exports ----------
describe('Index re-exports', () => {
  it('exports all schemas from index', async () => {
    const index = await import('../index.js');
    expect(index.ComponentSchema).toBeDefined();
    expect(index.ScenarioSchema).toBeDefined();
    expect(index.JokerSchema).toBeDefined();
    expect(index.EventSchema).toBeDefined();
    expect(index.PatternSchema).toBeDefined();
    expect(index.SuperPatternSchema).toBeDefined();
    expect(index.SchoolSchema).toBeDefined();
    expect(index.BossRuleSchema).toBeDefined();
    expect(index.TarotSchema).toBeDefined();
  });
});
