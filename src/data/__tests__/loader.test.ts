import { describe, it, expect } from 'vitest';
import { loadGameData } from '../loader.js';

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
