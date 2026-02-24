import { motion } from 'framer-motion';
import type { Component } from '../../schemas/index.js';
import ComponentCard from './ComponentCard';

interface HandZoneProps {
  components: Component[];
  selectedIds: string[];
  onToggle: (componentId: string) => void;
}

export default function HandZone({ components, selectedIds, onToggle }: HandZoneProps) {
  const undeployed = components.filter(c => !selectedIds.includes(c.id));

  return (
    <div className="p-4">
      <div className="text-xs text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
        Component Pool ({undeployed.length} available)
      </div>
      <div className="flex flex-wrap gap-3">
        {undeployed.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="w-44"
          >
            <ComponentCard
              component={c}
              onClick={() => onToggle(c.id)}
            />
          </motion.div>
        ))}
        {undeployed.length === 0 && (
          <div className="text-sm text-[var(--color-text-muted)]">
            All components deployed
          </div>
        )}
      </div>
    </div>
  );
}
