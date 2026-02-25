interface RiskBadgeProps {
  name: string;
  sealed: boolean;
}

export default function RiskBadge({ name, sealed }: RiskBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
      sealed
        ? 'bg-[var(--color-functional)]/10 border-[var(--color-functional)]/30 text-[var(--color-functional)]'
        : 'bg-red-500/10 border-red-500/30 text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${sealed ? 'bg-[var(--color-functional)]' : 'bg-red-400 shadow-[0_0_4px_theme(colors.red.400)]'}`} aria-hidden="true" />
      {name}
      {sealed && <span className="text-[11px]" aria-label="sealed">✓</span>}
    </span>
  );
}
