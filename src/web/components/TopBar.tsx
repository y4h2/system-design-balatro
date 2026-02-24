import type { Joker } from '../../schemas/index.js';
import JokerCard from './JokerCard';
import GoldDisplay from './GoldDisplay';

interface TopBarProps {
  jokers: Joker[];
  phaseName: string;
  phaseSubtitle: string;
  gold: number;
}

export default function TopBar({ jokers, phaseName, phaseSubtitle, gold }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-[var(--color-surface)]/80 border-b border-white/5">
      {/* Joker slots */}
      <div className="flex gap-2 flex-1">
        {jokers.length > 0 ? (
          jokers.map(j => (
            <div key={j.id} className="w-40">
              <JokerCard joker={j} />
            </div>
          ))
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">No jokers</span>
        )}
      </div>

      {/* Phase info */}
      <div className="text-center px-6">
        <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">{phaseName}</div>
        <div className="text-sm">{phaseSubtitle}</div>
      </div>

      {/* Gold */}
      <div className="flex-1 flex justify-end">
        <GoldDisplay amount={gold} />
      </div>
    </div>
  );
}
