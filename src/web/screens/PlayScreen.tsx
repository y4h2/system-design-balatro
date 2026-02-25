import { useState } from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import TopBar from '../components/TopBar';
import DeployZone from '../components/DeployZone';
import HandZone from '../components/HandZone';
import DiscardZone from '../components/DiscardZone';
import ComponentCard from '../components/ComponentCard';
import ScorePanel from '../components/ScorePanel';
import PatternBadge from '../components/PatternBadge';
import RunInfoPopup from '../components/RunInfoPopup';
import { validateDeployment } from '../../engine/deploy.js';
import type { Component } from '../../schemas/index.js';

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
    patternPreview,
    scorePreview,
    toggleDeploy,
    toggleDiscard,
    executeDiscard,
    runCurrentPhase,
  } = useGameStore();

  const [draggedComponent, setDraggedComponent] = useState<Component | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (!gameState || !handState) return null;

  const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
  const deployed = handState.hand.filter(c => selectedForDeploy.includes(c.id));
  const budget = phase.capacity_budget + gameState.school.modifiers.capacity_budget_offset;
  const deployment = validateDeployment(deployed, budget, gameState.school.modifiers);

  const handCards = handState.hand.filter(c => !selectedForDeploy.includes(c.id) && !selectedForDiscard.includes(c.id));
  const discardCards = handState.hand.filter(c => selectedForDiscard.includes(c.id));

  function handleDragStart(event: DragStartEvent) {
    const { component } = event.active.data.current ?? {};
    setDraggedComponent(component ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedComponent(null);
    const { over, active } = event;
    if (!over || !active.data.current) return;

    const { source, componentId } = active.data.current;

    if (source === 'hand' && over.id === 'discard-zone') {
      toggleDiscard(componentId);
    } else if (source === 'discard' && over.id === 'hand-zone') {
      toggleDiscard(componentId);
    }
  }

  // Constraint info for sidebar
  const constraints = phase.constraints;

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
          <ScorePanel
            panel={scorePreview?.panel}
            baseChips={scorePreview?.baseChips}
            patternChips={scorePreview?.patternChips}
            jokerChips={scorePreview?.jokerChips}
            chips={scorePreview?.chips}
            mult={scorePreview?.mult}
            patternMultAdds={scorePreview?.patternMultAdds}
            jokerMults={scorePreview?.jokerMults}
            penalty={scorePreview?.penalty}
            constraintFailures={scorePreview?.constraintFailures}
            finalScore={scorePreview?.finalScore}
            targetScore={phase.target_score}
          />

          {/* Capacity usage */}
          <div className="bg-[var(--color-surface)] rounded-lg p-3">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">Capacity</div>
            <div className="font-display text-sm">
              <span className={deployment.overBudget ? 'text-red-400' : 'text-white'}>
                {deployment.totalCost}
              </span>
              <span className="text-[var(--color-text-muted)]"> / {budget}</span>
            </div>
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
                {handState.discardsRemaining}
              </span>
            </div>
          </div>

          {/* Constraints info */}
          <div className="bg-[var(--color-surface)] rounded-lg p-3">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Constraints</div>
            <div className="space-y-1 text-[11px]">
              {constraints.min_perf !== undefined && (
                <div className="text-[var(--color-perf)]">P {'>='} {constraints.min_perf}</div>
              )}
              {constraints.min_rel !== undefined && (
                <div className="text-[var(--color-rel)]">R {'>='} {constraints.min_rel}</div>
              )}
              {constraints.max_cx !== undefined && (
                <div className="text-[var(--color-cx)]">CX &lt;= {constraints.max_cx}</div>
              )}
              {constraints.min_domains !== undefined && (
                <div className="text-purple-400">{constraints.min_domains}+ domains</div>
              )}
              {constraints.required_tags && constraints.required_tags.length > 0 && (
                <div className="text-amber-400">Need: {constraints.required_tags.join(', ')}</div>
              )}
              <div className="text-red-400/60 text-[10px]">
                Each fail: -{constraints.constraint_penalty}
              </div>
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
        </div>

        {/* Center content */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                onToggleDeploy={(id) => toggleDeploy(id)}
              />
            </div>

            {/* Discard zone */}
            <DiscardZone
              components={discardCards}
              onReturn={(id) => toggleDiscard(id)}
              discardsRemaining={handState.discardsRemaining}
            />

            {/* Action bar */}
            <div className="flex justify-center gap-4 py-4 border-t border-white/5">
              <button
                onClick={executeDiscard}
                disabled={selectedForDiscard.length === 0 || handState.discardsRemaining <= 0}
                className="px-6 py-3 rounded-xl bg-amber-600 text-white font-bold text-base hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Discard {selectedForDiscard.length > 0 ? `(${selectedForDiscard.length})` : ''}
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

          {/* Drag overlay */}
          <DragOverlay>
            {draggedComponent && (
              <div className="w-40 opacity-90 rotate-3">
                <ComponentCard component={draggedComponent} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <RunInfoPopup />
    </div>
  );
}
