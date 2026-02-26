import { describe, it, expect } from 'vitest';
import {
  ComponentSchema,
  ScenarioSchema,
  JokerSchema,
  PatternSchema,
  SuperPatternSchema,
  SchoolSchema,
  BossRuleSchema,
  TarotSchema,
  type Component,
  type Scenario,
  type ScenarioInput,
  type Joker,
  type Pattern,
  type SuperPattern,
  type School,
  type SchoolInput,
  type BossRule,
  type Tarot,
} from '../index.js';

// ---------- Component ----------
describe('ComponentSchema', () => {
  const validComponent: Component = {
    id: 'cmp_cdn',
    name: 'CDN',
    desc: 'Content delivery network',
    domain: 'network',
    tags: ['cache', 'edge'],
    base_chips: 4,
    delta: { perf: 3, rel: 1, cx: 2 },
    capacity_cost: 2,
    rarity: 'common',
    platform: 'generic',
  };

  it('parses a valid component', () => {
    const result = ComponentSchema.safeParse(validComponent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('cmp_cdn');
      expect(result.data.domain).toBe('network');
      expect(result.data.base_chips).toBe(4);
    }
  });

  it('validates all 5 domains', () => {
    for (const domain of ['compute', 'data', 'network', 'defense', 'platform'] as const) {
      const result = ComponentSchema.safeParse({ ...validComponent, domain });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an invalid domain', () => {
    const result = ComponentSchema.safeParse({ ...validComponent, domain: 'storage' });
    expect(result.success).toBe(false);
  });

  it('rejects a component missing required fields', () => {
    const missing = { id: 'cmp_bad', name: 'Bad' };
    const result = ComponentSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it('rejects capacity_cost less than 1', () => {
    const result = ComponentSchema.safeParse({ ...validComponent, capacity_cost: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid rarity', () => {
    const result = ComponentSchema.safeParse({ ...validComponent, rarity: 'legendary' });
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
    constraints: {
      min_perf: 3,
      min_rel: 3,
      constraint_penalty: 10,
    },
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
      skip_reward: { type: 'tarot_pick', pick: 1, from: 3 },
      boss_rule: 'boss_cache_disabled',
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

  it('supports all constraint fields', () => {
    const phaseWithConstraints = {
      ...validPhase('big'),
      constraints: {
        min_perf: 5,
        min_rel: 4,
        max_cx: 7,
        min_domains: 3,
        required_tags: ['cache', 'db'],
        constraint_penalty: 15,
      },
    };
    const result = ScenarioSchema.safeParse({
      ...validScenario,
      phases: [validPhase('small'), phaseWithConstraints, validPhase('boss')],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phases[1].constraints.min_perf).toBe(5);
      expect(result.data.phases[1].constraints.required_tags).toEqual(['cache', 'db']);
    }
  });
});

// ---------- Joker ----------
describe('JokerSchema', () => {
  const validJoker: Joker = {
    id: 'jk_sla_maniac',
    name: 'SLA Maniac',
    desc: 'Multiply when HA deployed',
    rarity: 'uncommon',
    condition: { require_all_tags: ['ha'], require_any_tags: [] },
    effect: { type: 'mult', value: 1.3 },
    shop_cost: 3,
  };

  it('parses a valid mult joker', () => {
    const result = JokerSchema.safeParse(validJoker);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effect.type).toBe('mult');
    }
  });

  it('parses a chips joker', () => {
    const chipsJoker: Joker = {
      ...validJoker,
      id: 'jk_data_hoarder',
      effect: { type: 'chips', value: 3, per_tag: 'db' },
    };
    const result = JokerSchema.safeParse(chipsJoker);
    expect(result.success).toBe(true);
  });

  it('parses a pattern_enhance joker', () => {
    const enhancer: Joker = {
      ...validJoker,
      id: 'jk_pattern_amp',
      effect: { type: 'pattern_enhance', extra_mult: 1 },
    };
    const result = JokerSchema.safeParse(enhancer);
    expect(result.success).toBe(true);
  });

  it('parses a hand_size joker', () => {
    const hand: Joker = {
      ...validJoker,
      id: 'jk_card_counter',
      effect: { type: 'hand_size', value: 2 },
    };
    const result = JokerSchema.safeParse(hand);
    expect(result.success).toBe(true);
  });

  it('parses a discard joker', () => {
    const discard: Joker = {
      ...validJoker,
      id: 'jk_reroll',
      effect: { type: 'discard', value: 2 },
    };
    const result = JokerSchema.safeParse(discard);
    expect(result.success).toBe(true);
  });

  it('parses a gold joker', () => {
    const gold: Joker = {
      ...validJoker,
      id: 'jk_gold_mine',
      effect: { type: 'gold', value: 5, per: 'pattern' },
    };
    const result = JokerSchema.safeParse(gold);
    expect(result.success).toBe(true);
  });

  it('parses a combo_mult joker', () => {
    const combo: Joker = {
      ...validJoker,
      id: 'jk_combo',
      effect: { type: 'combo_mult', min_patterns: 2, value: 1.5 },
    };
    const result = JokerSchema.safeParse(combo);
    expect(result.success).toBe(true);
  });

  it('supports optional special condition', () => {
    const withSpecial: Joker = {
      ...validJoker,
      condition: { require_all_tags: [], require_any_tags: [], special: 'capacity_under_budget' },
    };
    const result = JokerSchema.safeParse(withSpecial);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.condition.special).toBe('capacity_under_budget');
    }
  });

  it('supports null special condition', () => {
    const withNull: Joker = {
      ...validJoker,
      condition: { require_all_tags: [], require_any_tags: [], special: null },
    };
    const result = JokerSchema.safeParse(withNull);
    expect(result.success).toBe(true);
  });
});

// ---------- Pattern ----------
describe('PatternSchema', () => {
  const validPattern: Pattern = {
    id: 'p_read_path',
    name: 'Read Path',
    desc: 'Cache + DB synergy',
    requires_all_tags: ['cache', 'db'],
    requires_any_tags: [],
    effects: {
      mult_add: 2,
      chips_add: 8,
    },
  };

  it('parses a valid pattern', () => {
    const result = PatternSchema.safeParse(validPattern);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects.mult_add).toBe(2);
      expect(result.data.effects.chips_add).toBe(8);
    }
  });

  it('supports optional requires_domain', () => {
    const withDomain = {
      ...validPattern,
      requires_domain: { domain: 'data', count: 2 },
    };
    const result = PatternSchema.safeParse(withDomain);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requires_domain?.domain).toBe('data');
    }
  });

  it('supports null requires_domain', () => {
    const withNull = {
      ...validPattern,
      requires_domain: null,
    };
    const result = PatternSchema.safeParse(withNull);
    expect(result.success).toBe(true);
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

  it('parses a domain_count trigger with chips_burst reward', () => {
    const sp: SuperPattern = {
      id: 'sp_diversity',
      name: 'Domain Diversity',
      desc: 'Use many domains',
      trigger: { type: 'domain_count', min_domains: 4, min_patterns: 2 },
      reward: { type: 'chips_burst', chips_add: 20 },
    };
    const result = SuperPatternSchema.safeParse(sp);
    expect(result.success).toBe(true);
  });

  it('parses a gold_burst reward', () => {
    const sp: SuperPattern = {
      id: 'sp_gold',
      name: 'Gold Rush',
      desc: 'Earn gold',
      trigger: { type: 'pattern_count', min_patterns: 4 },
      reward: { type: 'gold_burst', gold: 10 },
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

  it('rejects invalid reward type', () => {
    const bad = {
      id: 'sp_bad',
      name: 'Bad',
      desc: 'Bad reward',
      trigger: { type: 'pattern_count', min_patterns: 1 },
      reward: { type: 'event_immunity' },
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
        tarot_hand_size: 4,
        deploy_slots_bonus: 1,
        hand_size_bonus: 2,
        discard_bonus: 1,
        baseline_overrides: { perf: 10 },
        free_components: ['cmp_audit_log'],
        special_rules: { double_events: true, extra_capacity: 5 },
      },
    };
    const result = SchoolSchema.safeParse(withOptionals);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modifiers.deploy_slots_bonus).toBe(1);
      expect(result.data.modifiers.hand_size_bonus).toBe(2);
      expect(result.data.modifiers.discard_bonus).toBe(1);
      expect(result.data.modifiers.free_components).toEqual(['cmp_audit_log']);
    }
  });

  it('defaults new bonus fields to 0', () => {
    const result = SchoolSchema.safeParse(validSchool);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modifiers.deploy_slots_bonus).toBe(0);
      expect(result.data.modifiers.hand_size_bonus).toBe(0);
      expect(result.data.modifiers.discard_bonus).toBe(0);
    }
  });
});

