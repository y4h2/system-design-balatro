# System Design Card Game - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a playable CLI prototype of a Balatro-like System Design card game following PRD v2.

**Architecture:** Data-driven engine with JSON card libraries. Pure game logic layer (no UI coupling) + thin CLI renderer. Follow PRD section 20.3 iterative path: single phase first, then three-phase + Shop, then Joker/Schools, then super patterns/Boss/Tarot.

**Tech Stack:** TypeScript, Vitest, Zod (JSON schema validation), Node.js CLI (chalk + prompts for terminal UI)

---

## Phase 1: Foundation (Tasks 1-4)

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts`

**Step 1: Initialize project**

Run: `cd /Volumes/Crucial/projects/turing-system-design && npm init -y`

**Step 2: Install dependencies**

Run: `npm install typescript zod && npm install -D vitest @types/node tsx`

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
```

**Step 5: Add scripts to package.json**

Add to scripts:
```json
{
  "dev": "tsx src/index.ts",
  "test": "vitest run",
  "test:watch": "vitest",
  "build": "tsc"
}
```

**Step 6: Create placeholder entry**

```ts
// src/index.ts
console.log('System Design Card Game');
```

**Step 7: Verify setup**

Run: `npm test` (should pass with no tests)
Run: `npm run dev` (should print message)

**Step 8: Initialize git and commit**

```bash
git init
# create .gitignore with node_modules, dist
git add -A && git commit -m "chore: project scaffolding"
```

---

### Task 2: Zod Schemas + Types

Define all game data types matching PRD section 7 (card system) and section 15 (JSON directory).

**Files:**
- Create: `src/schemas/component.ts`
- Create: `src/schemas/scenario.ts`
- Create: `src/schemas/joker.ts`
- Create: `src/schemas/event.ts`
- Create: `src/schemas/pattern.ts`
- Create: `src/schemas/super-pattern.ts`
- Create: `src/schemas/school.ts`
- Create: `src/schemas/boss-rule.ts`
- Create: `src/schemas/tarot.ts`
- Create: `src/schemas/index.ts`
- Test: `src/schemas/__tests__/schemas.test.ts`

**Step 1: Write schema test**

```ts
// src/schemas/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { ComponentSchema, ScenarioSchema, JokerSchema, EventSchema, PatternSchema, SuperPatternSchema, SchoolSchema, BossRuleSchema, TarotSchema } from '../index';

describe('ComponentSchema', () => {
  it('parses a valid functional component', () => {
    const data = {
      id: 'cmp_cdn',
      name: 'CDN',
      desc: 'Edge cache',
      tags: ['cdn', 'edge'],
      delta: { perf: 2, rel: 0, cx: 0 },
      capacity_cost: 8,
      exposes: ['cache_invalidation'],
      seals: [],
      requires_tags: [],
      conflicts_tags: [],
      rarity: 'common',
      category: 'functional',
    };
    expect(ComponentSchema.parse(data)).toEqual(data);
  });

  it('rejects component missing required field', () => {
    expect(() => ComponentSchema.parse({ id: 'bad' })).toThrow();
  });
});

describe('ScenarioSchema', () => {
  it('parses a valid scenario with 3 phases', () => {
    const data = {
      id: 'scenario_test',
      name: 'Test',
      desc: 'A test scenario',
      tags: ['read_heavy'],
      initial: { target_qps: 1000, peak_factor: 3, data_gb: 100 },
      phases: [
        {
          blind: 'small',
          subtitle: 'MVP',
          capacity_budget: 110,
          target_score: 12,
          weights: { perf: 1.0, rel: 0.6, cx: 0.4 },
          constraints: { sla: 99.0, compliance_level: 'low' },
          event_pool_severity: [1, 2],
          skippable: true,
          skip_reward: { type: 'tarot_pick', pick: 2, from: 4 },
        },
        {
          blind: 'big',
          subtitle: 'Beta',
          capacity_budget: 90,
          target_score: 25,
          weights: { perf: 1.2, rel: 1.0, cx: 0.8 },
          constraints: { sla: 99.9, compliance_level: 'low' },
          event_pool_severity: [2, 3],
          skippable: true,
          skip_reward: { type: 'joker_direct_pick', pick: 1, from: 'full_pool' },
        },
        {
          blind: 'boss',
          subtitle: 'Production',
          capacity_budget: 70,
          target_score: 45,
          weights: { perf: 1.4, rel: 1.2, cx: 1.0 },
          constraints: { sla: 99.95, compliance_level: 'low' },
          boss_rule: 'cache_disabled',
          event_pool_severity: [3, 5],
          skippable: false,
        },
      ],
    };
    expect(ScenarioSchema.parse(data)).toBeTruthy();
  });
});

describe('Other schemas', () => {
  it('parses a valid joker', () => {
    const data = {
      id: 'jk_test', name: 'Test', desc: 'test', rarity: 'common',
      multiplier: 1.2,
      condition: { require_all_tags: ['cache'], require_any_tags: [] },
      reduce_event_penalty: [],
      shop_cost: 5,
    };
    expect(JokerSchema.parse(data)).toBeTruthy();
  });

  it('parses a valid event', () => {
    const data = {
      id: 'evt_test', name: 'Test', desc: 'test', severity: 3,
      targets_risks: ['cache_avalanche'],
      penalty: { perf: -2, rel: -1, cx: 0 },
      flavor_text: 'oh no',
    };
    expect(EventSchema.parse(data)).toBeTruthy();
  });

  it('parses a valid pattern', () => {
    const data = {
      id: 'pat_test', name: 'Test', desc: 'test',
      requires_all_tags: ['cache'],
      requires_any_tags: ['cdn'],
      effects: { mult_add: 2, delta: { perf: 1, rel: 0, cx: 0 } },
    };
    expect(PatternSchema.parse(data)).toBeTruthy();
  });

  it('parses a valid super pattern', () => {
    const data = {
      id: 'sp_test', name: 'Test', desc: 'test',
      trigger: { type: 'pattern_count', min_patterns: 3 },
      reward: { type: 'mult_burst', mult_add: 8 },
    };
    expect(SuperPatternSchema.parse(data)).toBeTruthy();
  });

  it('parses a valid school', () => {
    const data = {
      id: 'school_test', name: 'Test', desc: 'test',
      modifiers: {
        capacity_discount_tags: [], capacity_discount_factor: 1.0,
        event_severity_offset: 0, draft_rounds: 10, repair_count: 1,
        joker_slots: 4, capacity_budget_offset: 0, baseline_overrides: {},
      },
    };
    expect(SchoolSchema.parse(data)).toBeTruthy();
  });

  it('parses a valid boss rule', () => {
    const data = {
      id: 'boss_test', name: 'Test', desc: 'test',
      effect: 'some effect',
      modifier: { capacity_budget_factor: 0.5 },
    };
    expect(BossRuleSchema.parse(data)).toBeTruthy();
  });

  it('parses a valid tarot', () => {
    const data = {
      id: 'tarot_test', name: 'Test', desc: 'test',
      type: 'info_reveal', effect: 'reveal_next_event',
      shop_cost: 3, rarity: 'common',
    };
    expect(TarotSchema.parse(data)).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/schemas/__tests__/schemas.test.ts`
