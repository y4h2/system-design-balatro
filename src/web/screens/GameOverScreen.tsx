import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';

export default function GameOverScreen() {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  const results = gameState.phaseResults;
  const passCount = results.filter(r => r.passed).length;
  const victory = passCount >= 2;

  const handlePlayAgain = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-4">
      {/* Victory/Defeat */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150 }}
        className={`text-6xl font-display font-bold mb-4 ${
          victory ? 'neon-chips' : 'text-red-400'
        }`}
        style={{
          textShadow: victory
            ? '0 0 40px rgba(245,166,35,0.6)'
            : '0 0 40px rgba(239,68,68,0.5)',
        }}
      >
        {victory ? t('result.victory') : t('result.defeat')}
      </motion.div>

      {/* Run info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-8 text-[var(--color-text-muted)]"
      >
        <div>{gameState.school.name} × {gameState.scenario.name}</div>
        <div className="text-sm mt-1">{passCount}/3 {t('gameOver.phasesPassed')}</div>
      </motion.div>

      {/* Phase results */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-10"
      >
        {results.map((result, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15 }}
            className={`w-full sm:w-48 card-base text-center ${
              result.passed
                ? 'border-[var(--color-functional)]'
                : result.skipped
                  ? 'border-yellow-400/40'
                  : 'border-red-500/40'
            }`}
          >
            <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
              {t(`blind.${result.blind}`)}
            </div>

            <div className={`text-2xl font-display font-bold mb-1 ${
              result.passed ? 'text-[var(--color-functional)]' : result.skipped ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {result.skipped ? t('result.skip') : result.passed ? t('result.pass') : t('result.fail')}
            </div>

            {!result.skipped && (
              <div className="font-display text-sm">
                <span className={result.passed ? 'neon-chips' : 'text-[var(--color-text-muted)]'}>
                  {result.score}
                </span>
                <span className="text-[var(--color-text-muted)]"> / {result.targetScore}</span>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Play Again */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={handlePlayAgain}
        className="px-10 py-4 rounded-xl bg-[var(--color-chips)] text-black font-bold text-xl hover:brightness-110 transition shadow-[var(--glow-chips)]"
      >
        {t('gameOver.playAgain')}
      </motion.button>
    </div>
  );
}
