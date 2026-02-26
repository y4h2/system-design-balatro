/** Tarot pack — displayed as a real architecture book cover */

import coverDdia from '../assets/covers/ddia.webp';
import coverMicroservices from '../assets/covers/microservices.webp';
import coverSre from '../assets/covers/sre.webp';
import coverDistributed from '../assets/covers/distributed.webp';
import coverDbInternals from '../assets/covers/db_internals.webp';
import coverFundamentals from '../assets/covers/fundamentals.webp';
import coverHardParts from '../assets/covers/hard_parts.webp';
import coverK8s from '../assets/covers/k8s.webp';
import coverKafka from '../assets/covers/kafka.webp';
import coverIac from '../assets/covers/iac.webp';

export interface PackType {
  id: string;
  name: string;
  cover: string;
  price: number;
  cardCount: number;
}

/** Catalog of available packs using real system-design book covers */
export const PACK_CATALOG: PackType[] = [
  { id: 'pack_ddia', name: 'Designing Data-Intensive Applications', cover: coverDdia, price: 4, cardCount: 3 },
  { id: 'pack_microservices', name: 'Building Microservices', cover: coverMicroservices, price: 4, cardCount: 3 },
  { id: 'pack_sre', name: 'Site Reliability Engineering', cover: coverSre, price: 4, cardCount: 3 },
  { id: 'pack_distributed', name: 'Designing Distributed Systems', cover: coverDistributed, price: 4, cardCount: 3 },
  { id: 'pack_db_internals', name: 'Database Internals', cover: coverDbInternals, price: 4, cardCount: 3 },
  { id: 'pack_fundamentals', name: 'Fundamentals of Software Architecture', cover: coverFundamentals, price: 5, cardCount: 4 },
  { id: 'pack_hard_parts', name: 'Software Architecture: The Hard Parts', cover: coverHardParts, price: 5, cardCount: 4 },
  { id: 'pack_k8s', name: 'Kubernetes: Up & Running', cover: coverK8s, price: 4, cardCount: 3 },
  { id: 'pack_kafka', name: 'Kafka: The Definitive Guide', cover: coverKafka, price: 4, cardCount: 3 },
  { id: 'pack_iac', name: 'Infrastructure as Code', cover: coverIac, price: 4, cardCount: 3 },
];

interface TarotPackProps {
  pack: PackType;
  onClick?: () => void;
  showPrice?: boolean;
  disabled?: boolean;
}

export default function TarotPack({ pack, onClick, showPrice, disabled }: TarotPackProps) {
  return (
    <div
      className={`w-[160px] h-[240px] rounded-lg select-none overflow-hidden flex flex-col transition-transform ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}`}
      style={{
        boxShadow: '3px 3px 10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.08)',
      }}
      onClick={disabled ? undefined : onClick}
    >
      <div className="flex-1 relative bg-gray-800">
        <img
          src={pack.cover}
          alt={pack.name}
          className="w-full h-full object-cover"
        />

        {/* Price tag overlay */}
        {showPrice && (
          <div
            className="absolute bottom-0 left-0 right-0 px-2.5 py-1.5 flex items-center justify-between"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}
          >
            <span className="text-[10px] text-white/70 font-medium truncate max-w-[100px]">
              {pack.cardCount} 张塔罗
            </span>
            <span className="text-sm font-bold text-amber-400">${pack.price}</span>
          </div>
        )}
      </div>
    </div>
  );
}
