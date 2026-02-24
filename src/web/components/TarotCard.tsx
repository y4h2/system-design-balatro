import type { Tarot } from '../../schemas/index.js';

interface TarotCardProps {
  tarot: Tarot;
  onClick?: () => void;
  showPrice?: boolean;
}

export default function TarotCard({ tarot, onClick, showPrice }: TarotCardProps) {
  return (
    <div
      className="card-base border-indigo-500/60 bg-indigo-950/50 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{tarot.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
          {tarot.type === 'info_reveal' ? 'Reveal' : 'Modify'}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{tarot.desc}</p>
      {showPrice && (
        <span className="neon-gold font-display text-xs mt-1 block">${tarot.shop_cost}</span>
      )}
    </div>
  );
}
