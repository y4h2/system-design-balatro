import { motion } from 'framer-motion';
import type { Component } from '../../schemas/index.js';
import { t } from '../i18n';
import { cardIcons, domainColors } from '../icons/cardIcons';
import CardIcon from './CardIcon';
import DomainSuit from './DomainSuit';

interface ComponentCardProps {
  component: Component;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  showPrice?: number;
}

export default function ComponentCard({ component, selected, onClick, size = 'md', showPrice }: ComponentCardProps) {
  const isSmall = size === 'sm';
  const domainColor = domainColors[component.domain] ?? '#888';
  const domainLabel = t(`domain.${component.domain}`);
  const iconId = cardIcons[component.id] ?? '';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div
      className={`card-base ${selected ? 'card-selected' : ''} cursor-pointer select-none relative overflow-hidden flex flex-col ${isSmall ? 'p-2 w-[120px] h-[160px]' : 'p-3 w-[160px] h-[240px]'}`}
      style={{
        borderColor: selected ? undefined : domainColor,
        boxShadow: selected ? undefined : `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 10px ${domainColor}30, 0 4px 12px rgba(0,0,0,0.3)`,
      }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Deployed checkmark badge */}
      {selected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-functional)] flex items-center justify-center text-black text-xs font-bold z-10">
          ✓
        </div>
      )}

      {/* ─── Top row: domain suit + domain label ─── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <DomainSuit domain={component.domain} size={isSmall ? 12 : 16} />
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
            style={{ backgroundColor: domainColor + '30', color: domainColor }}
          >
            {domainLabel}
          </span>
        </div>
      </div>

      {/* ─── Center: brand icon ─── */}
      <div className="flex justify-center my-1">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: (isSmall ? 32 : 48) + 12,
            height: isSmall ? 32 : 48,
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        >
          <CardIcon iconId={iconId} size={isSmall ? 28 : 40} domain={component.domain} />
        </div>
      </div>

      {/* ─── Card name ─── */}
      <div className={`font-medium text-center truncate ${isSmall ? 'text-xs' : 'text-sm'} mb-0.5`}>
        {component.name}
      </div>

      {/* ─── Tags (fixed 2-row height) ─── */}
      <div
        className="flex flex-wrap justify-center gap-1 mb-1 overflow-hidden content-start"
        style={{ minHeight: isSmall ? 28 : 32, maxHeight: isSmall ? 28 : 32 }}
      >
        {component.tags.slice(0, isSmall ? 2 : 4).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)]">
            {tag}
          </span>
        ))}
        {component.tags.length > (isSmall ? 2 : 4) && (
          <span className="text-[10px] text-[var(--color-text-muted)]">+{component.tags.length - (isSmall ? 2 : 4)}</span>
        )}
      </div>

      {/* ─── Stats row: chips + deltas ─── */}
      {!isSmall && (
        <div className="flex justify-center gap-3 mb-1 items-center">
          <span className="font-display text-xs neon-chips">
            +{component.base_chips} {t('common.chips')}
          </span>
          <DeltaValue value={component.delta.perf} label="P" color="text-[var(--color-perf)]" />
          <DeltaValue value={component.delta.rel} label="R" color="text-[var(--color-rel)]" />
          <DeltaValue value={component.delta.cx} label="X" color="text-[var(--color-cx)]" />
        </div>
      )}

      {/* ─── Footer: capacity + price ─── */}
      <div className="flex items-center justify-between mt-auto">
        <span className="font-display text-xs text-[var(--color-text-muted)]">
          {t('card.cap')}: {component.capacity_cost}
        </span>
        {showPrice !== undefined && (
          <span className="neon-gold font-display text-xs">${showPrice}</span>
        )}
      </div>

      {/* ─── Bottom-right corner: domain suit (mirrored) ─── */}
      <div className="absolute bottom-1.5 right-2 opacity-40">
        <DomainSuit domain={component.domain} size={isSmall ? 10 : 14} />
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
