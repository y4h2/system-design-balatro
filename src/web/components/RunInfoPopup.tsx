import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../i18n';

export default function RunInfoPopup() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 left-4 z-40 w-9 h-9 rounded-full bg-[var(--color-surface-light)] border border-white/10 text-[var(--color-text-muted)] hover:text-white hover:border-white/30 transition flex items-center justify-center text-sm font-bold"
        title={t('info.title')}
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
                <span className="font-display text-sm neon-chips">{t('info.title')}</span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-white transition text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="px-5 py-4 space-y-5 text-sm text-[var(--color-text)]">
                {/* Scoring */}
                <Section title={t('info.scoringFormula')}>
                  <Formula>{t('info.scoringFormulaDesc')}</Formula>
                  <Sub>
                    <Formula>{t('info.chipsFormula')}</Formula>
                    <p className="text-[var(--color-text-muted)]">
                      {t('info.chipsDesc')}
                    </p>
                  </Sub>
                  <Sub>
                    <Formula>{t('info.multFormula')}</Formula>
                    <p className="text-[var(--color-text-muted)]">
                      {t('info.multDesc')}
                    </p>
                  </Sub>
                </Section>

                {/* Domains & Tags */}
                <Section title={t('info.domainsAndTags')}>
                  <p>{t('info.domainsDesc')}</p>
                  <p className="text-[var(--color-text-muted)]">
                    {t('info.domainsHint')}
                  </p>
                </Section>

                {/* Patterns */}
                <Section title={t('info.patterns')}>
                  <p><span className="text-blue-400">{t('info.patternT1')}</span></p>
                  <p><span className="text-purple-400">{t('info.patternT2')}</span></p>
                  <p><span className="text-amber-400">{t('info.patternT3')}</span></p>
                </Section>

                {/* Constraints */}
                <Section title={t('info.constraints')}>
                  <p className="text-[var(--color-text-muted)]">
                    {t('info.constraintsDesc')}
                  </p>
                </Section>

                {/* Capacity */}
                <Section title={t('info.capacity')}>
                  <p>{t('info.capacityDesc')}</p>
                  <Formula>{t('info.capacityFormula')}</Formula>
                </Section>

                {/* Discard */}
                <Section title={t('info.discardAndDraw')}>
                  <ul className="list-disc list-inside text-[var(--color-text-muted)] space-y-0.5">
                    <li>{t('info.discardMax')}</li>
                    <li>{t('info.discardChances')}</li>
                    <li>{t('info.discardRemoved')}</li>
                  </ul>
                </Section>

                {/* Jokers */}
                <Section title={t('info.jokerEffects')}>
                  <p className="text-[var(--color-text-muted)]">
                    {t('info.jokerDesc')}
                  </p>
                </Section>

                {/* Tarots */}
                <Section title={t('info.tarotEffects')}>
                  <p className="text-[var(--color-text-muted)]">
                    {t('info.tarotDesc')}
                  </p>
                </Section>

                {/* Game flow */}
                <Section title={t('info.gameFlow')}>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] flex-wrap">
                    <Phase label={t('blind.small')} />
                    <Arrow />
                    <Phase label={t('info.shop')} />
                    <Arrow />
                    <Phase label={t('blind.big')} />
                    <Arrow />
                    <Phase label={t('info.shop')} />
                    <Arrow />
                    <Phase label={t('blind.boss')} />
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

function Phase({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded bg-white/10 text-white">{label}</span>
  );
}

function Arrow() {
  return <span className="text-[var(--color-text-muted)]">&rarr;</span>;
}
