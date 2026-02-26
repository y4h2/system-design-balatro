import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';
import type { PlatformId } from '../../schemas/index';

const schoolTheme: Record<string, { accent: string; glow: string; icon: string }> = {
  school_sre:         { accent: '#3498db', glow: 'rgba(52,152,219,0.4)',  icon: '🛡️' },
  school_startup:     { accent: '#e67e22', glow: 'rgba(230,126,34,0.4)',  icon: '🚀' },
  school_minimalist:  { accent: '#1abc9c', glow: 'rgba(26,188,156,0.4)',  icon: '◯' },
  school_compliance:  { accent: '#9b59b6', glow: 'rgba(155,89,182,0.4)',  icon: '🔒' },
  school_performance: { accent: '#e74c3c', glow: 'rgba(231,76,60,0.4)',   icon: '⚡' },
  school_vibe_coding: { accent: '#f39c12', glow: 'rgba(243,156,18,0.4)',  icon: '✨' },
};

export default function TitleScreen() {
  const { gameData, startGame, setScreen } = useGameStore();
  const [schoolIndex, setSchoolIndex] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(null);

  const schools = gameData.schools;
  const platforms = gameData.platforms;
  const currentSchool = schools[schoolIndex];
  const theme = schoolTheme[currentSchool.id] ?? { accent: '#6b7280', glow: 'rgba(107,114,128,0.4)', icon: '?' };

  const prevSchool = () => {
    setSchoolIndex((schoolIndex - 1 + schools.length) % schools.length);
    setSelectedScenario(null);
  };
  const nextSchool = () => {
    setSchoolIndex((schoolIndex + 1) % schools.length);
    setSelectedScenario(null);
  };

  const m = currentSchool.modifiers;

  const canStart = selectedScenario && selectedPlatform;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-display text-4xl sm:text-5xl font-bold mb-1 neon-chips">
          {t('title.gameName')}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">{t('title.subtitle')}</p>
      </motion.div>

      {/* Carousel: arrow + card + info + arrow */}
      <div className="flex items-center gap-4 sm:gap-6 mb-6 w-full max-w-2xl">
        {/* Left arrow */}
        <button
          onClick={prevSchool}
          className="flex-shrink-0 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-[var(--color-text-muted)] hover:border-white/50 hover:text-white transition text-xl"
          aria-label="Previous school"
        >
          ‹
        </button>

        {/* School card + info */}
        <div className="flex-1 flex flex-col sm:flex-row gap-4 items-stretch">
          {/* Visual card preview */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSchool.id}
              initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateY: 15 }}
              transition={{ duration: 0.25 }}
              className="flex-shrink-0 w-full sm:w-44 h-56 rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden"
              style={{
                borderColor: theme.accent,
                background: `linear-gradient(160deg, ${theme.accent}18 0%, var(--color-surface) 40%, var(--color-surface) 70%, ${theme.accent}10 100%)`,
                boxShadow: `0 0 30px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              {/* Decorative corner lines */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 rounded-tl-sm" style={{ borderColor: `${theme.accent}50` }} />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 rounded-br-sm" style={{ borderColor: `${theme.accent}50` }} />

              {/* Icon */}
              <span className="text-5xl mb-3 select-none" style={{ filter: `drop-shadow(0 0 8px ${theme.glow})` }}>
                {theme.icon}
              </span>

              {/* School name on card */}
              <span className="font-display text-sm font-bold tracking-wider text-center px-3" style={{ color: theme.accent }}>
                {currentSchool.name}
              </span>

              {/* Index dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {schools.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{
                      background: i === schoolIndex ? theme.accent : 'rgba(255,255,255,0.2)',
                      boxShadow: i === schoolIndex ? `0 0 4px ${theme.accent}` : 'none',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Info panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSchool.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 rounded-xl bg-[var(--color-surface)] border border-white/10 p-4 flex flex-col"
            >
              <h3 className="font-display font-bold text-lg mb-1" style={{ color: theme.accent }}>
                {currentSchool.name}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4 italic">
                "{currentSchool.desc}"
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{t('title.deploySlots')}</span>
                  <span className="font-display font-medium">{5 + (m.deploy_slots_bonus ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{t('title.handSize')}</span>
                  <span className="font-display font-medium">{8 + (m.hand_size_bonus ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{t('title.discards')}</span>
                  <span className="font-display font-medium">{3 + (m.discard_bonus ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{t('title.initialPool')}</span>
                  <span className="font-display font-medium">{m.draft_rounds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{t('common.jokers')}</span>
                  <span className="font-display font-medium">{m.joker_slots}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{t('title.budget')}</span>
                  <span className="font-display font-medium">
                    {m.capacity_budget_offset >= 0 ? '+' : ''}{m.capacity_budget_offset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">{t('title.repair')}</span>
                  <span className="font-display font-medium">{m.repair_count}</span>
                </div>
              </div>

              {/* Special modifiers hint */}
              {m.capacity_discount_tags && m.capacity_discount_tags.length > 0 && (
                <div className="mt-3 text-[11px] text-[var(--color-text-muted)] border-t border-white/5 pt-2">
                  {t('title.discountTags')}: {m.capacity_discount_tags.slice(0, 3).join(', ')}
                  {m.capacity_discount_tags.length > 3 && ` +${m.capacity_discount_tags.length - 3}`}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right arrow */}
        <button
          onClick={nextSchool}
          className="flex-shrink-0 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-[var(--color-text-muted)] hover:border-white/50 hover:text-white transition text-xl"
          aria-label="Next school"
        >
          ›
        </button>
      </div>

      {/* Platform selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-2xl mb-6"
      >
        <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3 text-center">
          {t('title.platform')}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {platforms.map((plat) => {
            const isSelected = selectedPlatform === plat.id;
            return (
              <button
                key={plat.id}
                onClick={() => setSelectedPlatform(plat.id)}
                className={`px-3 py-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'shadow-lg'
                    : 'border-white/10 bg-[var(--color-surface)] hover:border-white/25'
                }`}
                style={isSelected ? {
                  borderColor: plat.accent,
                  background: `linear-gradient(135deg, ${plat.accent}15 0%, var(--color-surface) 100%)`,
                  boxShadow: `0 0 16px ${plat.glow}`,
                } : undefined}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{plat.icon}</span>
                  <span className="font-display font-bold text-sm" style={isSelected ? { color: plat.accent } : undefined}>
                    {plat.name}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)] leading-tight mb-1.5">
                  {plat.positioning}
                </div>
                <div className="text-[10px] leading-tight" style={{ color: isSelected ? plat.accent : 'var(--color-text-muted)' }}>
                  {plat.passive.desc}
                </div>
                <div className="text-[10px] leading-tight mt-0.5" style={{ color: isSelected ? plat.accent : 'var(--color-text-muted)' }}>
                  {plat.mechanic.name}: {plat.mechanic.desc.length > 40 ? plat.mechanic.desc.slice(0, 40) + '...' : plat.mechanic.desc}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Scenario selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-2xl mb-8"
      >
        <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3 text-center">
          {t('title.scenario')}
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          {gameData.scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSelectedScenario(sc.id)}
              className={`px-4 py-2.5 rounded-xl border-2 transition-all text-left min-w-[140px] ${
                selectedScenario === sc.id
                  ? 'border-[var(--color-chips)] bg-[var(--color-chips)]/8 shadow-[var(--glow-chips)]'
                  : 'border-white/10 bg-[var(--color-surface)] hover:border-white/25'
              }`}
            >
              <div className="font-medium text-sm">{sc.name}</div>
              <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-1">{sc.desc}</div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Buttons row */}
      <div className="flex items-center gap-4">
      <button
        onClick={() => setScreen('collection')}
        className="px-8 py-4 rounded-2xl font-bold text-lg border-2 border-white/20 text-[var(--color-text-muted)] hover:border-white/40 hover:text-white transition"
      >
        {t('collection.title')}
      </button>
      <button
        onClick={() => canStart && startGame(currentSchool.id, selectedScenario!, selectedPlatform!)}
        disabled={!canStart}
        className="px-14 py-4 rounded-2xl font-bold text-lg transition-all disabled:cursor-not-allowed"
        style={{
          background: canStart
            ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`
            : 'rgba(255,255,255,0.08)',
          color: canStart ? '#000' : 'rgba(255,255,255,0.3)',
          boxShadow: canStart
            ? `0 0 24px ${theme.glow}, 0 4px 12px rgba(0,0,0,0.3)`
            : 'none',
        }}
      >
        {t('title.startGame')}
      </button>
      </div>
    </div>
  );
}
