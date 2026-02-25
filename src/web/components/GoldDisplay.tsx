import { useRef, useEffect, useState } from 'react';

interface GoldDisplayProps {
  amount: number;
}

function useAnimatedGold(target: number, duration = 400) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;

    let start: number | null = null;
    let raf: number;

    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - t) * (1 - t); // ease-out-quad
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

export default function GoldDisplay({ amount }: GoldDisplayProps) {
  const displayAmount = useAnimatedGold(amount);

  return (
    <div className="flex items-center gap-1">
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="9" fill="var(--color-gold)" opacity="0.9" stroke="var(--color-gold)" strokeWidth="1" />
        <circle cx="10" cy="10" r="7" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
        <text x="10" y="14.5" textAnchor="middle" fontSize="11" fontWeight="bold" fill="rgba(0,0,0,0.7)" fontFamily="var(--font-display)">$</text>
      </svg>
      <span className="neon-gold font-display font-bold text-lg">${displayAmount}</span>
    </div>
  );
}
