import { platformIcons, platformAccents, getCardIconUrl } from '../icons/cardIcons';

interface PatternBadgeProps {
  name: string;
  desc?: string;
  platform?: string;
}

export default function PatternBadge({ name, desc, platform }: PatternBadgeProps) {
  const iconId = platform ? platformIcons[platform] : undefined;
  const accent = platform ? platformAccents[platform] : undefined;

  return (
    <span
      className={`relative inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium pattern-glow group cursor-default ${
        accent
          ? 'border'
          : 'bg-[var(--color-functional)]/15 border border-[var(--color-functional)]/40 text-[var(--color-functional)]'
      }`}
      style={accent ? {
        backgroundColor: accent + '26',
        borderColor: accent + '66',
        color: accent,
      } : undefined}
    >
      {iconId ? (
        <img
          src={getCardIconUrl(iconId, 14, (iconId.startsWith('simple-icons:') || iconId.startsWith('lucide:')) ? accent : undefined)}
          alt={platform}
          className="w-3.5 h-3.5"
          style={{ filter: 'drop-shadow(0 0 2px ' + accent + ')' }}
        />
      ) : (
        <span
          className={accent ? '' : 'w-1.5 h-1.5 rounded-full bg-[var(--color-functional)] shadow-[0_0_4px_var(--color-functional)]'}
          style={accent ? { width: 6, height: 6, borderRadius: '50%', backgroundColor: accent, boxShadow: `0 0 4px ${accent}` } : undefined}
          aria-hidden="true"
        />
      )}
      {name}
      {desc && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-text-muted)] text-[11px] font-normal whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
          {desc}
        </span>
      )}
    </span>
  );
}
