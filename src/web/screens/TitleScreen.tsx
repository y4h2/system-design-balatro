import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export default function TitleScreen() {
  const { gameData, startGame } = useGameStore();
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const school = selectedSchool ? gameData.schools.find(s => s.id === selectedSchool) : null;

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="font-display text-5xl font-bold mb-2 neon-chips">
          System Design
        </h1>
        <p className="text-lg text-[var(--color-text-muted)]">Architecture Card Game</p>
      </motion.div>

      {/* School Selection */}
      <div className="w-full max-w-5xl mb-10">
        <h2 className="text-xl font-medium mb-4">Choose Your School</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {gameData.schools.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => { setSelectedSchool(s.id); setSelectedScenario(null); }}
              className={`card-base text-left transition-all ${
                selectedSchool === s.id
                  ? 'border-[var(--color-chips)] shadow-[var(--glow-chips)]'
                  : 'hover:border-white/30'
              }`}
            >
              <h3 className="font-medium text-base mb-1">{s.name}</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-3 line-clamp-3">{s.desc}</p>
              <div className="flex gap-3 text-[10px] text-[var(--color-text-muted)]">
                <span>Draft: {s.modifiers.draft_rounds}R</span>
                <span>Jokers: {s.modifiers.joker_slots}</span>
                <span>Budget: {s.modifiers.capacity_budget_offset >= 0 ? '+' : ''}{s.modifiers.capacity_budget_offset}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Scenario Selection (appears after school is selected) */}
      <AnimatePresence>
        {selectedSchool && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl mb-10"
          >
            <h2 className="text-xl font-medium mb-4">Choose Your Scenario</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gameData.scenarios.map((sc, i) => (
                <motion.button
                  key={sc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`card-base text-left transition-all ${
                    selectedScenario === sc.id
                      ? 'border-[var(--color-chips)] shadow-[var(--glow-chips)]'
                      : 'hover:border-white/30'
                  }`}
                >
                  <h3 className="font-medium text-base mb-1">{sc.name}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mb-3">{sc.desc}</p>
                  <div className="space-y-1">
                    {sc.phases.map((p, pi) => (
                      <div key={pi} className="flex justify-between text-[10px]">
                        <span className={`uppercase ${p.blind === 'boss' ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
                          {p.blind}
                        </span>
                        <span className="text-[var(--color-text-muted)]">
                          Target: {p.target_score} | Cap: {p.capacity_budget}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Button */}
      <AnimatePresence>
        {selectedSchool && selectedScenario && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => startGame(selectedSchool, selectedScenario)}
            className="px-12 py-4 rounded-xl bg-[var(--color-chips)] text-black font-bold text-xl hover:brightness-110 transition-all shadow-[var(--glow-chips)]"
          >
            Start Game
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
