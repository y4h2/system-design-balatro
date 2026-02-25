import { describe, it, expect } from 'vitest';
import { autoDeal } from '../draft.js';
import { loadGameData } from '../../data/loader.js';

describe('autoDeal', () => {
  const data = loadGameData();

  it('deals the requested number of components', () => {
    const dealt = autoDeal(data.components, new Set(), 5);
    expect(dealt).toHaveLength(5);
  });

  it('deals distinct components', () => {
    const dealt = autoDeal(data.components, new Set(), 5);
    const ids = dealt.map(c => c.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('excludes already-owned components', () => {
    const ownedIds = new Set([data.components[0].id, data.components[1].id]);
    const dealt = autoDeal(data.components, ownedIds, 5);
    for (const c of dealt) {
      expect(ownedIds.has(c.id)).toBe(false);
    }
  });

  it('returns fewer if not enough available', () => {
    const allIds = new Set(data.components.map(c => c.id));
    const dealt = autoDeal(data.components, allIds, 5);
    expect(dealt).toHaveLength(0);
  });

  it('returns all available when count exceeds available', () => {
    const ownedIds = new Set(data.components.slice(2).map(c => c.id));
    const dealt = autoDeal(data.components, ownedIds, 100);
    expect(dealt).toHaveLength(2);
  });
});
