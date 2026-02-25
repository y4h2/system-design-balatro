import type { Joker } from '../../schemas/index.js';

interface JokerCardProps {
  joker: Joker;
  active?: boolean;
  showPrice?: boolean;
  onClick?: () => void;
}

export default function JokerCard({ joker, active = true, showPrice, onClick }: JokerCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`card-base card-${joker.rarity} cursor-pointer ${!active ? 'opacity-50' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium truncate">{joker.name}</span>
        <span className="neon-mult font-display text-sm font-bold">x{joker.multiplier}</span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-2 line-clamp-2">{joker.desc}</p>
      {showPrice && (
        <span className="neon-gold font-display text-xs">${joker.shop_cost}</span>
      )}
    </div>
  );
}
