import type { Tarot } from '../../schemas/index.js';
import { t } from '../i18n';

interface TarotCardProps {
  tarot: Tarot;
  onClick?: () => void;
  showPrice?: boolean;
}

export default function TarotCard({ tarot, onClick, showPrice }: TarotCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className="card-base border-indigo-500/60 bg-indigo-950/50 cursor-pointer w-[160px] h-[240px] flex flex-col justify-between"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      {/* Header: name + type badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{tarot.name}</span>
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
          {tarot.type === 'info_reveal' ? t('tarot.reveal') : t('tarot.modify')}
        </span>
      </div>

      {/* Description — centered in remaining space */}
      <p className="text-xs text-[var(--color-text-muted)] flex-1 flex items-center">
        {tarot.desc}
      </p>

      {/* Footer: price */}
      {showPrice && (
        <span className="neon-gold font-display text-xs mt-auto block">${tarot.shop_cost}</span>
      )}
    </div>
  );
}
