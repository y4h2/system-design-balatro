import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import GoldDisplay from '../components/GoldDisplay';
import { t } from '../i18n';

const blindColors: Record<string, string> = {
  small: 'border-blue-400/50',
  big: 'border-orange-400/50',
  boss: 'border-red-500/60',
};

const blindBg: Record<string, string> = {
  small: 'from-blue-900/20 to-transparent',
  big: 'from-orange-900/20 to-transparent',
  boss: 'from-red-900/20 to-transparent',
};

export default function BlindSelectScreen() {
  const { gameState, startPlay, skipBlind } = useGameStore();

  if (!gameState) return null;
  const { phases } = gameState.scenario;
  const currentIdx = gameState.currentPhaseIndex;
  const currentPhase = phases[currentIdx];

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-medium mb-2">{t('blindSelect.title')}</h2>
        <GoldDisplay amount={gameState.gold} />
      </div>

      {/* Phase cards */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-10">
        {phases.map((phase, i) => {
          const isCurrent = i === currentIdx;
          const isPast = i < currentIdx;
          const isFuture = i > currentIdx;
          const result = gameState.phaseResults[i];
          const constraints = phase.constraints;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: isPast ? 0.4 : 1,
                y: 0,
                scale: isCurrent ? 1.05 : 1,
              }}
              transition={{ delay: i * 0.1 }}
              className={`w-full sm:w-56 rounded-xl border-2 p-5 bg-gradient-to-b ${blindBg[phase.blind]} ${
                isCurrent
                  ? `${blindColors[phase.blind]} shadow-lg`
                  : 'border-white/10'
              } ${isFuture ? 'opacity-60' : ''}`}
            >
              {/* Blind label */}
              <div className="text-center mb-4">
                <div className={`text-xs uppercase tracking-widest mb-1 ${
                  phase.blind === 'boss' ? 'text-red-400' : 'text-[var(--color-text-muted)]'
                }`}>
                  {t(`blind.${phase.blind}`)}
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">{phase.subtitle}</div>
              </div>

              {/* Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{t('common.target')}</span>
                  <span className="neon-chips font-display font-bold">{phase.target_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{t('common.capacity')}</span>
                  <span className="font-display">{phase.capacity_budget + gameState.school.modifiers.capacity_budget_offset}</span>
                </div>
              </div>

              {/* Constraints preview */}
              <div className="mt-3 space-y-1 text-[11px]">
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
              </div>

              {/* Boss rule warning */}
              {phase.boss_rule && (
                <div className="mt-3 px-2 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] text-center">
                  {t('blindSelect.bossRule')}: {phase.boss_rule}
                </div>
              )}

              {/* Past result */}
              {result && (
                <div className={`mt-3 text-center text-sm font-display font-bold ${
                  result.passed ? 'text-[var(--color-functional)]' : result.skipped ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {result.skipped ? t('result.skipped') : result.passed ? t('result.passed') : t('result.failed')}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={startPlay}
          className="px-8 py-3 rounded-xl bg-[var(--color-chips)] text-black font-bold text-lg hover:brightness-110 transition shadow-[var(--glow-chips)]"
        >
          {t('blindSelect.play')}
        </motion.button>

        {currentPhase.skippable && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={skipBlind}
            className="px-6 py-3 rounded-xl border border-white/20 text-[var(--color-text-muted)] hover:border-white/40 hover:text-white transition"
          >
            {t('blindSelect.skip')}
          </motion.button>
        )}
      </div>
    </div>
  );
}
