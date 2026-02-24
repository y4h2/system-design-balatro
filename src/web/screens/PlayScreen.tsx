import { useGameStore } from '../store/gameStore';
import TopBar from '../components/TopBar';
import DeployZone from '../components/DeployZone';
import HandZone from '../components/HandZone';
import ScorePanel from '../components/ScorePanel';
import PatternBadge from '../components/PatternBadge';
import RiskBadge from '../components/RiskBadge';
import { validateDeployment } from '../../engine/deploy.js';

const blindLabels: Record<string, string> = {
  small: 'Small Blind',
  big: 'Big Blind',
  boss: 'Boss Blind',
};

export default function PlayScreen() {
  const {
    gameState,
    selectedForDeploy,
    riskPreview,
    patternPreview,
    toggleDeploy,
    runCurrentPhase,
  } = useGameStore();

  if (!gameState) return null;

  const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
  const deployed = gameState.componentPool.filter(c => selectedForDeploy.includes(c.id));
  const budget = phase.capacity_budget + gameState.school.modifiers.capacity_budget_offset;
  const deployment = validateDeployment(deployed, budget, gameState.school.modifiers);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <TopBar
        jokers={gameState.jokerSlots}
        phaseName={blindLabels[phase.blind] || phase.blind}
        phaseSubtitle={phase.subtitle}
        gold={gameState.gold}
      />

      {/* Main content */}
      <div className="flex flex-1">
        {/* Left sidebar - Score panel */}
        <div className="w-56 border-r border-white/5 p-4 space-y-4 bg-[var(--color-surface)]/40">
          <ScorePanel targetScore={phase.target_score} />

          {/* Capacity usage */}
          <div className="bg-[var(--color-surface)] rounded-lg p-3">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">Capacity</div>
            <div className="font-display text-sm">
              <span className={deployment.overBudget ? 'text-red-400' : 'text-white'}>
                {deployment.totalCost}
              </span>
              <span className="text-[var(--color-text-muted)]"> / {budget}</span>
            </div>
            {deployment.overBudget && (
              <div className="text-[10px] text-red-400 mt-1">
                Penalty: -{deployment.penalty}
              </div>
            )}
          </div>

          {/* Patterns preview */}
          <div>
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Patterns</div>
            <div className="flex flex-wrap gap-1">
              {patternPreview.length > 0 ? (
                patternPreview.map(name => <PatternBadge key={name} name={name} />)
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">None detected</span>
              )}
            </div>
          </div>

          {/* Risk preview */}
          {riskPreview && (
            <div>
              <div className="text-xs text-[var(--color-text-muted)] mb-2">Risks</div>
              <div className="flex flex-wrap gap-1">
                {riskPreview.exposed.map(r => (
                  <RiskBadge key={r} name={r} sealed={false} />
                ))}
                {riskPreview.sealed.map(r => (
                  <RiskBadge key={r} name={r} sealed={true} />
                ))}
                {riskPreview.exposed.length === 0 && riskPreview.sealed.length === 0 && (
                  <span className="text-xs text-[var(--color-text-muted)]">No risks</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col">
          {/* Deploy zone */}
          <div className="flex-1 p-4">
            <DeployZone
              components={deployed}
              onUndeploy={(id) => toggleDeploy(id)}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Hand zone */}
          <div className="flex-1">
            <HandZone
              components={gameState.componentPool}
              selectedIds={selectedForDeploy}
              onToggle={(id) => toggleDeploy(id)}
            />
          </div>

          {/* Action bar */}
          <div className="flex justify-center gap-4 py-4 border-t border-white/5">
            <button
              onClick={runCurrentPhase}
              disabled={deployed.length === 0}
              className="px-8 py-3 rounded-xl bg-[var(--color-chips)] text-black font-bold text-lg hover:brightness-110 transition shadow-[var(--glow-chips)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run Phase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
