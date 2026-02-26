import { useState } from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import { BASE_DEPLOY_SLOTS } from '../store/types';
import { t } from '../i18n';
import JokerCard from '../components/JokerCard';
import GoldDisplay from '../components/GoldDisplay';
import TarotCard from '../components/TarotCard';
import DeployZone from '../components/DeployZone';
import HandZone from '../components/HandZone';
import ComponentCard from '../components/ComponentCard';
import ScorePanel from '../components/ScorePanel';
import PatternBadge from '../components/PatternBadge';
import RunInfoPopup from '../components/RunInfoPopup';
import DeckPile from '../components/DeckPile';
import { validateDeployment } from '../../engine/deploy.js';
import type { Component } from '../../schemas/index.js';

export default function PlayScreen() {
  const {
    gameState,
    handState,
    selectedForDeploy,
    selectedInHand,
    patternPreview,
    scorePreview,
    toggleDeploy,
    toggleHandSelect,
    deploySelected,
    executeDiscard,
  } = useGameStore();

  const [draggedComponent, setDraggedComponent] = useState<Component | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (!gameState || !handState) return null;

  const maxDeploySlots = BASE_DEPLOY_SLOTS + (gameState.school.modifiers.deploy_slots_bonus ?? 0);
  const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
  const deployed = handState.hand.filter(c => selectedForDeploy.includes(c.id));
  const budget = phase.capacity_budget + gameState.school.modifiers.capacity_budget_offset;
  const deployment = validateDeployment(deployed, budget, gameState.school.modifiers);

  const handCards = handState.hand.filter(c => !selectedForDeploy.includes(c.id));

  const blindLabel = t(`blind.${phase.blind}`);

  function handleDragStart(event: DragStartEvent) {
    const { component } = event.active.data.current ?? {};
    setDraggedComponent(component ?? null);
  }

  function handleDragEnd() {
    setDraggedComponent(null);
  }

  // Constraint info for sidebar
  const constraints = phase.constraints;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left sidebar */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 p-4 space-y-4 bg-[var(--color-surface)]/40">
        <ScorePanel
          blindLabel={blindLabel}
          subtitle={phase.subtitle}
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
          <div className="text-xs text-[var(--color-text-muted)] mb-1">{t('common.capacity')}</div>
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
              {t('play.penaltyLabel')}: -{deployment.penalty}
            </div>
          )}
        </div>

        {/* Deploy slots */}
        <div className="bg-[var(--color-surface)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">{t('play.deploySlots')}</div>
          <div className="font-display text-sm">
            <span className={selectedForDeploy.length >= maxDeploySlots ? 'text-amber-400' : 'text-white'}>
              {selectedForDeploy.length}
            </span>
            <span className="text-[var(--color-text-muted)]"> / {maxDeploySlots}</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${selectedForDeploy.length >= maxDeploySlots ? 'bg-amber-400' : 'bg-[var(--color-functional)]'}`}
              animate={{ width: `${(selectedForDeploy.length / maxDeploySlots) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {selectedForDeploy.length >= maxDeploySlots && (
            <div className="text-[11px] text-amber-400 mt-1">
              {t('play.slotsFull')}
            </div>
          )}
        </div>

        {/* Gold */}
        <GoldDisplay amount={gameState.gold} />

        {/* Hand info */}
        <div className="bg-[var(--color-surface)] rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--color-text-muted)]">{t('play.hand')}</span>
            <span className="font-display text-sm">{handState.hand.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--color-text-muted)]">{t('play.discards')}</span>
            <span className={`font-display text-sm ${handState.discardsRemaining === 0 ? 'text-red-400' : 'text-[var(--color-chips)]'}`}>
              {handState.discardsRemaining}
            </span>
          </div>
        </div>

        {/* Constraints info */}
        <div className="bg-[var(--color-surface)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('play.constraints')}</div>
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
              <div className="text-purple-400">{constraints.min_domains}+ {t('play.domains')}</div>
            )}
            {constraints.required_tags && constraints.required_tags.length > 0 && (
              <div className="text-amber-400">{t('play.needTags')}: {constraints.required_tags.join(', ')}</div>
            )}
            <div className="text-red-400/60 text-[10px]">
              {t('play.eachFail')}: -{constraints.constraint_penalty}
            </div>
          </div>
        </div>

        {/* Patterns preview */}
        <div>
          <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('common.patterns')}</div>
          <div className="flex flex-wrap gap-1">
            {patternPreview.length > 0 ? (
              patternPreview.map(p => <PatternBadge key={p.name} name={p.name} desc={p.desc} />)
            ) : (
              <span className="text-xs text-[var(--color-text-muted)]">{t('play.noneDetected')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right area - Grid layout */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 grid grid-rows-[auto_1fr_auto] grid-cols-[1fr_auto] min-h-screen">
          {/* Row 1: Jokers + Tarots in one row */}
          <div className="col-span-2 flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)]/80 border-b border-white/5">
            {/* Joker slots */}
            <div className="flex gap-2">
              {Array.from({ length: gameState.jokerSlotMax }, (_, i) => {
                const joker = gameState.jokerSlots[i];
                return joker ? (
                  <div key={joker.id}>
                    <JokerCard joker={joker} />
                  </div>
                ) : (
                  <div key={`empty-joker-${i}`} className="w-[160px] h-[240px] rounded-xl border border-dashed border-white/10 flex items-center justify-center">
                    <span className="text-[10px] text-white/20">{t('common.jokers')}</span>
                  </div>
                );
              })}
            </div>

            {/* Spacer pushes tarots to the right */}
            <div className="flex-1" />

            {/* Tarot slots */}
            <div className="flex gap-2">
              {Array.from({ length: gameState.tarotHandMax }, (_, i) => {
                const tarot = gameState.tarotHand[i];
                return tarot ? (
                  <div key={`${tarot.id}-${i}`}>
                    <TarotCard tarot={tarot} />
                  </div>
                ) : (
                  <div key={`empty-tarot-${i}`} className="w-[160px] h-[240px] rounded-xl border border-dashed border-white/10 flex items-center justify-center">
                    <span className="text-[10px] text-white/20">{t('common.tarots')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 2, Col span 2: Deploy zone */}
          <div className="col-span-2 p-4 border-b border-white/5">
            <DeployZone
              components={deployed}
              onUndeploy={(id) => toggleDeploy(id)}
            />
          </div>

          {/* Row 3, Col 1: Hand + Actions */}
          <div className="flex flex-col">
            {/* Hand zone */}
            <div className="flex-1">
              <HandZone
                cards={handCards}
                selectedIds={selectedInHand}
                onToggleSelect={(id) => toggleHandSelect(id)}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4 py-4 border-t border-white/5">
              <button
                onClick={executeDiscard}
                disabled={selectedInHand.length === 0 || selectedInHand.length > 5 || handState.discardsRemaining <= 0}
                className="px-6 py-3 rounded-xl bg-amber-600 text-white font-bold text-base hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('play.confirmDiscard')} {selectedInHand.length > 0 ? `(${selectedInHand.length}/5)` : ''} [{handState.discardsRemaining}]
              </button>
              <button
                onClick={deploySelected}
                disabled={selectedInHand.length === 0 || selectedInHand.length > maxDeploySlots}
                className="px-8 py-3 rounded-xl bg-[var(--color-chips)] text-black font-bold text-lg hover:brightness-110 transition shadow-[var(--glow-chips)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('play.deploy')} {selectedInHand.length > 0 ? `(${selectedInHand.length}/${maxDeploySlots})` : ''}
              </button>
            </div>
          </div>

          {/* Row 3, Col 2: DeckPile */}
          <div className="flex items-center justify-center border-l border-t border-white/5 px-4">
            <DeckPile count={handState.drawPile.length} total={handState.hand.length + handState.drawPile.length + handState.discardPile.length} />
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

      <RunInfoPopup />
    </div>
  );
}
