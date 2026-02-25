import { useDroppable } from '@dnd-kit/core';
import type { Component } from '../../schemas/index.js';
import DraggableCard from './DraggableCard';

interface DiscardZoneProps {
  components: Component[];
  onReturn: (componentId: string) => void;
  discardsRemaining: number;
}

export default function DiscardZone({ components, onReturn, discardsRemaining }: DiscardZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'discard-zone' });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] rounded-xl border-2 border-dashed p-4 mx-4 mb-2 transition-colors ${
        isOver
          ? 'border-amber-400 bg-amber-500/10'
          : 'border-amber-500/30'
      }`}
    >
      <div className="text-xs text-amber-400/80 mb-3 uppercase tracking-wider">
        Discard Zone ({components.length}/5) — {discardsRemaining} uses left
      </div>
      <div className="flex flex-wrap gap-3 max-h-[30vh] overflow-y-auto">
        {components.map(c => (
          <div key={c.id} className="w-36 sm:w-40 md:w-44">
            <DraggableCard
              component={c}
              source="discard"
              onClick={() => onReturn(c.id)}
            />
          </div>
        ))}
        {components.length === 0 && (
          <div className="w-full text-center py-4 text-amber-400/50 text-sm">
            {isOver ? 'Drop here to stage for discard' : 'Drag hand cards here to stage them for discard'}
          </div>
        )}
      </div>
    </div>
  );
}
