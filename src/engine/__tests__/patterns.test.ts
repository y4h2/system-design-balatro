import { describe, it, expect } from 'vitest';
import { detectPatterns } from '../patterns.js';
import { loadGameData } from '../../data/loader.js';

describe('detectPatterns', () => {
  const { patterns } = loadGameData();

  it('detects "Read Beast" when tags include cache + cdn', () => {
    const result = detectPatterns(['cache', 'cdn'], patterns);
    expect(result.some(p => p.id === 'pattern_read_beast')).toBe(true);
  });

  it('detects "Read Beast" when tags include cache + read_replica (alternative)', () => {
    const result = detectPatterns(['cache', 'read_replica'], patterns);
    expect(result.some(p => p.id === 'pattern_read_beast')).toBe(true);
  });

  it('detects "Shock Absorber" when tags include rate_limit + queue + worker', () => {
    const result = detectPatterns(['rate_limit', 'queue', 'worker'], patterns);
    expect(result.some(p => p.id === 'pattern_shock_absorber')).toBe(true);
  });

  it('does NOT trigger "Read Beast" when only cdn (missing cache)', () => {
    const result = detectPatterns(['cdn'], patterns);
    expect(result.some(p => p.id === 'pattern_read_beast')).toBe(false);
  });

  it('detects "Always On" when tags include multi_az + health_check + failover', () => {
    const result = detectPatterns(['multi_az', 'health_check', 'failover'], patterns);
    expect(result.some(p => p.id === 'pattern_always_on')).toBe(true);
  });

  it('detects "Debug Loop" when tags include metrics + tracing + alerting', () => {
    const result = detectPatterns(['metrics', 'tracing', 'alerting'], patterns);
    expect(result.some(p => p.id === 'pattern_debug_loop')).toBe(true);
  });

  it('returns empty array when no patterns match', () => {
    const result = detectPatterns(['nosql'], patterns);
    expect(result).toEqual([]);
  });

  it('can detect multiple patterns simultaneously', () => {
    const result = detectPatterns(
      ['cache', 'cdn', 'rate_limit', 'queue', 'worker'],
      patterns,
    );
    const ids = result.map(p => p.id);
    expect(ids).toContain('pattern_read_beast');
    expect(ids).toContain('pattern_shock_absorber');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});
