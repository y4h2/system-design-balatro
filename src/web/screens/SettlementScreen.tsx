import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import PatternBadge from '../components/PatternBadge';
import { t } from '../i18n';

function useAnimatedCounter(target: number, duration = 1200, delay = 500) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const timeout = setTimeout(() => {
      let start: number | null = null;
      let raf: number;

      const step = (ts: number) => {
        if (!start) start = ts;
        const elapsed = ts - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - (1 - t) * (1 - t); // ease-out-quad
        setDisplay(Math.round(target * eased));
        if (t < 1) {
          raf = requestAnimationFrame(step);
        }
      };

      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, delay);

    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return display;
}

export default function SettlementScreen() {
  const { settlement, continueAfterSettlement } = useGameStore();

  if (!settlement) return null;

  const {
    panel, chips, mult, constraintPenalty, constraintResult, bossPenalty,
    finalScore, targetScore, passed,
    triggeredPatterns, triggeredSuperPatterns, superPatternRewards,
    activeJokers, baseChips, patternChips, jokerChips, jokerGold,
    capacityUsed, capacityBudget,
    deployedComponents,
  } = settlement;

  const animatedScore = useAnimatedCounter(finalScore, 1200, 500);

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4">
      {/* Pass/Fail banner */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
        className={`text-5xl font-display font-bold mb-8 ${
          passed ? 'text-[var(--color-functional)]' : 'text-red-400'
        }`}
        style={{ textShadow: passed ? '0 0 30px rgba(46,204,113,0.5)' : '0 0 30px rgba(239,68,68,0.5)' }}
      >
        {passed ? t('result.passed') : t('result.failed')}
      </motion.div>

      {/* Score display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center mb-8"
      >
        <div className="font-display text-4xl font-bold neon-chips mb-2">{animatedScore}</div>
        <div className="text-[var(--color-text-muted)]">
          {t('common.target')}: <span className="font-display">{targetScore}</span>
        </div>
      </motion.div>

      {/* Breakdown grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl w-full mb-8"
      >
        {/* Panel (constraints check) */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('settlement.panel')}</div>
          <div className="space-y-1 font-display text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-perf)]">{t('settlement.perf')}</span>
              <span>{panel.perf.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-rel)]">{t('settlement.rel')}</span>
              <span>{panel.rel.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-cx)]">{t('settlement.cx')}</span>
              <span>{panel.cx.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Chips breakdown */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('settlement.chipsBreakdown')}</div>
          <div className="space-y-1 font-display text-sm">
            <div className="flex justify-between">
              <span className="text-white">{t('common.base')}</span>
              <span className="neon-chips">{baseChips}</span>
            </div>
            {patternChips > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--color-functional)]">{t('common.patterns')}</span>
                <span className="text-[var(--color-functional)]">+{patternChips}</span>
              </div>
            )}
            {jokerChips > 0 && (
              <div className="flex justify-between">
                <span className="neon-gold">{t('common.jokers')}</span>
                <span className="neon-gold">+{jokerChips}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
              <span>{t('common.total')}</span>
              <span className="neon-chips font-bold">{chips}</span>
            </div>
          </div>
        </div>

        {/* Score Formula */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('settlement.scoreFormula')}</div>
          <div className="flex items-center gap-2 font-display">
            <span className="neon-chips text-xl">{chips}</span>
            <span className="text-[var(--color-text-muted)]">x</span>
            <span className="neon-mult text-xl">{mult.toFixed(1)}</span>
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-2">
            = {Math.round(chips * mult)}
          </div>
        </div>

        {/* Penalties */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('settlement.penalties')}</div>
          <div className="space-y-1 font-display text-sm">
            {constraintPenalty > 0 && (
              <div className="flex justify-between">
                <span className="text-red-400">{t('settlement.constraint')}</span>
                <span className="text-red-400">-{constraintPenalty}</span>
              </div>
            )}
            {bossPenalty > 0 && (
              <div className="flex justify-between">
                <span className="text-red-400">{t('settlement.boss')}</span>
                <span className="text-red-400">-{bossPenalty}</span>
              </div>
            )}
            {constraintPenalty === 0 && bossPenalty === 0 && (
              <span className="text-[var(--color-functional)]">{t('common.none')}</span>
            )}
          </div>
          {constraintResult.failures.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {constraintResult.failures.map((f, i) => (
                <div key={i} className="text-[10px] text-red-400">! {f}</div>
              ))}
            </div>
          )}
        </div>

        {/* Capacity */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('settlement.capacity')}</div>
          <div className="font-display text-sm">
            <span className={capacityUsed > capacityBudget ? 'text-red-400' : ''}>
              {capacityUsed}
            </span>
            <span className="text-[var(--color-text-muted)]"> / {capacityBudget}</span>
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            {deployedComponents.length} {t('settlement.componentsDeployed')}
          </div>
        </div>

        {/* Jokers */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('settlement.activeJokers')}</div>
          {activeJokers.length > 0 ? (
            <div className="space-y-1">
              {activeJokers.map(j => (
                <div key={j.id} className="flex justify-between text-xs">
                  <span className="truncate">{j.name}</span>
                  <span className="neon-gold font-display text-[10px]">{j.effect.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">{t('common.none')}</span>
          )}
          {jokerGold > 0 && (
            <div className="mt-2 text-xs neon-gold font-display">
              +{jokerGold} {t('settlement.goldEarned')}
            </div>
          )}
        </div>
      </motion.div>

      {/* Patterns & Super Patterns */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="max-w-3xl w-full mb-8"
      >
        {triggeredPatterns.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('settlement.triggeredPatterns')}</div>
            <div className="flex flex-wrap gap-2">
              {triggeredPatterns.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0 + i * 0.1 }}
                >
                  <PatternBadge name={`${p.name} (+${p.effects.chips_add} ${t('common.chips')}, +${p.effects.mult_add} ${t('common.mult')})`} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {triggeredSuperPatterns.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('settlement.superPatterns')}</div>
            <div className="space-y-1">
              {superPatternRewards.map((sr, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                  className="text-sm text-[var(--color-gold)] font-display"
                  style={{ textShadow: '0 0 8px rgba(255,215,0,0.3)' }}
                >
                  {sr.description}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Continue button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        onClick={continueAfterSettlement}
        className="px-8 py-3 rounded-xl bg-[var(--color-chips)] text-black font-bold text-lg hover:brightness-110 transition shadow-[var(--glow-chips)]"
      >
        {t('settlement.continue')}
      </motion.button>
    </div>
  );
}
