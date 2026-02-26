interface PatternBadgeProps {
  name: string;
  desc?: string;
}

export default function PatternBadge({ name, desc }: PatternBadgeProps) {
  return (
    <span
      className="relative inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-functional)]/15 border border-[var(--color-functional)]/40 text-[var(--color-functional)] text-xs font-medium pattern-glow group cursor-default"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-functional)] shadow-[0_0_4px_var(--color-functional)]" aria-hidden="true" />
      {name}
      {desc && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-text-muted)] text-[11px] font-normal whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
          {desc}
        </span>
      )}
    </span>
  );
}
