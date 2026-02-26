import { useState } from 'react';
import { getCardIconUrl, domainColors } from '../icons/cardIcons';

interface CardIconProps {
  iconId: string;
  size?: number;
  domain?: string;
}

export default function CardIcon({ iconId, size = 48, domain }: CardIconProps) {
  const [failed, setFailed] = useState(false);
  const fallbackColor = domain ? domainColors[domain] ?? '#888' : '#888';

  if (failed || !iconId) {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ width: size, height: size, backgroundColor: fallbackColor + '20' }}
      >
        <span style={{ fontSize: size * 0.5, color: fallbackColor }}>?</span>
      </div>
    );
  }

  return (
    <img
      src={getCardIconUrl(iconId, size)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ objectFit: 'contain' }}
    />
  );
}
