import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RunInfoPopup() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 left-4 z-40 w-9 h-9 rounded-full bg-[var(--color-surface-light)] border border-white/10 text-[var(--color-text-muted)] hover:text-white hover:border-white/30 transition flex items-center justify-center text-sm font-bold"
        title="Run Info"
      >
        ?
      </button>

      {/* Popup overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-16 left-4 z-50 w-[420px] max-h-[75vh] overflow-y-auto rounded-xl bg-[var(--color-surface)] border border-white/10 shadow-2xl"
            >
              <div className="sticky top-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[var(--color-surface)]">
                <span className="font-display text-sm neon-chips">Run Info</span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-white transition text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="px-5 py-4 space-y-5 text-sm text-[var(--color-text)]">
                {/* Scoring */}
                <Section title="Scoring Formula">
                  <Formula>Score = round( Chips x Mult - Penalties )</Formula>
                  <Sub>
                    <Formula>Chips = base_chips + pattern_chips + joker_chips</Formula>
                    <p className="text-[var(--color-text-muted)]">
                      Each component has base chips. Triggered patterns and jokers add bonus chips.
                    </p>
                  </Sub>
                  <Sub>
                    <Formula>Mult = (1 + pattern_mult + joker_mult) x joker_multipliers</Formula>
                    <p className="text-[var(--color-text-muted)]">
                      Patterns add to mult; active jokers multiply it further.
                    </p>
                  </Sub>
                </Section>

                {/* Domains & Tags */}
                <Section title="Domains & Tags">
                  <p>
                    Each component belongs to a <Tag>domain</Tag> (compute, data, network, defense, platform)
                    and has 1-3 <Tag>tags</Tag> (cache, db, queue, ha, etc.).
                  </p>
                  <p className="text-[var(--color-text-muted)]">
                    Domain combinations and tag combinations trigger different patterns.
                  </p>
                </Section>

                {/* Patterns */}
                <Section title="Patterns (3 Tiers)">
                  <p><span className="text-blue-400">Tier 1 - Domain:</span> Domain Pair (2 same), Triple (3 same), Wide Spectrum (4+ different). Almost always triggerable.</p>
                  <p><span className="text-purple-400">Tier 2 - Theme:</span> Read Path (cache+db), Write Pipeline (queue+db), Observability (monitor), etc. Moderate effort.</p>
                  <p><span className="text-amber-400">Tier 3 - Legendary:</span> CQRS (db+queue+cache), Zero Downtime (ha+deploy+monitor), Full Stack (3+ theme patterns). Big rewards.</p>
                </Section>

                {/* Constraints */}
                <Section title="Constraints">
                  <p className="text-[var(--color-text-muted)]">
                    Each phase has visible constraints (min P, min R, max CX, required domains/tags).
                    Each failed constraint costs a fixed penalty shown in the sidebar.
                  </p>
                </Section>

                {/* Capacity */}
                <Section title="Capacity">
                  <p>Each component costs capacity. Over-budget penalty:</p>
                  <Formula>penalty = (used - budget) x 5</Formula>
                </Section>

                {/* Discard */}
                <Section title="Discard & Draw">
                  <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-0.5">
                    <li>Max <span className="text-white">5</span> cards per discard</li>
                    <li><span className="text-white">3</span> discard chances per phase (jokers can add more)</li>
                    <li>Discarded cards are removed for the phase</li>
                  </ul>
                </Section>

                {/* Jokers */}
                <Section title="Joker Effects">
                  <p className="text-[var(--color-text-muted)]">
                    Jokers have diverse effects: multiply score, add chips per tag, enhance patterns,
                    increase hand size/discards, or earn gold. Check each joker's description.
                  </p>
                </Section>

                {/* Tarots */}
                <Section title="Tarot Effects">
                  <p className="text-[var(--color-text-muted)]">
                    Tarots modify your components: add tags, boost chips, change domain, or reduce capacity cost.
                    Use them strategically to trigger patterns you're close to completing.
                  </p>
                </Section>

                {/* Game flow */}
                <Section title="Game Flow">
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] flex-wrap">
                    <Phase label="Small Blind" />
                    <Arrow />
                    <Phase label="Shop" />
                    <Arrow />
                    <Phase label="Big Blind" />
                    <Arrow />
                    <Phase label="Shop" />
                    <Arrow />
                    <Phase label="Boss Blind" />
                  </div>
                </Section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-xs uppercase tracking-wider text-[var(--color-chips)] mb-1.5">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display text-xs bg-white/5 rounded-lg px-3 py-1.5 text-[var(--color-text)] border border-white/5">
      {children}
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="pl-3 border-l border-white/10 space-y-1">{children}</div>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-white font-medium">
      {children}
    </span>
  );
}

function Phase({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded bg-white/10 text-white">{label}</span>
  );
}

function Arrow() {
  return <span className="text-[var(--color-text-muted)]">&rarr;</span>;
}
