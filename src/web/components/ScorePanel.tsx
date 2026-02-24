interface ScorePanelProps {
  chips?: number;
  mult?: number;
  finalScore?: number;
  targetScore: number;
}

export default function ScorePanel({ chips, mult, finalScore, targetScore }: ScorePanelProps) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 space-y-3">
      <div>
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Chips</div>
        <div className="neon-chips font-display text-2xl font-bold">{chips ?? '--'}</div>
      </div>
      <div className="text-[var(--color-text-muted)] font-display text-lg text-center">x</div>
      <div>
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Mult</div>
        <div className="neon-mult font-display text-2xl font-bold">{mult ?? '--'}</div>
      </div>
      <div className="border-t border-white/10 pt-3">
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Score</div>
        <div className="font-display text-xl font-bold text-white">
          {finalScore !== undefined ? finalScore : '--'}
        </div>
      </div>
      <div className="border-t border-white/10 pt-3">
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Target</div>
        <div className="font-display text-lg text-[var(--color-chips)]">{targetScore}</div>
      </div>
    </div>
  );
}
