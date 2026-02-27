import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import PatternBadge from '../components/PatternBadge';

export default function HandResultScreen() {
  const { lastHandResult, handResults, handState, continueAfterHandResult } = useGameStore();

  if (!lastHandResult || !handState) return null;

  const cumulativeScore = handResults.reduce((sum, h) => sum + h.handScore, 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[var(--color-surface)] rounded-2xl border border-white/10 p-8 max-w-lg w-full space-y-6"
      >
        <div className="text-center">
          <h2 className="font-display text-2xl text-white mb-1">
            Hand {lastHandResult.handIndex + 1}
          </h2>
          {lastHandResult.winningRoute && (
            <div className="text-sm text-purple-400">Route {lastHandResult.winningRoute}</div>
          )}
        </div>

        {/* Score breakdown */}
        <div className="bg-black/20 rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Chips</span>
            <span className="text-[var(--color-chips)] font-display">{lastHandResult.chips}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Mult</span>
            <span className="text-[var(--color-mult)] font-display">x{lastHandResult.mult.toFixed(1)}</span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between">
            <span className="text-white font-bold">Hand Score</span>
            <span className="text-[var(--color-chips)] font-display text-xl">{lastHandResult.handScore}</span>
          </div>
        </div>

        {/* Triggered patterns */}
        {lastHandResult.triggeredPatterns.length > 0 && (
          <div>
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Triggered Patterns</div>
            <div className="flex flex-wrap gap-1">
              {lastHandResult.triggeredPatterns.map(p => (
                <PatternBadge key={p.id} name={p.name} desc={p.desc} />
              ))}
            </div>
          </div>
        )}

        {/* Discarded patterns (route conflict) */}
        {lastHandResult.discardedPatterns.length > 0 && (
          <div>
            <div className="text-xs text-red-400/60 mb-2">Discarded (Route Conflict)</div>
            <div className="flex flex-wrap gap-1 opacity-50">
              {lastHandResult.discardedPatterns.map(p => (
                <PatternBadge key={p.id} name={p.name} desc={p.desc} />
              ))}
            </div>
          </div>
        )}

        {/* Cumulative */}
        <div className="bg-black/20 rounded-xl p-3 flex justify-between items-center">
          <span className="text-sm text-[var(--color-text-muted)]">Cumulative Score</span>
          <span className="text-[var(--color-chips)] font-display text-lg">{cumulativeScore}</span>
        </div>

        {/* Remaining hands */}
        <div className="text-center text-sm text-[var(--color-text-muted)]">
          {handState.handsRemaining} hand{handState.handsRemaining !== 1 ? 's' : ''} remaining
        </div>

        <button
          onClick={continueAfterHandResult}
          className="w-full py-3 rounded-xl bg-[var(--color-chips)] text-black font-bold text-lg hover:brightness-110 transition"
        >
          Continue
        </button>
      </motion.div>
    </div>
  );
}