// ---------- BossRule ----------
describe('BossRuleSchema', () => {
  const validBossRule: BossRule = {
    id: 'boss_cache_disabled',
    name: 'No Caching Allowed',
    desc: 'Caching components cost double',
    effect: 'capacity_multiplier',
    modifier: { capacity_multiplier_for_tags: ['cache'], factor: 2.0 },
  };

  it('parses a valid boss rule', () => {
    const result = BossRuleSchema.safeParse(validBossRule);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effect).toBe('capacity_multiplier');
    }
  });
});

// ---------- Tarot ----------
describe('TarotSchema', () => {
  it('parses a valid add_tag tarot', () => {
    const tarot: Tarot = {
      id: 't_sharding',
      name: 'Sharding',
      desc: 'Add replication tag to db components',
      effect: { type: 'add_tag', target_tag: 'db', add_tag: 'replication' },
      shop_cost: 3,
      rarity: 'common',
    };
    const result = TarotSchema.safeParse(tarot);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effect.type).toBe('add_tag');
    }
  });

  it('parses a valid add_chips tarot', () => {
    const tarot: Tarot = {
      id: 't_overclock',
      name: 'Overclock',
      desc: 'Add chips to target',
      effect: { type: 'add_chips', target_tag: '*', chips: 5 },
      shop_cost: 4,
      rarity: 'uncommon',
    };
    const result = TarotSchema.safeParse(tarot);
    expect(result.success).toBe(true);
  });

  it('parses a valid change_domain tarot', () => {
    const tarot: Tarot = {
      id: 't_pivot',
      name: 'Pivot',
      desc: 'Change domain',
      effect: { type: 'change_domain', from_domain: '*', to_domain: '*' },
      shop_cost: 3,
      rarity: 'rare',
    };
    const result = TarotSchema.safeParse(tarot);
    expect(result.success).toBe(true);
  });

  it('parses a valid reduce_cost tarot', () => {
    const tarot: Tarot = {
      id: 't_optimize',
      name: 'Optimize',
      desc: 'Reduce capacity cost',
      effect: { type: 'reduce_cost', target_tag: '*', amount: 2 },
      shop_cost: 3,
      rarity: 'uncommon',
    };
    const result = TarotSchema.safeParse(tarot);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid effect type', () => {
    const result = TarotSchema.safeParse({
      id: 't_bad',
      name: 'Bad',
      desc: 'Bad tarot',
      effect: { type: 'nuke', target: 'all' },
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
    expect(index.DomainSchema).toBeDefined();
    expect(index.ScenarioSchema).toBeDefined();
    expect(index.JokerSchema).toBeDefined();
    expect(index.PatternSchema).toBeDefined();
    expect(index.SuperPatternSchema).toBeDefined();
    expect(index.SchoolSchema).toBeDefined();
    expect(index.BossRuleSchema).toBeDefined();
    expect(index.TarotSchema).toBeDefined();
  });
});
