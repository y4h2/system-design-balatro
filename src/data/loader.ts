import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  ComponentSchema,
  ScenarioSchema,
  JokerSchema,
  PatternSchema,
  SuperPatternSchema,
  SchoolSchema,
  BossRuleSchema,
  TarotSchema,
  PlatformSchema,
} from '../schemas/index.js';

function loadJson<T>(filename: string, schema: z.ZodType<T>): T[] {
  const filePath = resolve(__dirname, '../../gamedata', filename);
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  return z.array(schema).parse(raw);
}

export function loadGameData() {
  return {
    components: loadJson('components.json', ComponentSchema),
    scenarios: loadJson('scenarios.json', ScenarioSchema),
    jokers: loadJson('jokers.json', JokerSchema),
    patterns: loadJson('patterns.json', PatternSchema),
    superPatterns: loadJson('super_patterns.json', SuperPatternSchema),
    schools: loadJson('schools.json', SchoolSchema),
    bossRules: loadJson('boss_rules.json', BossRuleSchema),
    tarots: loadJson('tarots.json', TarotSchema),
    platforms: loadJson('platforms.json', PlatformSchema),
  };
}

export type GameData = ReturnType<typeof loadGameData>;
