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

const domainColors: Record<string, string> = {
  compute: '#3b82f6',   // blue
  data: '#22c55e',      // green
  network: '#f59e0b',   // amber
  defense: '#ef4444',   // red
  platform: '#a855f7',  // purple
};

const domainLabels: Record<string, string> = {
  compute: 'COMPUTE',
  data: 'DATA',
  network: 'NETWORK',
  defense: 'DEFENSE',
  platform: 'PLATFORM',
};

export default function ComponentCard({ component, selected, onClick, size = 'md', showPrice }: ComponentCardProps) {
  const isSmall = size === 'sm';
  const domainColor = domainColors[component.domain] ?? '#888';
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div
      className={`card-base ${rarityClass[component.rarity]} ${selected ? 'card-selected' : ''} cursor-pointer select-none relative overflow-hidden ${isSmall ? 'p-2' : 'p-3'}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Domain accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: domainColor }} />

      {/* Deployed checkmark badge */}
      {selected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-functional)] flex items-center justify-center text-black text-xs font-bold z-10">
          ✓
        </div>
      )}

      {/* Card content with left padding for stripe */}
      <div className="pl-2">
        {/* Header: domain badge + name */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
            style={{ backgroundColor: domainColor + '30', color: domainColor }}
          >
            {domainLabels[component.domain] ?? component.domain}
          </span>
          <span className={`font-medium truncate ${isSmall ? 'text-xs' : 'text-sm'}`}>{component.name}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {component.tags.slice(0, isSmall ? 2 : 4).map(tag => (
            <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)]">
              {tag}
            </span>
          ))}
          {component.tags.length > (isSmall ? 2 : 4) && (
            <span className="text-[11px] text-[var(--color-text-muted)]">+{component.tags.length - (isSmall ? 2 : 4)}</span>
          )}
        </div>

        {/* Base chips + Delta values */}
        {!isSmall && (
          <div className="flex gap-3 mb-2 items-center">
            <span className="font-display text-xs neon-chips">
              +{component.base_chips} chips
            </span>
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
      </div>
    </motion.div>
  );
}

function DeltaValue({ value, label, color }: { value: number; label: string; color: string }) {
  if (value === 0) return null;
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`font-display text-xs ${color}`}>
      {label} {sign}{value}
    </span>
  );
}
