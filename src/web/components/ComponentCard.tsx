import { motion } from 'framer-motion';
import type { Component } from '../../schemas/index.js';

interface ComponentCardProps {
  component: Component;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  showPrice?: number;
}

const rarityClass: Record<string, string> = {
  common: 'card-common',
  uncommon: 'card-uncommon',
  rare: 'card-rare',
};

const categoryDot: Record<string, string> = {
  functional: 'bg-[var(--color-functional)]',
  defensive: 'bg-[var(--color-defensive)]',
};

function DeltaValue({ value, label, color }: { value: number; label: string; color: string }) {
  if (value === 0) return null;
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`font-display text-xs ${color}`}>
      {label} {sign}{value}
    </span>
  );
}

export default function ComponentCard({ component, selected, onClick, size = 'md', showPrice }: ComponentCardProps) {
  const isSmall = size === 'sm';
  return (
    <motion.div
      className={`card-base ${rarityClass[component.rarity]} ${selected ? 'card-selected' : ''} cursor-pointer select-none ${isSmall ? 'p-2' : 'p-3'}`}
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      layout
    >
      {/* Header: name + category dot */}
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${categoryDot[component.category]}`} />
        <span className={`font-medium truncate ${isSmall ? 'text-xs' : 'text-sm'}`}>{component.name}</span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {component.tags.slice(0, isSmall ? 2 : 4).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)]">
            {tag}
          </span>
        ))}
        {component.tags.length > (isSmall ? 2 : 4) && (
          <span className="text-[10px] text-[var(--color-text-muted)]">+{component.tags.length - (isSmall ? 2 : 4)}</span>
        )}
      </div>

      {/* Delta values */}
      {!isSmall && (
        <div className="flex gap-3 mb-2">
          <DeltaValue value={component.delta.perf} label="P" color="text-[var(--color-perf)]" />
          <DeltaValue value={component.delta.rel} label="R" color="text-[var(--color-rel)]" />
          <DeltaValue value={component.delta.cx} label="X" color="text-[var(--color-cx)]" />
        </div>
      )}

      {/* Footer: capacity cost + price */}
      <div className="flex items-center justify-between mt-auto">
        <span className="font-display text-xs text-[var(--color-text-muted)]">
          Cap: {component.capacity_cost}
        </span>
        {showPrice !== undefined && (
          <span className="neon-gold font-display text-xs">${showPrice}</span>
        )}
      </div>
    </motion.div>
  );
}
