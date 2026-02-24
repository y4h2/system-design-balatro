import { z } from 'zod';
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
} from '../schemas/index.js';

import componentsJson from '../../gamedata/components.json';
import scenariosJson from '../../gamedata/scenarios.json';
import jokersJson from '../../gamedata/jokers.json';
import eventsJson from '../../gamedata/events.json';
import patternsJson from '../../gamedata/patterns.json';
import superPatternsJson from '../../gamedata/super_patterns.json';
import schoolsJson from '../../gamedata/schools.json';
import bossRulesJson from '../../gamedata/boss_rules.json';
import tarotsJson from '../../gamedata/tarots.json';

function parseArray<T>(data: unknown, schema: z.ZodType<T>): T[] {
  return z.array(schema).parse(data);
}

let cached: ReturnType<typeof loadGameDataWeb> | null = null;

export function loadGameDataWeb() {
  if (cached) return cached;
  cached = {
    components: parseArray(componentsJson, ComponentSchema),
    scenarios: parseArray(scenariosJson, ScenarioSchema),
    jokers: parseArray(jokersJson, JokerSchema),
    events: parseArray(eventsJson, EventSchema),
    patterns: parseArray(patternsJson, PatternSchema),
    superPatterns: parseArray(superPatternsJson, SuperPatternSchema),
    schools: parseArray(schoolsJson, SchoolSchema),
    bossRules: parseArray(bossRulesJson, BossRuleSchema),
    tarots: parseArray(tarotsJson, TarotSchema),
  };
  return cached;
}

export type GameData = ReturnType<typeof loadGameDataWeb>;
