import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import type { Component } from '../../schemas/index.js';
import DraggableCard from './DraggableCard';
import { t } from '../i18n';

interface HandZoneProps {
  cards: Component[];
  selectedIds: string[];
  onToggleSelect: (componentId: string) => void;
  hideIds?: Set<string>;
  enteringIds?: Set<string>;
}

const CARD_W = 160;
const CARD_H = 240;
const MIN_OFFSET = 60;
const ARC_RADIUS = 1800; // larger = flatter arc
const MAX_ARC_ANGLE = 20; // max spread angle in degrees (total)

export default function HandZone({ cards, selectedIds, onToggleSelect, hideIds, enteringIds }: HandZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'hand-zone' });
  const visibleCards = hideIds ? cards.filter(c => !hideIds.has(c.id)) : cards;
  const count = visibleCards.length;

  const targetWidth = 900;
  const offset = count <= 1
    ? CARD_W
    : Math.max(MIN_OFFSET, Math.min(CARD_W, (targetWidth - CARD_W) / (count - 1)));
  const totalWidth = count <= 1 ? CARD_W : CARD_W + (count - 1) * offset;

  // Arc: each card gets a rotation and vertical offset along a circle
  const totalAngle = Math.min(MAX_ARC_ANGLE, count * 2.5); // degrees
  const angleStep = count <= 1 ? 0 : totalAngle / (count - 1);
  const startAngle = -totalAngle / 2;

  function getArc(i: number) {
    if (count <= 1) return { rotation: 0, arcY: 0 };
    const angle = startAngle + i * angleStep; // degrees, centered at 0
    const rad = (angle * Math.PI) / 180;
    const rotation = angle;
    // vertical offset: cos curve (center cards higher, edges lower)
    const arcY = ARC_RADIUS - ARC_RADIUS * Math.cos(rad);
    return { rotation, arcY };
  }

  return (
    <div
      ref={setNodeRef}
      className={`p-4 transition-colors ${isOver ? 'bg-white/5' : ''}`}
    >
      <div className="text-xs text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
        {t('hand.title')} ({count} {t('hand.cards')})
      </div>
      <div className="flex justify-center">
        <div className="relative" style={{ width: totalWidth, height: CARD_H + 60 }}>
          {visibleCards.map((c, i) => {
            const isSelected = selectedIds.includes(c.id);
            const baseZ = isSelected ? 100 + i : i;
            const { rotation, arcY } = getArc(i);
            const selectedLift = isSelected ? -30 : 0;
            const topBase = 30 + arcY + selectedLift;
            const isEntering = enteringIds?.has(c.id);

            if (isEntering) {
              // Track enter order for stagger
              const enterIdx = visibleCards.filter((vc, vi) => vi <= i && enteringIds!.has(vc.id)).length - 1;
              return (
                <motion.div
                  key={c.id}
                  className="absolute origin-bottom"
                  initial={{ x: 200, y: 80, opacity: 0, scale: 0.7 }}
                  animate={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 150,
                    damping: 18,
                    delay: enterIdx * 0.1,
                  }}
                  style={{
                    left: i * offset,
                    top: topBase,
                    zIndex: baseZ,
                    rotate: `${rotation}deg`,
                  }}
                >
                  <DraggableCard
                    component={c}
                    source="hand"
                    selected={isSelected}
                    onClick={() => onToggleSelect(c.id)}
                  />
                </motion.div>
              );
            }

            return (
              <div
                key={c.id}
                className="absolute transition-all duration-200 origin-bottom"
                style={{
                  left: i * offset,
                  top: topBase,
                  zIndex: baseZ,
                  transform: `rotate(${rotation}deg)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.zIndex = '200';
                  e.currentTarget.style.transform = `rotate(${rotation}deg) translateY(-16px)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.zIndex = String(baseZ);
                  e.currentTarget.style.transform = `rotate(${rotation}deg)`;
                }}
              >
                <DraggableCard
                  component={c}
                  source="hand"
                  selected={isSelected}
                  onClick={() => onToggleSelect(c.id)}
                />
              </div>
            );
          })}
          {count === 0 && (
            <div className="text-sm text-[var(--color-text-muted)] absolute inset-0 flex items-center justify-center">
              {t('hand.emptyHint')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
