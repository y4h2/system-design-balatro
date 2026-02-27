import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';
import JokerCard from '../components/JokerCard';
import GoldDisplay from '../components/GoldDisplay';
import TarotCard from '../components/TarotCard';
import HandZone from '../components/HandZone';
import ComponentCard from '../components/ComponentCard';
import ScorePanel from '../components/ScorePanel';
import PatternBadge from '../components/PatternBadge';
import PlayAnimation from '../components/PlayAnimation';
import RunInfoPopup from '../components/RunInfoPopup';
import DeckPile from '../components/DeckPile';
import RouteTree from '../components/RouteTree';
import type { Component } from '../../schemas/index.js';

export default function PlayScreen() {
  const {
    gameData,
    gameState,
    handState,
    selectedInHand,
    patternPreview,
    scorePreview,
    handResults,
    toggleHandSelect,
    playHand,
    executeDiscard,
  } = useGameStore();

  const [draggedComponent, setDraggedComponent] = useState<Component | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ── Animation state ──
  type AnimPhase = 'idle' | 'animating' | 'enter';
  const [animPhase, setAnimPhase] = useState<AnimPhase>('idle');
  const [animData, setAnimData] = useState<{
    playedCards: Component[];
    playedIds: Set<string>;
    patterns: { name: string; desc: string; platform?: string }[];
    keptCardIds: Set<string>;
  } | null>(null);
  const [enteringIds, setEnteringIds] = useState<Set<string> | undefined>();
  const enterTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handlePlayHand = useCallback(() => {
    if (!handState || selectedInHand.length === 0) return;

    // Capture current state before animation
    const played = handState.hand.filter(c => selectedInHand.includes(c.id));
    const keptIds = new Set(handState.hand.filter(c => !selectedInHand.includes(c.id)).map(c => c.id));
    const patterns = [...patternPreview];

    setAnimData({
      playedCards: played,
      playedIds: new Set(played.map(c => c.id)),
      patterns,
      keptCardIds: keptIds,
    });
    setAnimPhase('animating');
  }, [handState, selectedInHand, patternPreview]);

  const handleAnimComplete = useCallback(() => {
    if (!animData) return;
    const keptCardIds = animData.keptCardIds;

    // Execute the actual game logic
    playHand();

    // Check resulting screen
    const store = useGameStore.getState();
    if (store.currentScreen === 'settlement') {
      // Last hand → go to settlement, no enter phase
      setAnimPhase('idle');
      setAnimData(null);
      setEnteringIds(undefined);
      return;
    }

    // Compute entering cards (new cards that weren't in the kept set)
    const newHand = store.handState?.hand ?? [];
    const newIds = new Set(newHand.filter(c => !keptCardIds.has(c.id)).map(c => c.id));

    setAnimData(null);
    setEnteringIds(newIds);
    setAnimPhase('enter');

    // Clear enter phase after animation
    enterTimerRef.current = setTimeout(() => {
      setAnimPhase('idle');
      setEnteringIds(undefined);
    }, 500);
  }, [animData, playHand]);

  if (!gameState || !handState) return null;

  const phase = gameState.scenario.phases[gameState.currentPhaseIndex];
  const blindLabel = t(`blind.${phase.blind}`);

  function handleDragStart(event: DragStartEvent) {
    const { component } = event.active.data.current ?? {};
    setDraggedComponent(component ?? null);
  }

  function handleDragEnd() {
    setDraggedComponent(null);
  }

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

        {/* Hands & Discards indicator */}
        <div className="bg-[var(--color-surface)] rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--color-text-muted)]">Hands</span>
            <span className={`font-display text-sm ${handState.handsRemaining === 0 ? 'text-red-400' : 'text-[var(--color-chips)]'}`}>
              {handState.handsRemaining}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--color-text-muted)]">{t('play.discards')}</span>
            <span className={`font-display text-sm ${handState.discardsRemaining === 0 ? 'text-red-400' : 'text-[var(--color-chips)]'}`}>
              {handState.discardsRemaining}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--color-text-muted)]">{t('play.hand')}</span>
            <span className="font-display text-sm">{handState.hand.length}</span>
          </div>
        </div>

        {/* Gold */}
        <GoldDisplay amount={gameState.gold} />

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
              patternPreview.map(p => <PatternBadge key={p.name} name={p.name} desc={p.desc} platform={p.platform} />)
            ) : (
              <span className="text-xs text-[var(--color-text-muted)]">{t('play.noneDetected')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right area */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 grid grid-rows-[auto_1fr] grid-cols-[1fr_auto] min-h-screen">
          {/* Row 1: Jokers + Tarots */}
          <div className="col-span-2 flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)]/80 border-b border-white/5">
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
            <div className="flex-1" />
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

          {/* Row 2: Hand zone */}
          <div className="col-span-1 flex flex-col">
            <div className="flex-1 flex items-end justify-center pb-4 relative">
              {/* Animation overlay */}
              {animPhase === 'animating' && animData && (
                <PlayAnimation
                  playedCards={animData.playedCards}
                  patterns={animData.patterns}
                  onComplete={handleAnimComplete}
                />
              )}

              <HandZone
                cards={handState.hand}
                selectedIds={animPhase !== 'idle' ? [] : selectedInHand}
                onToggleSelect={(id) => toggleHandSelect(id)}
                hideIds={animPhase === 'animating' ? animData?.playedIds : undefined}
                enteringIds={animPhase === 'enter' ? enteringIds : undefined}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4 py-4 border-t border-white/5">
              <button
                onClick={executeDiscard}
                disabled={animPhase !== 'idle' || selectedInHand.length === 0 || selectedInHand.length > 5 || handState.discardsRemaining <= 0}
                className="px-6 py-3 rounded-xl bg-amber-600 text-white font-bold text-base hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('play.confirmDiscard')} {selectedInHand.length > 0 ? `(${selectedInHand.length}/5)` : ''} [{handState.discardsRemaining}]
              </button>
              <button
                onClick={handlePlayHand}
                disabled={animPhase !== 'idle' || selectedInHand.length === 0 || selectedInHand.length > 5 || handState.handsRemaining <= 0}
                className="px-8 py-3 rounded-xl bg-[var(--color-chips)] text-black font-bold text-lg hover:brightness-110 transition shadow-[var(--glow-chips)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Play Hand {selectedInHand.length > 0 ? `(${selectedInHand.length}/5)` : ''} [{handState.handsRemaining}]
              </button>
            </div>
          </div>

          {/* Row 2, Col 2: Route Tree + DeckPile */}
          <div className="flex flex-col border-l border-white/5 px-3 w-56">
            <div className="flex-1 overflow-y-auto min-h-0">
              <RouteTree handResults={handResults} patterns={gameData.patterns} />
            </div>
            <div className="border-t border-white/5 py-3 flex justify-center">
              <DeckPile count={handState.drawPile.length} total={handState.hand.length + handState.drawPile.length + handState.discardPile.length} />
            </div>
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
