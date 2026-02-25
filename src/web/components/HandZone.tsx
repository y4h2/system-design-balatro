import { useDroppable } from '@dnd-kit/core';
import type { Component } from '../../schemas/index.js';
import DraggableCard from './DraggableCard';

interface HandZoneProps {
  cards: Component[];
  onToggleDeploy: (componentId: string) => void;
  deployFull?: boolean;
}

export default function HandZone({ cards, onToggleDeploy, deployFull }: HandZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'hand-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 transition-colors ${isOver ? 'bg-white/5' : ''}`}
    >
      <div className="text-xs text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
        Hand ({cards.length} cards)
      </div>
      <div className="flex flex-wrap gap-3 max-h-[40vh] overflow-y-auto">
        {cards.map(c => (
          <div key={c.id} className={`w-36 sm:w-40 md:w-44 transition-opacity ${deployFull ? 'opacity-40 pointer-events-none' : ''}`}>
            <DraggableCard
              component={c}
              source="hand"
              onClick={() => onToggleDeploy(c.id)}
            />
          </div>
        ))}
        {cards.length === 0 && (
          <div className="text-sm text-[var(--color-text-muted)]">
            All cards deployed or staged for discard
          </div>
        )}
      </div>
    </div>
  );
}
