import type { Joker } from '../../schemas/index.js';

// Static imports for joker images
import imgSlaManiac from '../assets/jokers/jk_sla_maniac.webp';
import imgDataHoarder from '../assets/jokers/jk_data_hoarder.webp';
import imgCloudNative from '../assets/jokers/jk_cloud_native.webp';
import imgPatternAmp from '../assets/jokers/jk_pattern_amp.webp';
import imgComboKing from '../assets/jokers/jk_combo_king.webp';
import imgCardCounter from '../assets/jokers/jk_card_counter.webp';
import imgRerollMaster from '../assets/jokers/jk_reroll_master.webp';
import imgGoldMine from '../assets/jokers/jk_gold_mine.webp';
import imgAllIn from '../assets/jokers/jk_all_in.webp';
import imgMinimalist from '../assets/jokers/jk_minimalist.webp';
import imgRubberDuck from '../assets/jokers/jk_rubber_duck.webp';
import imgLegacyCode from '../assets/jokers/jk_legacy_code.webp';
import imgMicroserviceMania from '../assets/jokers/jk_microservice_mania.webp';
import imgCacheHit from '../assets/jokers/jk_cache_hit.webp';
import imgIncidentCmd from '../assets/jokers/jk_incident_cmd.webp';
import imgOpenSource from '../assets/jokers/jk_open_source.webp';
import img10xDev from '../assets/jokers/jk_10x_dev.webp';
import imgOverEngineer from '../assets/jokers/jk_over_engineer.webp';
import imgDevopsGuru from '../assets/jokers/jk_devops_guru.webp';
import imgChaosLover from '../assets/jokers/jk_chaos_lover.webp';

const jokerImages: Record<string, string> = {
  jk_sla_maniac: imgSlaManiac,
  jk_data_hoarder: imgDataHoarder,
  jk_cloud_native: imgCloudNative,
  jk_pattern_amp: imgPatternAmp,
  jk_combo_king: imgComboKing,
  jk_card_counter: imgCardCounter,
  jk_reroll_master: imgRerollMaster,
  jk_gold_mine: imgGoldMine,
  jk_all_in: imgAllIn,
  jk_minimalist: imgMinimalist,
  jk_rubber_duck: imgRubberDuck,
  jk_legacy_code: imgLegacyCode,
  jk_microservice_mania: imgMicroserviceMania,
  jk_cache_hit: imgCacheHit,
  jk_incident_cmd: imgIncidentCmd,
  jk_open_source: imgOpenSource,
  jk_10x_dev: img10xDev,
  jk_over_engineer: imgOverEngineer,
  jk_devops_guru: imgDevopsGuru,
  jk_chaos_lover: imgChaosLover,
};

function formatEffect(effect: Joker['effect']): string {
  switch (effect.type) {
    case 'mult': return `×${effect.value}`;
    case 'chips': return effect.per_tag ? `+${effect.value}/${effect.per_tag}` : `+${effect.value}`;
    case 'pattern_enhance': return `+${effect.extra_mult} mult/pattern`;
    case 'hand_size': return `手牌 +${effect.value}`;
    case 'discard': return `弃牌 +${effect.value}`;
    case 'gold': return `+${effect.value} gold/${effect.per === 'pattern' ? 'pattern' : 'phase'}`;
    case 'combo_mult': return `×${effect.value} (${effect.min_patterns}+ patterns)`;
    default: return '';
  }
}

function getEffectColor(type: string): string {
  switch (type) {
    case 'mult':
    case 'combo_mult':
    case 'pattern_enhance':
      return 'neon-mult';
    case 'chips':
      return 'neon-chips';
    case 'gold':
      return 'neon-gold';
    default:
      return 'text-white';
  }
}

interface JokerCardProps {
  joker: Joker;
  active?: boolean;
  showPrice?: boolean;
  onClick?: () => void;
}

export default function JokerCard({ joker, active = true, showPrice, onClick }: JokerCardProps) {
  const imgSrc = jokerImages[joker.id];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`relative cursor-pointer w-[160px] h-[240px] rounded-xl overflow-hidden border border-white/10 shadow-lg transition-transform hover:scale-105 ${!active ? 'opacity-50' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      {/* Full-bleed image or fallback */}
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={joker.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a3e] to-[#1a1a2e] flex items-center justify-center">
          <span className="text-6xl opacity-40">🃏</span>
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Text content at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-1">
        <div className="text-[14px] font-bold text-white leading-tight truncate">
          {joker.name}
        </div>
        <p className="text-[11px] text-white/70 leading-tight line-clamp-2 mt-0.5">
          {joker.desc}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`font-display text-[12px] font-bold ${getEffectColor(joker.effect.type)}`}>
            {formatEffect(joker.effect)}
          </span>
          {showPrice && (
            <span className="neon-gold font-display text-[12px] font-bold">${joker.shop_cost}</span>
          )}
        </div>
      </div>
    </div>
  );
}
