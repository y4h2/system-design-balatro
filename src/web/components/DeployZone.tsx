import { motion, AnimatePresence } from 'framer-motion';
import type { Component } from '../../schemas/index.js';
import ComponentCard from './ComponentCard';

interface DeployZoneProps {
  components: Component[];
  onUndeploy: (componentId: string) => void;
}

export default function DeployZone({ components, onUndeploy }: DeployZoneProps) {
  return (
    <div className="min-h-[200px] rounded-xl border-2 border-dashed border-white/10 p-4">
      <div className="text-xs text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">
        Deploy Zone ({components.length} deployed)
      </div>
      <div className="flex flex-wrap gap-3 max-h-[35vh] overflow-y-auto">
        <AnimatePresence>
          {components.map(c => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              className="w-36 sm:w-40 md:w-44"
            >
              <ComponentCard
                component={c}
                selected
                onClick={() => onUndeploy(c.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {components.length === 0 && (
          <div className="w-full text-center py-8 text-[var(--color-text-muted)] text-sm">
            Click components below to deploy them
          </div>
        )}
      </div>
    </div>
  );
}
