interface ScorePanelProps {
  chips?: number;
  mult?: number;
  finalScore?: number;
  targetScore: number;
}

export default function ScorePanel({ chips, mult, finalScore, targetScore }: ScorePanelProps) {
  const allUndefined = chips === undefined && mult === undefined && finalScore === undefined;

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 space-y-3">
      <div>
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Chips</div>
        <div className={`font-display text-2xl font-bold ${chips !== undefined ? 'neon-chips' : 'text-[var(--color-text-muted)]/40'}`}>
          {chips ?? 0}
        </div>
      </div>
      <div className="text-[var(--color-text-muted)] font-display text-lg text-center">x</div>
      <div>
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Mult</div>
        <div className={`font-display text-2xl font-bold ${mult !== undefined ? 'neon-mult' : 'text-[var(--color-text-muted)]/40'}`}>
          {mult ?? 0}
        </div>
      </div>
      <div className="border-t border-white/10 pt-3">
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Score</div>
        <div className={`font-display text-xl font-bold ${finalScore !== undefined ? 'text-white' : 'text-[var(--color-text-muted)]/40'}`}>
          {finalScore ?? 0}
        </div>
      </div>
      <div className="border-t border-white/10 pt-3">
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Target</div>
        <div className="font-display text-lg text-[var(--color-chips)]">{targetScore}</div>
      </div>
      {allUndefined && (
        <div className="text-[11px] text-[var(--color-text-muted)] text-center italic pt-1">
          Deploy components to preview
        </div>
      )}
    </div>
  );
}
