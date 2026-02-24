interface PatternBadgeProps {
  name: string;
}

export default function PatternBadge({ name }: PatternBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--color-functional)]/15 border border-[var(--color-functional)]/40 text-[var(--color-functional)] text-xs font-medium pattern-glow">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-functional)] animate-pulse" />
      {name}
    </span>
  );
}
