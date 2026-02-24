import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import ComponentCard from '../components/ComponentCard';

export default function DraftScreen() {
  const { gameState, draftRound, draftChoices, pickDraftComponent } = useGameStore();

  if (!gameState) return null;
  const totalRounds = gameState.school.modifiers.draft_rounds;

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-medium mb-2">Draft Phase</h2>
        <div className="font-display text-lg">
          <span className="neon-chips">Round {draftRound}</span>
          <span className="text-[var(--color-text-muted)]"> / {totalRounds}</span>
        </div>
        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-white/10 rounded-full mt-3 mx-auto overflow-hidden">
          <motion.div
            className="h-full bg-[var(--color-chips)] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(draftRound / totalRounds) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Draft choices */}
      <div className="flex-1 flex items-center justify-center mb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={draftRound}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex gap-6"
          >
            {draftChoices.map((component, i) => (
              <motion.div
                key={component.id}
                initial={{ opacity: 0, y: 20, rotateZ: -2 }}
                animate={{ opacity: 1, y: 0, rotateZ: 0 }}
                transition={{ delay: i * 0.12 }}
                className="w-52"
              >
                <ComponentCard
                  component={component}
                  onClick={() => pickDraftComponent(component)}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pool display */}
      <div className="w-full max-w-4xl">
        <h3 className="text-sm text-[var(--color-text-muted)] mb-3">
          Component Pool ({gameState.componentPool.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {gameState.componentPool.map(c => (
            <div key={c.id} className="w-32">
              <ComponentCard component={c} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
