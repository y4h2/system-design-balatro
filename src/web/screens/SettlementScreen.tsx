import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import PatternBadge from '../components/PatternBadge';

export default function SettlementScreen() {
  const { settlement, currentEvents, continueAfterSettlement } = useGameStore();

  if (!settlement) return null;

  const {
    panel, chips, mult, constraintPenalty, bossPenalty,
    finalScore, targetScore, passed,
    triggeredPatterns, triggeredSuperPatterns, superPatternRewards,
    eventResults, activeJokers,
    capacityUsed, capacityBudget,
    deployedComponents,
  } = settlement;

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
        {passed ? 'PASSED' : 'FAILED'}
      </motion.div>

      {/* Score display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center mb-8"
      >
        <div className="font-display text-4xl font-bold neon-chips mb-2">{finalScore}</div>
        <div className="text-[var(--color-text-muted)]">
          Target: <span className="font-display">{targetScore}</span>
        </div>
      </motion.div>

      {/* Breakdown grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl w-full mb-8"
      >
        {/* Panel */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">Panel</div>
          <div className="space-y-1 font-display text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-perf)]">Perf</span>
              <span>{panel.perf.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-rel)]">Rel</span>
              <span>{panel.rel.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-cx)]">Cx</span>
              <span>{panel.cx.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Chips x Mult */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">Score Formula</div>
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
          <div className="text-xs text-[var(--color-text-muted)] mb-2">Penalties</div>
          <div className="space-y-1 font-display text-sm">
            {constraintPenalty > 0 && (
              <div className="flex justify-between">
                <span className="text-red-400">Constraint</span>
                <span className="text-red-400">-{constraintPenalty}</span>
              </div>
            )}
            {bossPenalty > 0 && (
              <div className="flex justify-between">
                <span className="text-red-400">Boss</span>
                <span className="text-red-400">-{bossPenalty}</span>
              </div>
            )}
            {constraintPenalty === 0 && bossPenalty === 0 && (
              <span className="text-[var(--color-functional)]">None</span>
            )}
          </div>
        </div>

        {/* Capacity */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">Capacity</div>
          <div className="font-display text-sm">
            <span className={capacityUsed > capacityBudget ? 'text-red-400' : ''}>
              {capacityUsed}
            </span>
            <span className="text-[var(--color-text-muted)]"> / {capacityBudget}</span>
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            {deployedComponents.length} components deployed
          </div>
        </div>

        {/* Jokers */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">Active Jokers</div>
          {activeJokers.length > 0 ? (
            <div className="space-y-1">
              {activeJokers.map((j, i) => (
                <div key={j.id} className="flex justify-between text-xs">
                  <span className="truncate">{j.name}</span>
                  <span className="neon-mult font-display">x{settlement.jokerMultipliers[i]}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">None</span>
          )}
        </div>

        {/* Events */}
        <div className="card-base">
          <div className="text-xs text-[var(--color-text-muted)] mb-2">Events</div>
          {eventResults.length > 0 ? (
            <div className="space-y-1">
              {eventResults.map((er, i) => (
                <div key={i} className="text-xs">
                  <span className={er.hit ? 'text-red-400' : 'text-[var(--color-functional)]'}>
                    {er.hit ? '!' : '✓'} {er.event.name}
                  </span>
                  {er.hit && (
                    <span className="text-red-400/70 ml-1">
                      (P{er.penalty.perf} R{er.penalty.rel} X{er.penalty.cx})
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">None</span>
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
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Triggered Patterns</div>
            <div className="flex flex-wrap gap-2">
              {triggeredPatterns.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0 + i * 0.1 }}
                >
                  <PatternBadge name={p.name} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {triggeredSuperPatterns.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-[var(--color-text-muted)] mb-2">Super Patterns</div>
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
        Continue
      </motion.button>
    </div>
  );
}
