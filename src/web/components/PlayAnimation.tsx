import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ComponentCard from './ComponentCard';
import PatternBadge from './PatternBadge';
import type { Component } from '../../schemas/index.js';

type Phase = 'rise' | 'patterns' | 'exit';

interface PlayAnimationProps {
  playedCards: Component[];
  patterns: { name: string; desc: string; platform?: string }[];
  onComplete: () => void;
}

export default function PlayAnimation({ playedCards, patterns, onComplete }: PlayAnimationProps) {
  const [phase, setPhase] = useState<Phase>('rise');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // rise → patterns
    timers.push(setTimeout(() => setPhase('patterns'), 600));

    // patterns → exit (shorter if no patterns)
    const patternDuration = patterns.length > 0 ? 1200 : 400;
    timers.push(setTimeout(() => setPhase('exit'), 600 + patternDuration));

    // exit → complete
    timers.push(setTimeout(() => onComplete(), 600 + patternDuration + 500));

    return () => timers.forEach(clearTimeout);
  }, [patterns.length, onComplete]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center justify-start pt-8">
      {/* Cards group */}
      <motion.div
        className="flex gap-3 items-end"
        animate={
          phase === 'exit'
            ? { x: 400, scale: 0.3, opacity: 0 }
            : { x: 0, scale: 1, opacity: 1 }
        }
        transition={
          phase === 'exit'
            ? { duration: 0.45, ease: 'easeIn' }
            : { duration: 0.1 }
        }
      >
        {playedCards.map((card, i) => (
          <motion.div
            key={card.id}
            className="w-40"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 20,
              delay: i * 0.08,
            }}
          >
            <ComponentCard component={card} />
          </motion.div>
        ))}
      </motion.div>

      {/* Pattern badges */}
      <AnimatePresence>
        {(phase === 'patterns' || phase === 'exit') && patterns.length > 0 && (
          <motion.div
            className="flex gap-2 mt-4"
            animate={
              phase === 'exit'
                ? { x: 400, scale: 0.3, opacity: 0 }
                : { x: 0, scale: 1, opacity: 1 }
            }
            transition={
              phase === 'exit'
                ? { duration: 0.45, ease: 'easeIn' }
                : { duration: 0.1 }
            }
          >
            {patterns.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: i * 0.15,
                }}
              >
                <div className="pattern-anim-glow">
                  <PatternBadge name={p.name} desc={p.desc} platform={p.platform} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
