import { motion } from 'framer-motion';
import type { Component } from '../../schemas/index.js';
import ComponentCard from './ComponentCard';

interface HandZoneProps {
  cards: Component[];
  discardSelectedIds: string[];
  onToggleDeploy: (componentId: string) => void;
  onToggleDiscard: (componentId: string) => void;
}

export default function HandZone({ cards, discardSelectedIds, onToggleDeploy, onToggleDiscard }: HandZoneProps) {
  return (
    <div className="p-4">
      <div className="text-xs text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
        Hand ({cards.length} cards)
      </div>
      <div className="flex flex-wrap gap-3 max-h-[40vh] overflow-y-auto">
        {cards.map((c, i) => {
          const isDiscardSelected = discardSelectedIds.includes(c.id);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`w-36 sm:w-40 md:w-44 relative ${isDiscardSelected ? 'ring-2 ring-amber-500 rounded-xl' : ''}`}
            >
              <ComponentCard
                component={c}
                onClick={() => onToggleDeploy(c.id)}
              />
              {/* Discard toggle button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDiscard(c.id);
                }}
                className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10px] font-bold z-10 transition ${
                  isDiscardSelected
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/10 text-[var(--color-text-muted)] hover:bg-amber-500/50 hover:text-white'
                }`}
                title={isDiscardSelected ? 'Unmark for discard' : 'Mark for discard'}
              >
                ✕
              </button>
              {/* Discard overlay */}
              {isDiscardSelected && (
                <div className="absolute inset-0 bg-amber-500/10 rounded-xl pointer-events-none" />
              )}
            </motion.div>
          );
        })}
        {cards.length === 0 && (
          <div className="text-sm text-[var(--color-text-muted)]">
            All cards deployed
          </div>
        )}
      </div>
    </div>
  );
}
