import { domainIcons, domainColors, getCardIconUrl } from '../icons/cardIcons';

interface DomainSuitProps {
  domain: string;
  size?: number;
}

export default function DomainSuit({ domain, size = 16 }: DomainSuitProps) {
  const iconId = domainIcons[domain];
  const color = domainColors[domain] ?? '#888';

  if (!iconId) return null;

  return (
    <img
      src={getCardIconUrl(iconId, size) + `&color=${encodeURIComponent(color)}`}
      alt={domain}
      width={size}
      height={size}
      loading="lazy"
      style={{ objectFit: 'contain', filter: `drop-shadow(0 0 2px ${color}40)` }}
    />
  );
}
