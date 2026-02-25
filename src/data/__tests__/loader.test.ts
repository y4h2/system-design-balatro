import { describe, it, expect } from 'vitest';
import { loadGameData } from '../loader.js';

describe('loadGameData', () => {
  it('loads and validates all game data', () => {
    const data = loadGameData();
    expect(data.components.length).toBeGreaterThanOrEqual(50);
    expect(data.scenarios.length).toBeGreaterThanOrEqual(3);
    expect(data.jokers.length).toBeGreaterThanOrEqual(8);
    expect(data.patterns.length).toBeGreaterThanOrEqual(10);
    expect(data.superPatterns.length).toBeGreaterThanOrEqual(4);
    expect(data.schools.length).toBeGreaterThanOrEqual(6);
    expect(data.bossRules.length).toBeGreaterThanOrEqual(5);
    expect(data.tarots.length).toBeGreaterThanOrEqual(8);
  });

  it('components include all 5 domains', () => {
    const data = loadGameData();
    const domains = new Set(data.components.map(c => c.domain));
    expect(domains.size).toBe(5);
    expect(domains).toContain('compute');
    expect(domains).toContain('data');
    expect(domains).toContain('network');
    expect(domains).toContain('defense');
    expect(domains).toContain('platform');
  });

  it('each component has base_chips and domain', () => {
    const data = loadGameData();
    for (const c of data.components) {
      expect(c.domain).toBeDefined();
      expect(c.base_chips).toBeGreaterThanOrEqual(1);
    }
  });
});
