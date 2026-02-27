import type { Pattern } from '../../schemas/index.js';
import type { HandResult } from '../../engine/phase-runner.js';

interface RouteTreeProps {
  handResults: HandResult[];
  patterns: Pattern[];
}

const ROUTE_CONFIG = {
  A: { label: 'Route A \u00b7 \u8bfb\u4f18\u5316', color: '#f59e0b' },
  B: { label: 'Route B \u00b7 \u5199\u53ef\u9760', color: '#8b5cf6' },
  C: { label: 'Route C \u00b7 \u8fd0\u7ef4',   color: '#06b6d4' },
} as const;

type RouteId = keyof typeof ROUTE_CONFIG;

interface PatternNode {
  pattern: Pattern;
  triggeredAtHand: number | null; // 1-based hand number, null = not triggered
}

function buildRouteData(patterns: Pattern[], handResults: HandResult[]) {
  // Group route patterns
  const routePatterns: Record<RouteId, Pattern[]> = { A: [], B: [], C: [] };
  for (const p of patterns) {
    if (p.route === 'A' || p.route === 'B' || p.route === 'C') {
      routePatterns[p.route].push(p);
    }
  }

  // Build trigger map: patternId -> first hand index (1-based)
  const triggerMap = new Map<string, number>();
  for (let i = 0; i < handResults.length; i++) {
    for (const tp of handResults[i].triggeredPatterns) {
      if (!triggerMap.has(tp.id)) {
        triggerMap.set(tp.id, i + 1);
      }
    }
  }

  // Build nodes per route
  const routes: { id: RouteId; nodes: PatternNode[]; mastery: number }[] = [];
  for (const id of ['A', 'B', 'C'] as RouteId[]) {
    const nodes = routePatterns[id].map(p => ({
      pattern: p,
      triggeredAtHand: triggerMap.get(p.id) ?? null,
    }));
    const mastery = nodes.filter(n => n.triggeredAtHand !== null).length;
    routes.push({ id, nodes, mastery });
  }

  return routes;
}

export default function RouteTree({ handResults, patterns }: RouteTreeProps) {
  const routes = buildRouteData(patterns, handResults);
  const cumulativeScore = handResults.reduce((sum, h) => sum + h.handScore, 0);

  return (
    <div className="space-y-3 py-2 text-xs">
      {routes.map(route => {
        const cfg = ROUTE_CONFIG[route.id];
        const isMastered = route.mastery >= 3;

        return (
          <div
            key={route.id}
            className="bg-[var(--color-surface)] rounded-lg overflow-hidden"
          >
            {/* Route header */}
            <div
              className="px-3 py-1.5 flex items-center gap-2"
              style={{
                borderLeft: `3px solid ${cfg.color}`,
                background: isMastered
                  ? 'linear-gradient(90deg, rgba(245,166,35,0.15), transparent)'
                  : undefined,
              }}
            >
              <span
                className="font-display text-[11px] font-bold"
                style={{ color: cfg.color }}
              >
                {cfg.label}
              </span>
              {isMastered && (
                <span className="text-[10px] text-[var(--color-chips)] font-bold ml-auto">
                  ✦ 精通 +20
                </span>
              )}
            </div>

            {/* Pattern nodes */}
            <div className="px-3 pb-2 pt-1">
              {route.nodes.map((node, idx) => {
                const triggered = node.triggeredAtHand !== null;
                const isLast = idx === route.nodes.length - 1;

                return (
                  <div key={node.pattern.id} className="flex items-stretch">
                    {/* Connector column */}
                    <div className="flex flex-col items-center w-4 shrink-0">
                      {/* Dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                        style={
                          triggered
                            ? {
                                backgroundColor: '#2ecc71',
                                boxShadow: '0 0 6px rgba(46,204,113,0.6)',
                              }
                            : {
                                border: '1.5px solid #555',
                                backgroundColor: 'transparent',
                              }
                        }
                      />
                      {/* Vertical line */}
                      {!isLast && (
                        <div
                          className="flex-1 w-px my-0.5"
                          style={{
                            backgroundColor: triggered && route.nodes[idx + 1]?.triggeredAtHand !== null
                              ? '#2ecc71'
                              : '#333',
                          }}
                        />
                      )}
                    </div>

                    {/* Label */}
                    <div className="ml-1.5 pb-1.5 min-w-0">
                      <span
                        className="text-[11px] leading-tight"
                        style={{ color: triggered ? '#e0e0e0' : '#666' }}
                      >
                        {node.pattern.name}
                      </span>
                      {triggered && (
                        <span className="text-[9px] text-[var(--color-functional)] ml-1.5">
                          Hand {node.triggeredAtHand}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mastery bar */}
            <div className="px-3 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(route.mastery / 3) * 100}%`,
                      backgroundColor: isMastered ? '#f5a623' : cfg.color,
                    }}
                  />
                </div>
                <span className="text-[9px] text-[var(--color-text-muted)] tabular-nums w-6 text-right">
                  {route.mastery}/3
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Cumulative score */}
      {handResults.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-lg px-3 py-2 flex justify-between items-center">
          <span className="text-[var(--color-text-muted)]">累计分数</span>
          <span className="font-display text-sm text-[var(--color-chips)]">{cumulativeScore}</span>
        </div>
      )}
    </div>
  );
}
