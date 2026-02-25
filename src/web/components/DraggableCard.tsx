import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Component } from '../../schemas/index.js';
import ComponentCard from './ComponentCard';

interface DraggableCardProps {
  component: Component;
  source: 'hand' | 'discard';
  onClick?: () => void;
  selected?: boolean;
  children?: React.ReactNode;
}

export default function DraggableCard({ component, source, onClick, selected, children }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${source}-${component.id}`,
    data: { source, componentId: component.id, component },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'opacity-30' : ''}`}
      {...listeners}
      {...attributes}
    >
      <ComponentCard
        component={component}
        selected={selected}
        onClick={onClick}
      />
      {children}
    </div>
  );
}
