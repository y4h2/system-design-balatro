interface GoldDisplayProps {
  amount: number;
}

export default function GoldDisplay({ amount }: GoldDisplayProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-lg">🪙</span>
      <span className="neon-gold font-display font-bold text-lg">${amount}</span>
    </div>
  );
}