Expected: FAIL (modules don't exist)

**Step 3: Implement schemas**

Create each schema file following PRD section 7 field definitions. Key schemas:

```ts
// src/schemas/component.ts
import { z } from 'zod';

const DeltaSchema = z.object({
  perf: z.number(),
  rel: z.number(),
  cx: z.number(),
});

export const ComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  tags: z.array(z.string()),
  delta: DeltaSchema,
  capacity_cost: z.number().min(1),
  exposes: z.array(z.string()),
  seals: z.array(z.string()),
  requires_tags: z.array(z.string()),
  conflicts_tags: z.array(z.string()),
  rarity: z.enum(['common', 'uncommon', 'rare']),
  category: z.enum(['functional', 'defensive']),
});

export type Component = z.infer<typeof ComponentSchema>;
```

```ts
// src/schemas/scenario.ts
import { z } from 'zod';

const WeightsSchema = z.object({
  perf: z.number(),
  rel: z.number(),
  cx: z.number(),
});

const ConstraintsSchema = z.object({
  sla: z.number(),
  budget_cost_max: z.number().optional(),
  compliance_level: z.enum(['low', 'medium', 'high']),
  delivery_weeks_max: z.number().optional(),
});

const SkipRewardSchema = z.object({
  type: z.string(),
  pick: z.number().optional(),
  from: z.union([z.number(), z.string()]).optional(),
});

const PhaseSchema = z.object({
  blind: z.enum(['small', 'big', 'boss']),
  subtitle: z.string(),
  capacity_budget: z.number(),
  target_score: z.number(),
  weights: WeightsSchema,
  constraints: ConstraintsSchema,
  event_pool_severity: z.array(z.number()),
  skippable: z.boolean().optional().default(false),
  skip_reward: SkipRewardSchema.optional(),
  boss_rule: z.string().optional(),
});

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  tags: z.array(z.string()),
  initial: z.object({
    target_qps: z.number(),
    peak_factor: z.number(),
    data_gb: z.number(),
  }),
  phases: z.array(PhaseSchema).length(3),
});

export type Scenario = z.infer<typeof ScenarioSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
```

```ts
// src/schemas/joker.ts
import { z } from 'zod';

export const JokerSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  rarity: z.enum(['common', 'uncommon', 'rare']),
  multiplier: z.number().min(1),
  condition: z.object({
    require_all_tags: z.array(z.string()),
    require_any_tags: z.array(z.string()),
    special: z.string().optional(),
  }),
  reduce_event_penalty: z.array(z.object({
    event_id: z.string(),
    factor: z.number(),
  })),
  shop_cost: z.number(),
});

export type Joker = z.infer<typeof JokerSchema>;
```

```ts
// src/schemas/event.ts
import { z } from 'zod';

export const EventSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  severity: z.number().min(1).max(5),
  targets_risks: z.array(z.string()),
  penalty: z.object({ perf: z.number(), rel: z.number(), cx: z.number() }),
  flavor_text: z.string(),
});

export type GameEvent = z.infer<typeof EventSchema>;
```

```ts
// src/schemas/pattern.ts
import { z } from 'zod';

export const PatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  requires_all_tags: z.array(z.string()),
  requires_any_tags: z.array(z.string()),
  effects: z.object({
    mult_add: z.number(),
    delta: z.object({ perf: z.number(), rel: z.number(), cx: z.number() }),
    global_event_penalty_factor: z.number().optional(),
  }),
});

export type Pattern = z.infer<typeof PatternSchema>;
```

```ts
// src/schemas/super-pattern.ts
import { z } from 'zod';

const TriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('pattern_count'), min_patterns: z.number() }),
  z.object({ type: z.literal('risk_and_pattern'), min_patterns: z.number(), min_exposed_risks: z.number().optional(), max_exposed_risks: z.number().optional() }),
  z.object({ type: z.literal('budget_and_pattern'), min_patterns: z.number(), max_budget_usage_percent: z.number() }),
]);

const RewardSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mult_burst'), mult_add: z.number() }),
  z.object({ type: z.literal('capacity_refund'), refund_amount: z.number() }),
  z.object({ type: z.literal('event_immunity') }),
  z.object({ type: z.literal('dimension_flip'), flip_dimension: z.string(), from: z.string(), to: z.string() }),
]);

export const SuperPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  trigger: TriggerSchema,
  reward: RewardSchema,
});

export type SuperPattern = z.infer<typeof SuperPatternSchema>;
```

```ts
// src/schemas/school.ts
import { z } from 'zod';

export const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  modifiers: z.object({
    capacity_discount_tags: z.array(z.string()),
    capacity_discount_factor: z.number(),
    event_severity_offset: z.number(),
    draft_rounds: z.number(),
    draft_options: z.number().optional(),
    repair_count: z.number(),
    joker_slots: z.number(),
    tarot_hand_size: z.number().optional(),
    capacity_budget_offset: z.number(),
    baseline_overrides: z.record(z.number()).default({}),
    scoring_overrides: z.record(z.boolean()).optional(),
    constraint_overrides: z.record(z.number()).optional(),
    free_components: z.array(z.string()).optional(),
    special_rules: z.record(z.union([z.boolean(), z.number()])).optional(),
  }),
});

export type School = z.infer<typeof SchoolSchema>;
```

```ts
// src/schemas/boss-rule.ts
import { z } from 'zod';

export const BossRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  effect: z.string(),
  modifier: z.record(z.unknown()),
});

export type BossRule = z.infer<typeof BossRuleSchema>;
```

```ts
// src/schemas/tarot.ts
import { z } from 'zod';

export const TarotSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  type: z.enum(['info_reveal', 'state_modify']),
  effect: z.union([z.string(), z.record(z.unknown())]),
  shop_cost: z.number(),
  rarity: z.enum(['common', 'uncommon', 'rare']),
});

export type Tarot = z.infer<typeof TarotSchema>;
```

```ts
// src/schemas/index.ts
export { ComponentSchema, type Component } from './component';
export { ScenarioSchema, type Scenario, type Phase } from './scenario';
export { JokerSchema, type Joker } from './joker';
export { EventSchema, type GameEvent } from './event';
export { PatternSchema, type Pattern } from './pattern';
export { SuperPatternSchema, type SuperPattern } from './super-pattern';
export { SchoolSchema, type School } from './school';
export { BossRuleSchema, type BossRule } from './boss-rule';
export { TarotSchema, type Tarot } from './tarot';
```

**Step 4: Run tests**

Run: `npx vitest run src/schemas/__tests__/schemas.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/schemas/
git commit -m "feat: add Zod schemas for all game data types"
```

---

### Task 3: Game Data Loader + JSON Files

Copy PRD section 17 example data into JSON files and build a validated loader.

**Files:**
- Create: `gamedata/components.json`
- Create: `gamedata/scenarios.json`
- Create: `gamedata/jokers.json`
- Create: `gamedata/events.json`
- Create: `gamedata/patterns.json`
- Create: `gamedata/super_patterns.json`
- Create: `gamedata/schools.json`
- Create: `gamedata/boss_rules.json`
- Create: `gamedata/tarots.json`
- Create: `src/data/loader.ts`
- Test: `src/data/__tests__/loader.test.ts`

**Step 1: Copy JSON data from PRD section 17 into gamedata/ files**

Each JSON file contains the array from the corresponding PRD section (17.1-17.10). Combine functional + defensive components into a single `components.json`.

**Step 2: Write loader test**

```ts
// src/data/__tests__/loader.test.ts
import { describe, it, expect } from 'vitest';
import { loadGameData } from '../loader';

describe('loadGameData', () => {
  it('loads and validates all game data', () => {
    const data = loadGameData();
    expect(data.components.length).toBeGreaterThanOrEqual(36);
    expect(data.scenarios.length).toBeGreaterThanOrEqual(3);
    expect(data.jokers.length).toBeGreaterThanOrEqual(6);
    expect(data.events.length).toBeGreaterThanOrEqual(8);
    expect(data.patterns.length).toBeGreaterThanOrEqual(4);
    expect(data.superPatterns.length).toBeGreaterThanOrEqual(4);
    expect(data.schools.length).toBeGreaterThanOrEqual(6);
    expect(data.bossRules.length).toBeGreaterThanOrEqual(5);
    expect(data.tarots.length).toBeGreaterThanOrEqual(10);
  });

  it('components include both functional and defensive', () => {
    const data = loadGameData();
    const functional = data.components.filter(c => c.category === 'functional');
    const defensive = data.components.filter(c => c.category === 'defensive');
    expect(functional.length).toBeGreaterThanOrEqual(30);
    expect(defensive.length).toBeGreaterThanOrEqual(6);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/loader.test.ts`
Expected: FAIL

**Step 4: Implement loader**

```ts
// src/data/loader.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { ComponentSchema, ScenarioSchema, JokerSchema, EventSchema, PatternSchema, SuperPatternSchema, SchoolSchema, BossRuleSchema, TarotSchema } from '../schemas/index';

function loadJson<T>(filename: string, schema: z.ZodType<T>): T[] {
  const filePath = resolve(import.meta.dirname, '../../gamedata', filename);
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  return z.array(schema).parse(raw);
}

export function loadGameData() {
  return {
    components: loadJson('components.json', ComponentSchema),
    scenarios: loadJson('scenarios.json', ScenarioSchema),
    jokers: loadJson('jokers.json', JokerSchema),
    events: loadJson('events.json', EventSchema),
    patterns: loadJson('patterns.json', PatternSchema),
    superPatterns: loadJson('super_patterns.json', SuperPatternSchema),
    schools: loadJson('schools.json', SchoolSchema),
    bossRules: loadJson('boss_rules.json', BossRuleSchema),
    tarots: loadJson('tarots.json', TarotSchema),
  };
}

export type GameData = ReturnType<typeof loadGameData>;
```

**Step 5: Run tests**

Run: `npx vitest run src/data/__tests__/loader.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add gamedata/ src/data/
git commit -m "feat: add game data JSON files and validated loader"
```

---

### Task 4: Core Game State Types

Define the mutable game state that changes during play.

**Files:**
- Create: `src/engine/state.ts`
- Test: `src/engine/__tests__/state.test.ts`

**Step 1: Write test**

```ts
// src/engine/__tests__/state.test.ts
import { describe, it, expect } from 'vitest';
import { createGameState } from '../state';
import { loadGameData } from '../../data/loader';

describe('createGameState', () => {
  it('creates initial game state for a scenario and school', () => {
    const data = loadGameData();
    const scenario = data.scenarios[0];
    const school = data.schools[0]; // SRE
    const state = createGameState(scenario, school);

    expect(state.scenario.id).toBe(scenario.id);
    expect(state.school.id).toBe(school.id);
    expect(state.componentPool).toEqual([]);
    expect(state.jokerSlots.length).toBe(0);
    expect(state.jokerSlotMax).toBe(school.modifiers.joker_slots);
    expect(state.currentPhaseIndex).toBe(0);
    expect(state.gold).toBeGreaterThan(0);
    expect(state.tarotHand).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/__tests__/state.test.ts`
Expected: FAIL

**Step 3: Implement state**

```ts
// src/engine/state.ts
import type { Component, Scenario, School, Joker, Tarot, Phase } from '../schemas/index';

export interface DeployedState {
  components: Component[];
  totalCapacity: number;
}

export interface PhaseResult {
  blind: 'small' | 'big' | 'boss';
  score: number;
  targetScore: number;
  passed: boolean;
  skipped: boolean;
}

export interface GameState {
  scenario: Scenario;
  school: School;
  componentPool: Component[];
  jokerSlots: Joker[];
  jokerSlotMax: number;
  tarotHand: Tarot[];
  tarotHandMax: number;
  currentPhaseIndex: number;
  gold: number;
  phaseResults: PhaseResult[];
  deployed: DeployedState;
}

export function createGameState(scenario: Scenario, school: School): GameState {
  return {
    scenario,
    school,
    componentPool: [],
    jokerSlots: [],
    jokerSlotMax: school.modifiers.joker_slots,
    tarotHand: [],
    tarotHandMax: school.modifiers.tarot_hand_size ?? 2,
    currentPhaseIndex: 0,
    gold: 10,
    phaseResults: [],
    deployed: { components: [], totalCapacity: 0 },
  };
}
```

**Step 4: Run tests**

Run: `npx vitest run src/engine/__tests__/state.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/engine/
git commit -m "feat: add core game state types and factory"
```

---

## Phase 2: Single-Phase Game Loop (Tasks 5-9)

### Task 5: Draft System

Implements 3-choose-1 draft (PRD section 3.2).

**Files:**
- Create: `src/engine/draft.ts`
- Test: `src/engine/__tests__/draft.test.ts`

**Step 1: Write test**

```ts
// src/engine/__tests__/draft.test.ts
import { describe, it, expect } from 'vitest';
import { generateDraftChoices, applyDraftChoice } from '../draft';
import { loadGameData } from '../../data/loader';
import { createGameState } from '../state';

describe('Draft', () => {
  const data = loadGameData();
  const scenario = data.scenarios[0];
  const school = data.schools[0];

  it('generates 3 choices per round', () => {
    const choices = generateDraftChoices(data.components, 3);
    expect(choices).toHaveLength(3);
    // All distinct
    const ids = choices.map(c => c.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('applyDraftChoice adds chosen component to pool', () => {
    const state = createGameState(scenario, school);
    const choices = generateDraftChoices(data.components, 3);
    const picked = choices[0];
    applyDraftChoice(state, picked);
    expect(state.componentPool).toContain(picked);
    expect(state.componentPool.length).toBe(1);
  });

  it('respects school draft_options (Vibe Coding = 2 choices)', () => {
    const vibeSchool = data.schools.find(s => s.id === 'school_vibe_coding')!;
    const draftOptions = vibeSchool.modifiers.draft_options ?? 3;
    const choices = generateDraftChoices(data.components, draftOptions);
    expect(choices).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement draft**

```ts
// src/engine/draft.ts
import type { Component } from '../schemas/index';
import type { GameState } from './state';

export function generateDraftChoices(
  allComponents: Component[],
  count: number,
): Component[] {
  const shuffled = [...allComponents].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function applyDraftChoice(state: GameState, chosen: Component): void {
  state.componentPool.push(chosen);
}
```

**Step 4: Run tests**

Run: `npx vitest run src/engine/__tests__/draft.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/engine/draft.ts src/engine/__tests__/draft.test.ts
git commit -m "feat: add draft system"
```

---

### Task 6: Deploy + Capacity System

Implements component deployment with capacity budget (PRD sections 4, 10).

**Files:**
- Create: `src/engine/deploy.ts`
- Test: `src/engine/__tests__/deploy.test.ts`

**Step 1: Write test**

```ts
// src/engine/__tests__/deploy.test.ts
import { describe, it, expect } from 'vitest';
import { deployComponents, getEffectiveCapacityCost, validateDeployment } from '../deploy';
import type { Component, Phase, School } from '../../schemas/index';

const mockSchool: Pick<School, 'modifiers'> = {
  modifiers: {
    capacity_discount_tags: ['cache'],
    capacity_discount_factor: 0.7,
    event_severity_offset: 0,
    draft_rounds: 10,
    repair_count: 1,
    joker_slots: 4,
    capacity_budget_offset: 0,
    baseline_overrides: {},
  },
};

const mockCache: Component = {
  id: 'cmp_cache', name: 'Cache', desc: '', tags: ['cache'],
  delta: { perf: 3, rel: 0, cx: 1 }, capacity_cost: 15,
  exposes: ['cache_avalanche'], seals: [], requires_tags: [],
  conflicts_tags: [], rarity: 'common', category: 'functional',
};

const mockDB: Component = {
  id: 'cmp_db', name: 'DB', desc: '', tags: ['db'],
  delta: { perf: 1, rel: 1, cx: 1 }, capacity_cost: 20,
  exposes: ['slow_query'], seals: [], requires_tags: [],
  conflicts_tags: [], rarity: 'common', category: 'functional',
};

describe('Deploy', () => {
  it('calculates effective capacity with school discount', () => {
    // Cache gets 0.7 discount from school
    const cost = getEffectiveCapacityCost(mockCache, mockSchool.modifiers);
    expect(cost).toBe(Math.ceil(15 * 0.7)); // 11
  });

  it('no discount for non-matching tags', () => {
    const cost = getEffectiveCapacityCost(mockDB, mockSchool.modifiers);
    expect(cost).toBe(20);
  });

  it('validates deployment within budget', () => {
    const result = validateDeployment([mockCache, mockDB], 100, mockSchool.modifiers);
    expect(result.totalCost).toBe(11 + 20);
    expect(result.overBudget).toBe(false);
    expect(result.penalty).toBe(0);
  });

  it('calculates over-budget penalty', () => {
    const result = validateDeployment([mockCache, mockDB], 25, mockSchool.modifiers);
    expect(result.overBudget).toBe(true);
    expect(result.penalty).toBe((31 - 25) * 5); // 30
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement deploy**

```ts
// src/engine/deploy.ts
import type { Component } from '../schemas/index';
import type { School } from '../schemas/school';

export function getEffectiveCapacityCost(
  component: Component,
  modifiers: School['modifiers'],
): number {
  const hasDiscountTag = component.tags.some(t =>
    modifiers.capacity_discount_tags.includes(t),
  );
  if (hasDiscountTag) {
    return Math.ceil(component.capacity_cost * modifiers.capacity_discount_factor);
  }
  return component.capacity_cost;
}

export interface DeploymentValidation {
  totalCost: number;
  overBudget: boolean;
  penalty: number;
}

export function validateDeployment(
  components: Component[],
  budget: number,
  modifiers: School['modifiers'],
): DeploymentValidation {
  const totalCost = components.reduce(
    (sum, c) => sum + getEffectiveCapacityCost(c, modifiers),
    0,
  );
  const overBudget = totalCost > budget;
  const penalty = overBudget ? (totalCost - budget) * 5 : 0;
  return { totalCost, overBudget, penalty };
}
```

**Step 4: Run tests, then commit**

---

### Task 7: Pattern Detection

Detect which basic patterns are triggered by the deployed component tags (PRD section 8.1).

**Files:**
- Create: `src/engine/patterns.ts`
- Test: `src/engine/__tests__/patterns.test.ts`

**Step 1: Write test**

```ts
// src/engine/__tests__/patterns.test.ts
import { describe, it, expect } from 'vitest';
import { detectPatterns } from '../patterns';
import { loadGameData } from '../../data/loader';

describe('Pattern Detection', () => {
  const data = loadGameData();

  it('detects Read Beast when cache + cdn present', () => {
    const tags = ['cache', 'cdn'];
    const triggered = detectPatterns(tags, data.patterns);
    expect(triggered.some(p => p.id === 'pattern_read_beast')).toBe(true);
  });

  it('detects Shock Absorber when rate_limit + queue + worker', () => {
    const tags = ['rate_limit', 'queue', 'worker'];
    const triggered = detectPatterns(tags, data.patterns);
    expect(triggered.some(p => p.id === 'pattern_shock_absorber')).toBe(true);
  });

  it('does not trigger pattern when missing required tag', () => {
    const tags = ['cdn']; // no cache
    const triggered = detectPatterns(tags, data.patterns);
    expect(triggered.some(p => p.id === 'pattern_read_beast')).toBe(false);
  });

  it('Always On needs multi_az + health_check + (circuit_breaker|failover)', () => {
    const tags = ['multi_az', 'health_check', 'failover'];
    const triggered = detectPatterns(tags, data.patterns);
    expect(triggered.some(p => p.id === 'pattern_always_on')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement pattern detection**

```ts
// src/engine/patterns.ts
import type { Pattern } from '../schemas/index';

export function detectPatterns(deployedTags: string[], patterns: Pattern[]): Pattern[] {
  return patterns.filter(pattern => {
    const hasAllRequired = pattern.requires_all_tags.every(t => deployedTags.includes(t));
    if (!hasAllRequired) return false;
    if (pattern.requires_any_tags.length === 0) return true;
    return pattern.requires_any_tags.some(t => deployedTags.includes(t));
  });
}
```

**Step 4: Run tests, then commit**

---

### Task 8: Risk + Event System

Implements risk exposure, sealing, and event resolution (PRD sections 4, 11).

**Files:**
- Create: `src/engine/risk.ts`
- Test: `src/engine/__tests__/risk.test.ts`

**Step 1: Write test**

```ts
// src/engine/__tests__/risk.test.ts
import { describe, it, expect } from 'vitest';
import { computeRiskExposure, resolveEvent } from '../risk';
import type { Component, GameEvent } from '../../schemas/index';

const cache: Component = {
  id: 'cmp_cache', name: 'Cache', desc: '', tags: ['cache'],
  delta: { perf: 3, rel: 0, cx: 1 }, capacity_cost: 15,
  exposes: ['cache_avalanche', 'data_inconsistency'], seals: [],
  requires_tags: [], conflicts_tags: [], rarity: 'common', category: 'functional',
};

const warmup: Component = {
  id: 'cmp_warmup', name: 'Warmup', desc: '', tags: ['cache_defense'],
  delta: { perf: 0, rel: 1, cx: 1 }, capacity_cost: 8,
  exposes: [], seals: ['cache_avalanche'],
  requires_tags: ['cache'], conflicts_tags: [], rarity: 'common', category: 'defensive',
};

const hotKeyEvent: GameEvent = {
  id: 'event_hot_key', name: 'Hot Key', desc: '', severity: 2,
  targets_risks: ['cache_avalanche', 'data_inconsistency'],
  penalty: { perf: -2, rel: -1, cx: 0 },
  flavor_text: '',
};

describe('Risk System', () => {
  it('computes exposed and sealed risks', () => {
    const result = computeRiskExposure([cache, warmup]);
    expect(result.exposed).toContain('data_inconsistency');
    expect(result.exposed).not.toContain('cache_avalanche'); // sealed
    expect(result.sealed).toContain('cache_avalanche');
  });

  it('resolveEvent applies penalty for exposed risks', () => {
    const { exposed } = computeRiskExposure([cache]); // no warmup
    const result = resolveEvent(hotKeyEvent, exposed);
    expect(result.hit).toBe(true);
    expect(result.penalty).toEqual({ perf: -2, rel: -1, cx: 0 });
  });

  it('resolveEvent is immune when risks are sealed', () => {
    const { exposed } = computeRiskExposure([cache, warmup]);
    // cache_avalanche is sealed, data_inconsistency is still exposed
    const result = resolveEvent(hotKeyEvent, exposed);
    // Still hits because data_inconsistency is exposed
    expect(result.hit).toBe(true);
  });

  it('resolveEvent misses when no deployed component exposes targeted risks', () => {
    const db: Component = {
      id: 'cmp_db', name: 'DB', desc: '', tags: ['db'],
      delta: { perf: 1, rel: 1, cx: 1 }, capacity_cost: 20,
      exposes: ['slow_query'], seals: [],
      requires_tags: [], conflicts_tags: [], rarity: 'common', category: 'functional',
    };
    const { exposed } = computeRiskExposure([db]);
    const result = resolveEvent(hotKeyEvent, exposed);
    expect(result.hit).toBe(false);
    expect(result.penalty).toEqual({ perf: 0, rel: 0, cx: 0 });
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement risk system**

```ts
// src/engine/risk.ts
import type { Component, GameEvent } from '../schemas/index';

export interface RiskReport {
  allExposed: string[];
  allSealed: string[];
  exposed: string[];   // exposed minus sealed
  sealed: string[];    // actually sealed
}

export function computeRiskExposure(deployed: Component[]): RiskReport {
  const allExposed = [...new Set(deployed.flatMap(c => c.exposes))];
  const allSealed = [...new Set(deployed.flatMap(c => c.seals))];
  const exposed = allExposed.filter(r => !allSealed.includes(r));
  const sealed = allExposed.filter(r => allSealed.includes(r));
  return { allExposed, allSealed, exposed, sealed };
}

export interface EventResult {
  event: GameEvent;
  hit: boolean;
  matchedRisks: string[];
  penalty: { perf: number; rel: number; cx: number };
}

export function resolveEvent(
  event: GameEvent,
  exposedRisks: string[],
): EventResult {
  const matchedRisks = event.targets_risks.filter(r => exposedRisks.includes(r));
  const hit = matchedRisks.length > 0;
  return {
    event,
    hit,
    matchedRisks,
    penalty: hit ? { ...event.penalty } : { perf: 0, rel: 0, cx: 0 },
  };
}
```

**Step 4: Run tests, then commit**

---

### Task 9: Scoring Engine

Implements the full scoring formula (PRD section 12).

**Files:**
- Create: `src/engine/scoring.ts`
- Test: `src/engine/__tests__/scoring.test.ts`

**Step 1: Write test**

```ts
// src/engine/__tests__/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { computePanel, computeChips, computeMult, computeFinalScore } from '../scoring';
import type { Component, Pattern, Joker } from '../../schemas/index';

const baseline = { perf: 2, rel: 2, cx: 2 };
const weights = { perf: 1.0, rel: 1.0, cx: 0.5 };

const cache: Component = {
  id: 'cmp_cache', name: 'Cache', desc: '', tags: ['cache'],
  delta: { perf: 3, rel: 0, cx: 1 }, capacity_cost: 15,
  exposes: [], seals: [], requires_tags: [], conflicts_tags: [],
  rarity: 'common', category: 'functional',
};

const cdn: Component = {
  id: 'cmp_cdn', name: 'CDN', desc: '', tags: ['cdn'],
  delta: { perf: 2, rel: 0, cx: 0 }, capacity_cost: 8,
  exposes: [], seals: [], requires_tags: [], conflicts_tags: [],
  rarity: 'common', category: 'functional',
};

describe('Scoring', () => {
  it('computes panel from baseline + component deltas, clamped 0-10', () => {
    const panel = computePanel([cache, cdn], baseline);
    expect(panel.perf).toBe(7); // 2 + 3 + 2 = 7
    expect(panel.rel).toBe(2);  // 2 + 0 + 0
    expect(panel.cx).toBe(3);   // 2 + 1 + 0
  });

  it('clamps panel values to 0-10', () => {
    const heavy: Component = {
      ...cache, delta: { perf: 10, rel: 0, cx: 0 },
    };
    const panel = computePanel([heavy, cache], baseline);
    expect(panel.perf).toBe(10); // clamped
  });

  it('computes Chips from panel × weights', () => {
    const panel = { perf: 7, rel: 2, cx: 3 };
    const chips = computeChips(panel, weights);
    // 1.0*7 + 1.0*2 - 0.5*3 = 7.5
    expect(chips).toBe(7.5);
  });

  it('computes Mult with patterns and jokers', () => {
    const patterns = [
      { effects: { mult_add: 2, delta: { perf: 0, rel: 0, cx: 0 } } },
    ] as Pattern[];
    const jokerMultipliers = [1.2];
    const mult = computeMult(patterns, [], jokerMultipliers);
    // (1 + 2) * 1.2 = 3.6
    expect(mult).toBeCloseTo(3.6);
  });

  it('computes final score', () => {
    const chips = 7.5;
    const mult = 3.6;
    const penalty = 0;
    const final = computeFinalScore(chips, mult, penalty);
    expect(final).toBe(Math.round(7.5 * 3.6));
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement scoring**

```ts
// src/engine/scoring.ts
import type { Component, Pattern, SuperPattern } from '../schemas/index';

export interface Panel {
  perf: number;
  rel: number;
  cx: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computePanel(
  deployed: Component[],
  baseline: Panel,
  patternDeltas: Panel[] = [],
  eventPenalties: Panel[] = [],
): Panel {
  let perf = baseline.perf;
  let rel = baseline.rel;
  let cx = baseline.cx;

  for (const c of deployed) {
    perf += c.delta.perf;
    rel += c.delta.rel;
    cx += c.delta.cx;
  }

  for (const d of patternDeltas) {
    perf += d.perf;
    rel += d.rel;
    cx += d.cx;
  }

  for (const p of eventPenalties) {
    perf += p.perf;
    rel += p.rel;
    cx += p.cx;
  }

  return {
    perf: clamp(perf, 0, 10),
    rel: clamp(rel, 0, 10),
    cx: clamp(cx, 0, 10),
  };
}

export function computeChips(
  panel: Panel,
  weights: { perf: number; rel: number; cx: number },
  cxPositive: boolean = false,
): number {
  const cxContribution = cxPositive ? weights.cx * panel.cx : -weights.cx * panel.cx;
  return weights.perf * panel.perf + weights.rel * panel.rel + cxContribution;
}

export function computeMult(
  patterns: Pattern[],
  superPatterns: { mult_add?: number }[],
  jokerMultipliers: number[],
): number {
  let additive = 1;
  for (const p of patterns) {
    additive += p.effects.mult_add;
  }
  for (const sp of superPatterns) {
    if (sp.mult_add) additive += sp.mult_add;
  }
  let mult = additive;
  for (const jm of jokerMultipliers) {
    mult *= jm;
  }
  return mult;
}

export function computeFinalScore(
  chips: number,
  mult: number,
  constraintPenalty: number,
): number {
  return Math.round(chips * mult - constraintPenalty);
}
```

**Step 4: Run tests, then commit**

---

## Phase 3: Constraint Validation + Settlement (Tasks 10-11)

### Task 10: Constraint Validation

Implements SLA/compliance/capacity constraint checks (PRD section 12.5, 13).

**Files:**
- Create: `src/engine/constraints.ts`
- Test: `src/engine/__tests__/constraints.test.ts`

**Step 1: Write test**

```ts
// src/engine/__tests__/constraints.test.ts
import { describe, it, expect } from 'vitest';
import { validateConstraints } from '../constraints';

describe('Constraint Validation', () => {
  it('penalizes high SLA without enough HA components', () => {
    const result = validateConstraints({
      sla: 99.99,
      compliance_level: 'low',
      deployedTags: ['cache'],
      rel: 3,
      capacityUsed: 50,
      capacityBudget: 100,
      hasAuditLog: false,
      hasEncryption: false,
    });
    expect(result.slaPenalty).toBe(20);
  });

  it('no SLA penalty when requirements met', () => {
    const result = validateConstraints({
      sla: 99.99,
      compliance_level: 'low',
      deployedTags: ['multi_az', 'health_check', 'circuit_breaker'],
      rel: 7,
      capacityUsed: 50,
      capacityBudget: 100,
      hasAuditLog: false,
      hasEncryption: false,
    });
    expect(result.slaPenalty).toBe(0);
  });

  it('penalizes high compliance without audit_log or encryption', () => {
    const result = validateConstraints({
      sla: 99.0,
      compliance_level: 'high',
      deployedTags: [],
      rel: 3,
      capacityUsed: 50,
      capacityBudget: 100,
      hasAuditLog: false,
      hasEncryption: false,
    });
    expect(result.compliancePenalty).toBe(15);
  });

  it('no compliance penalty when both audit_log and encryption present', () => {
    const result = validateConstraints({
      sla: 99.0,
      compliance_level: 'high',
      deployedTags: ['audit_log', 'encryption'],
      rel: 3,
      capacityUsed: 50,
      capacityBudget: 100,
      hasAuditLog: true,
      hasEncryption: true,
    });
    expect(result.compliancePenalty).toBe(0);
  });

  it('penalizes over-budget capacity', () => {
    const result = validateConstraints({
      sla: 99.0,
      compliance_level: 'low',
      deployedTags: [],
      rel: 3,
      capacityUsed: 120,
      capacityBudget: 100,
      hasAuditLog: false,
      hasEncryption: false,
    });
    expect(result.capacityPenalty).toBe(100); // (120-100)*5
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement constraints**

```ts
// src/engine/constraints.ts

interface ConstraintInput {
  sla: number;
  compliance_level: 'low' | 'medium' | 'high';
  deployedTags: string[];
  rel: number;
  capacityUsed: number;
  capacityBudget: number;
  hasAuditLog: boolean;
  hasEncryption: boolean;
}

interface ConstraintResult {
  slaPenalty: number;
  compliancePenalty: number;
  capacityPenalty: number;
  totalPenalty: number;
  details: string[];
}

const HA_TAGS = ['multi_az', 'health_check', 'circuit_breaker', 'failover'];

export function validateConstraints(input: ConstraintInput): ConstraintResult {
  const details: string[] = [];
  let slaPenalty = 0;
  let compliancePenalty = 0;
  let capacityPenalty = 0;

  // SLA check
  const haCount = HA_TAGS.filter(t => input.deployedTags.includes(t)).length;
  if (input.sla >= 99.99) {
    if (haCount < 2 || input.rel < 6) {
      slaPenalty = 20;
      details.push(`SLA 99.99% requires >=2 HA components and rel>=6 (got ${haCount} HA, rel=${input.rel})`);
    }
  } else if (input.sla >= 99.95) {
    if (haCount < 1 || input.rel < 5) {
      slaPenalty = 12;
      details.push(`SLA 99.95% requires >=1 HA component and rel>=5`);
    }
  } else if (input.sla >= 99.9) {
    if (input.rel < 4 && haCount === 0) {
      slaPenalty = 8;
      details.push(`SLA 99.9% requires rel>=4 or HA component`);
    }
  } else {
    if (input.rel < 3) {
      slaPenalty = 5;
      details.push(`Low SLA requires rel>=3`);
    }
  }

  // Compliance check
  if (input.compliance_level === 'high') {
    if (!input.hasAuditLog || !input.hasEncryption) {
      compliancePenalty = 15;
      details.push('High compliance requires audit_log + encryption');
    }
  }

  // Capacity check
  if (input.capacityUsed > input.capacityBudget) {
    capacityPenalty = (input.capacityUsed - input.capacityBudget) * 5;
    details.push(`Over budget by ${input.capacityUsed - input.capacityBudget} points`);
  }

  return {
    slaPenalty,
    compliancePenalty,
    capacityPenalty,
    totalPenalty: slaPenalty + compliancePenalty + capacityPenalty,
    details,
  };
}
```

**Step 4: Run tests, then commit**

---

### Task 11: Phase Runner (Single Phase Orchestrator)

Ties together deploy, pattern detection, risk, events, and scoring into a single phase execution.

**Files:**
- Create: `src/engine/phase-runner.ts`
- Test: `src/engine/__tests__/phase-runner.test.ts`

**Step 1: Write test**

```ts
// src/engine/__tests__/phase-runner.test.ts
import { describe, it, expect } from 'vitest';
import { runPhase } from '../phase-runner';
import { loadGameData } from '../../data/loader';

describe('Phase Runner', () => {
  const data = loadGameData();

  it('runs a single phase and produces a settlement', () => {
    const phase = data.scenarios[0].phases[0]; // shortlink MVP
    const school = data.schools[1]; // startup
    const baseline = { perf: 2, rel: 2, cx: 2 };

    // Pick some components from data
    const deployed = data.components.filter(c =>
      ['cmp_cdn', 'cmp_cache', 'cmp_sql_db'].includes(c.id)
    );

    const result = runPhase({
      phase,
      deployed,
      school,
      baseline,
      jokers: [],
      patterns: data.patterns,
      superPatterns: data.superPatterns,
      events: [data.events[0]], // traffic spike
    });

    expect(result.chips).toBeGreaterThan(0);
    expect(result.mult).toBeGreaterThanOrEqual(1);
    expect(typeof result.finalScore).toBe('number');
    expect(result.targetScore).toBe(phase.target_score);
    expect(typeof result.passed).toBe('boolean');
    expect(result.triggeredPatterns).toBeDefined();
    expect(result.riskReport).toBeDefined();
    expect(result.eventResults).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implement phase runner**

```ts
// src/engine/phase-runner.ts
import type { Component, Pattern, SuperPattern, Joker, GameEvent, Phase } from '../schemas/index';
import type { School } from '../schemas/school';
import { detectPatterns } from './patterns';
import { computeRiskExposure, resolveEvent, type RiskReport, type EventResult } from './risk';
import { validateDeployment } from './deploy';
import { computePanel, computeChips, computeMult, computeFinalScore, type Panel } from './scoring';
import { validateConstraints } from './constraints';

interface PhaseInput {
  phase: Phase;
  deployed: Component[];
  school: School;
  baseline: Panel;
  jokers: Joker[];
  patterns: Pattern[];
  superPatterns: SuperPattern[];
  events: GameEvent[];
}

interface PhaseSettlement {
  // Inputs
  deployedComponents: Component[];
  deployedTags: string[];

  // Capacity
  capacityUsed: number;
  capacityBudget: number;

  // Panel
  panel: Panel;

  // Patterns
  triggeredPatterns: Pattern[];
  triggeredSuperPatterns: SuperPattern[];

  // Risk
  riskReport: RiskReport;
  eventResults: EventResult[];

  // Jokers
  activeJokers: Joker[];
  jokerMultipliers: number[];

  // Scoring
  chips: number;
  mult: number;
  constraintPenalty: number;
  finalScore: number;
  targetScore: number;
  passed: boolean;
}

export function runPhase(input: PhaseInput): PhaseSettlement {
  const { phase, deployed, school, baseline, jokers, patterns, superPatterns, events } = input;

  // 1. Capacity
  const budget = phase.capacity_budget + school.modifiers.capacity_budget_offset;
  const deployment = validateDeployment(deployed, budget, school.modifiers);

  // 2. Tags
  const deployedTags = [...new Set(deployed.flatMap(c => c.tags))];

  // 3. Pattern detection
  const triggeredPatterns = detectPatterns(deployedTags, patterns);
  const patternDeltas = triggeredPatterns.map(p => p.effects.delta);

  // 4. Risk
  const riskReport = computeRiskExposure(deployed);

  // 5. Events
  const eventResults = events.map(e => resolveEvent(e, riskReport.exposed));
  const eventPenalties = eventResults.filter(r => r.hit).map(r => r.penalty);

  // 6. Panel
  const cxPositive = school.modifiers.scoring_overrides?.cx_as_positive === true;
  const panel = computePanel(deployed, baseline, patternDeltas, eventPenalties);

  // 7. Chips
  const chips = computeChips(panel, phase.weights, cxPositive);

  // 8. Joker activation
  const activeJokers = jokers.filter(j => {
    const hasAll = j.condition.require_all_tags.every(t => deployedTags.includes(t));
    if (!hasAll) return false;
    if (j.condition.require_any_tags.length === 0) return true;
    return j.condition.require_any_tags.some(t => deployedTags.includes(t));
  });
  const jokerMultipliers = activeJokers.map(j => j.multiplier);

  // 9. Super patterns (simplified - just check pattern_count type for now)
  const triggeredSuperPatterns = superPatterns.filter(sp => {
    if (sp.trigger.type === 'pattern_count') {
      return triggeredPatterns.length >= sp.trigger.min_patterns;
    }
    if (sp.trigger.type === 'risk_and_pattern') {
      const hasPatterns = triggeredPatterns.length >= sp.trigger.min_patterns;
      if (sp.trigger.min_exposed_risks !== undefined) {
        return hasPatterns && riskReport.exposed.length >= sp.trigger.min_exposed_risks;
      }
      if (sp.trigger.max_exposed_risks !== undefined) {
        return hasPatterns && riskReport.exposed.length <= sp.trigger.max_exposed_risks;
      }
      return false;
    }
    if (sp.trigger.type === 'budget_and_pattern') {
      const usagePercent = (deployment.totalCost / budget) * 100;
      return triggeredPatterns.length >= sp.trigger.min_patterns
        && usagePercent <= sp.trigger.max_budget_usage_percent;
    }
    return false;
  });

  const superPatternMultAdds = triggeredSuperPatterns
    .filter(sp => sp.reward.type === 'mult_burst')
    .map(sp => ({ mult_add: (sp.reward as { mult_add: number }).mult_add }));

  // 10. Mult
  const mult = computeMult(triggeredPatterns, superPatternMultAdds, jokerMultipliers);

  // 11. Constraints
  const hasAuditLog = deployedTags.includes('audit_log');
  const hasEncryption = deployedTags.includes('encryption');
  const constraintResult = validateConstraints({
    sla: phase.constraints.sla,
    compliance_level: phase.constraints.compliance_level as 'low' | 'medium' | 'high',
    deployedTags,
    rel: panel.rel,
    capacityUsed: deployment.totalCost,
    capacityBudget: budget,
    hasAuditLog,
    hasEncryption,
  });

  // 12. Final
  const finalScore = computeFinalScore(chips, mult, constraintResult.totalPenalty);

  return {
    deployedComponents: deployed,
    deployedTags,
    capacityUsed: deployment.totalCost,
    capacityBudget: budget,
    panel,
    triggeredPatterns,
    triggeredSuperPatterns,
    riskReport,
    eventResults,
    activeJokers,
    jokerMultipliers,
    chips,
    mult,
    constraintPenalty: constraintResult.totalPenalty,
    finalScore,
    targetScore: phase.target_score,
    passed: finalScore >= phase.target_score,
  };
}
```

**Step 4: Run tests, then commit**

---

## Phase 4: CLI Game Loop (Tasks 12-14)

### Task 12: Settlement Explainer

Generates human-readable settlement output (PRD section 18).

**Files:**
- Create: `src/ui/explainer.ts`
- Test: `src/ui/__tests__/explainer.test.ts`

**Step 1: Write test**

Test that the explainer produces a string containing key settlement info (component names, triggered patterns, score breakdown).

**Step 2: Implement explainer**

Format the PhaseSettlement into a structured text output matching PRD section 18 template:
- Solution summary (deployed components, tags, capacity)
- Risk report (exposed vs sealed)
- Triggered patterns + super patterns
- Active Jokers
- Event replay (name → risk → hit? → penalty)
- Constraint check
- Score breakdown (Chips × Mult - Penalty = Final)
- Learning points

**Step 3: Run tests, then commit**

---

### Task 13: CLI Renderer (Terminal UI)

Install `chalk` + `@inquirer/prompts` for terminal interaction.

**Files:**
- Create: `src/ui/renderer.ts` (display functions)
- Create: `src/ui/prompts.ts` (user input)
- Modify: `package.json` (add chalk, @inquirer/prompts)

**Key screens:**
1. School selection (list picker)
2. Scenario preview (formatted display)
3. Draft round (3-choose-1 list)
4. Deploy phase (checkbox picker from component pool)
5. Risk report display
6. Event display + repair prompt
7. Settlement display (explainer output)

**Step 1: Install CLI deps**

Run: `npm install chalk @inquirer/prompts`

**Step 2: Implement renderer and prompts**

Each function is a thin wrapper: take game data, format it, display or prompt.

**Step 3: Manual test by running `npm run dev`**

**Step 4: Commit**

---

### Task 14: Single-Phase Game Loop

Wire everything into a playable single-phase CLI game.

**Files:**
- Create: `src/game/single-phase.ts`
- Modify: `src/index.ts`

**Flow:**
1. Load game data
2. Pick school → pick scenario → run draft
3. Show phase info → deploy prompt → risk report
4. Draw event → resolve → repair prompt
5. Score + explainer output

**Step 1: Implement game loop**

```ts
// src/game/single-phase.ts
// Orchestrates: load → school pick → scenario pick → draft → deploy → event → score
```

**Step 2: Wire into index.ts**

**Step 3: Manual playtest**

**Step 4: Commit**

---

## Phase 5: Three-Phase + Shop (Tasks 15-16)

### Task 15: Shop System

**Files:**
- Create: `src/engine/shop.ts`
- Test: `src/engine/__tests__/shop.test.ts`

Implements buying/selling components, Jokers, and Tarots with gold (PRD section 5).

---

### Task 16: Three-Phase Game Loop

**Files:**
- Create: `src/game/full-game.ts`
- Modify: `src/index.ts`

Wire three phases together with Shop between them. Add skip-blind logic (PRD section 3.4).

---

## Phase 6: Advanced Systems (Tasks 17-20)

### Task 17: Joker Activation + School Modifiers

Ensure Joker condition checking works with `special` conditions (e.g., `capacity_under_budget`, `component_count_lte_4`). Apply all school modifier effects (free components, baseline overrides, Vibe Coding special rules).

### Task 18: Super Pattern Rewards

Implement all 4 reward types beyond mult_burst:
- `capacity_refund`: Return capacity, allow deploying more
- `event_immunity`: Zero out remaining event penalties
- `dimension_flip`: Make Cx positive in scoring

### Task 19: Boss Rules

Implement all 5 boss rules from PRD section 14. Apply modifiers during Boss phase.

### Task 20: Tarot System

Implement Tarot hand management, usage timing, and all 10 Tarot effects (info reveal + state modify).

---

## Phase 7: Polish (Tasks 21-22)

### Task 21: Event Selection by Severity

Draw events from the pool matching the phase's `event_pool_severity` range, weighted by severity.

### Task 22: Numerical Balance Pass

Playtest and adjust:
- Target scores per phase
- Capacity budgets
- Component costs and deltas
- Pattern requirements
- Joker multipliers

---

## Dependency Graph

```
Task 1 (scaffold) → Task 2 (schemas) → Task 3 (data loader)
                                          ↓
                                        Task 4 (state) → Task 5 (draft)
                                                           ↓
                                        Task 6 (deploy) → Task 7 (patterns) → Task 8 (risk)
                                                           ↓
                                        Task 9 (scoring) → Task 10 (constraints)
                                                             ↓
                                                           Task 11 (phase runner)
                                                             ↓
                                        Task 12 (explainer) → Task 13 (CLI) → Task 14 (single-phase loop)
                                                                                ↓
                                                             Task 15 (shop) → Task 16 (three-phase)
                                                                                ↓
                                                             Tasks 17-20 (advanced systems)
                                                                                ↓
                                                             Tasks 21-22 (polish)
```
