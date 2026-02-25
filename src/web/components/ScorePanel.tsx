import type { Panel } from '../../engine/scoring.js';

interface ScorePanelProps {
  panel?: Panel;
  baseChips?: number;
  patternChips?: number;
  jokerChips?: number;
  chips?: number;
  mult?: number;
  patternMultAdds?: number[];
  jokerMults?: number[];
  penalty?: number;
  constraintFailures?: string[];
  finalScore?: number;
  targetScore: number;
}

export default function ScorePanel({
  panel, baseChips, patternChips, jokerChips,
  chips, mult, patternMultAdds, jokerMults, penalty,
  constraintFailures, finalScore, targetScore,
}: ScorePanelProps) {
  const hasPreview = chips !== undefined;
  const passing = finalScore !== undefined && finalScore >= targetScore;

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 space-y-3">
      {/* Panel stats (P/R/CX) for constraint display */}
      {panel && (
        <div className="space-y-2">
          <PanelRow label="P" color="var(--color-perf)" value={panel.perf} />
          <PanelRow label="R" color="var(--color-rel)" value={panel.rel} />
          <PanelRow label="CX" color="var(--color-cx)" value={panel.cx} />
        </div>
      )}

      {/* Chips breakdown */}
      <div className="border-t border-white/10 pt-2">
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Chips</div>
        <div className={`font-display text-2xl font-bold ${hasPreview ? 'neon-chips' : 'text-[var(--color-text-muted)]/40'}`}>
          {chips !== undefined ? chips : 0}
        </div>
        {hasPreview && (
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
            <span className="text-white">{baseChips ?? 0}</span> base
            {(patternChips ?? 0) > 0 && (
              <span className="text-[var(--color-functional)]"> +{patternChips} pattern</span>
            )}
            {(jokerChips ?? 0) > 0 && (
              <span className="neon-gold"> +{jokerChips} joker</span>
            )}
          </div>
        )}
      </div>

      <div className="text-[var(--color-text-muted)] font-display text-lg text-center">x</div>

      {/* Mult formula */}
      <div>
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Mult</div>
        <div className={`font-display text-2xl font-bold ${hasPreview ? 'neon-mult' : 'text-[var(--color-text-muted)]/40'}`}>
          {mult !== undefined ? mult.toFixed(1) : 0}
        </div>
        {hasPreview && patternMultAdds && jokerMults && (
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
            (1{patternMultAdds.map((v, i) => (
              <span key={i} className="text-[var(--color-functional)]"> +{v}</span>
            ))})
            {jokerMults.map((v, i) => (
              <span key={i} className="neon-gold"> x{v}</span>
            ))}
          </div>
        )}
      </div>

      {/* Penalty */}
      {penalty !== undefined && penalty > 0 && (
        <div className="text-xs text-red-400 text-center font-display">
          -{penalty} penalty
        </div>
      )}

      {/* Constraint failures */}
      {constraintFailures && constraintFailures.length > 0 && (
        <div className="text-[10px] text-red-400 space-y-0.5">
          {constraintFailures.map((f, i) => (
            <div key={i}>! {f}</div>
          ))}
        </div>
      )}

      {/* Score */}
      <div className="border-t border-white/10 pt-3">
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Score</div>
        <div className={`font-display text-xl font-bold ${
          hasPreview
            ? passing ? 'text-[var(--color-functional)]' : 'text-white'
            : 'text-[var(--color-text-muted)]/40'
        }`}>
          {finalScore ?? 0}
        </div>
        {hasPreview && (
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
            {chips} x {mult!.toFixed(1)}{penalty ? ` - ${penalty}` : ''} = {finalScore}
          </div>
        )}
      </div>

      {/* Target */}
      <div className="border-t border-white/10 pt-3">
        <div className="text-xs text-[var(--color-text-muted)] mb-1">Target</div>
        <div className="font-display text-lg text-[var(--color-chips)]">{targetScore}</div>
      </div>

      {!hasPreview && (
        <div className="text-[11px] text-[var(--color-text-muted)] text-center italic pt-1">
          Deploy components to preview
        </div>
      )}
    </div>
  );
}

function PanelRow({ label, color, value }: {
  label: string; color: string; value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 text-[10px] text-[var(--color-text-muted)]">{label}</div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-sm font-bold" style={{ color }}>{value.toFixed(1)}</span>
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
