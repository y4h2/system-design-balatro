import { t } from '../i18n';
import DomainSuit from './DomainSuit';
import { domainColors } from '../icons/cardIcons';

const DOMAINS = ['compute', 'data', 'network', 'defense', 'platform'] as const;

interface DeckPileProps {
  count: number;
  total: number;
}

export default function DeckPile({ count, total }: DeckPileProps) {
  // Show 0-4 layers based on count
  const layers = count === 0 ? 0 : Math.min(Math.ceil(count / 5), 4);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[160px] h-[240px]">
        {/* Stacked card layers behind */}
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-lg border border-white/10 bg-[var(--color-surface)]"
            style={{
              transform: `translate(${(layers - 1 - i) * 2}px, ${(layers - 1 - i) * -2}px)`,
            }}
          />
        ))}
        {/* Top card with card-back design */}
        <div className="absolute inset-0 rounded-lg border border-white/20 bg-[var(--color-surface)] flex flex-col items-center justify-between p-0 overflow-hidden">
          {/* Inner dashed border frame */}
          <div className="absolute inset-2 rounded border border-dashed border-white/25 pointer-events-none" />
          {/* Architecture diagram pattern */}
          <div className="flex-1 flex items-center justify-center w-full">
            <svg
              width="110"
              height="110"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Three service nodes (top row) */}
              <rect x="12" y="16" width="12" height="10" rx="2" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              <rect x="34" y="16" width="12" height="10" rx="2" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              <rect x="56" y="16" width="12" height="10" rx="2" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              {/* Lines from nodes down to junction */}
              <line x1="18" y1="26" x2="18" y2="40" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              <line x1="40" y1="26" x2="40" y2="40" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              <line x1="62" y1="26" x2="62" y2="40" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              {/* Horizontal line connecting all three verticals */}
              <line x1="18" y1="40" x2="62" y2="40" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              {/* Vertical line from junction to database */}
              <line x1="40" y1="40" x2="40" y2="52" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              {/* Database node (bottom) */}
              <rect x="30" y="52" width="20" height="14" rx="2" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
            </svg>
          </div>
          {/* Domain icons row */}
          <div className="flex items-center gap-1.5 pb-1">
            {DOMAINS.map((d) => (
              <div
                key={d}
                className="rounded-full p-0.5"
                style={{ backgroundColor: `${domainColors[d]}20` }}
              >
                <DomainSuit domain={d} size={14} />
              </div>
            ))}
          </div>
          {/* spacer to balance layout */}
          <div className="pb-2" />
        </div>
      </div>
      <span className="text-[10px] text-[var(--color-text-muted)]">{t('play.deck')} {count}/{total}</span>
    </div>
  );
}
