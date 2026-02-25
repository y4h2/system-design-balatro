import { motion } from 'framer-motion';
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
    handState,
    selectedForDeploy,
    selectedForDiscard,
    riskPreview,
    patternPreview,
    toggleDeploy,
    toggleDiscard,
    executeDiscard,
    runCurrentPhase,
  } = useGameStore();

  if (!gameState || !handState) return null;

  const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
  const deployed = handState.hand.filter(c => selectedForDeploy.includes(c.id));
  const budget = phase.capacity_budget + gameState.school.modifiers.capacity_budget_offset;
  const deployment = validateDeployment(deployed, budget, gameState.school.modifiers);

  const handCards = handState.hand.filter(c => !selectedForDeploy.includes(c.id));

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
      <div className="flex flex-col md:flex-row flex-1">
        {/* Left sidebar - Score panel */}
        <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-white/5 p-4 space-y-4 bg-[var(--color-surface)]/40">
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
            {/* Capacity bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${deployment.overBudget ? 'bg-red-400' : deployment.totalCost / budget > 0.8 ? 'bg-amber-400' : 'bg-[var(--color-functional)]'}`}
                animate={{ width: `${Math.min((deployment.totalCost / budget) * 100, 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {deployment.overBudget && (
              <div className="text-[11px] text-red-400 mt-1">
                Penalty: -{deployment.penalty}
              </div>
            )}
          </div>

          {/* Hand info */}
          <div className="bg-[var(--color-surface)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-muted)]">Hand</span>
              <span className="font-display text-sm">{handState.hand.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-muted)]">Deck</span>
              <span className="font-display text-sm">{handState.drawPile.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-muted)]">Discards</span>
              <span className={`font-display text-sm ${handState.discardsRemaining === 0 ? 'text-red-400' : 'text-[var(--color-chips)]'}`}>
                {handState.discardsRemaining}/3
              </span>
            </div>
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
              cards={handCards}
              discardSelectedIds={selectedForDiscard}
              onToggleDeploy={(id) => toggleDeploy(id)}
              onToggleDiscard={(id) => toggleDiscard(id)}
            />
          </div>

          {/* Action bar */}
          <div className="flex justify-center gap-4 py-4 border-t border-white/5">
            <button
              onClick={executeDiscard}
              disabled={selectedForDiscard.length === 0 || handState.discardsRemaining <= 0}
              className="px-6 py-3 rounded-xl bg-amber-600 text-white font-bold text-base hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Discard {selectedForDiscard.length > 0 ? `(${selectedForDiscard.length})` : ''} — {handState.discardsRemaining} left
            </button>
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
