import type { Component, Event } from '../schemas/index.js';

export interface RiskReport {
  allExposed: string[];  // all risks from exposes fields
  allSealed: string[];   // all risks from seals fields
  exposed: string[];     // allExposed minus allSealed (actual risk)
  sealed: string[];      // risks that were exposed but got sealed
}

export function computeRiskExposure(deployed: Component[]): RiskReport {
  const allExposed = [...new Set(deployed.flatMap(c => c.exposes))];
  const allSealed = [...new Set(deployed.flatMap(c => c.seals))];
  const exposed = allExposed.filter(r => !allSealed.includes(r));
  const sealed = allExposed.filter(r => allSealed.includes(r));
  return { allExposed, allSealed, exposed, sealed };
}

export interface EventResult {
  event: Event;
  hit: boolean;
  matchedRisks: string[];
  penalty: { perf: number; rel: number; cx: number };
}

export function resolveEvent(
  event: Event,
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
