import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';
import ComponentCard from '../components/ComponentCard';
import JokerCard from '../components/JokerCard';
import TarotCard from '../components/TarotCard';
import TarotPack, { PACK_CATALOG } from '../components/TarotPack';
import PatternBadge from '../components/PatternBadge';
import { domainColors } from '../icons/cardIcons';
import { detectPatterns } from '../../engine/patterns.js';
import { computePanel, computeChips, computeMult, computeFinalScore } from '../../engine/scoring.js';
import type { Component, Joker, Tarot, Pattern, SuperPattern } from '../../schemas/index.js';

type Tab = 'components' | 'jokers' | 'tarots' | 'packs' | 'patterns';

const tabs: { key: Tab; label: string }[] = [
  { key: 'components', label: 'collection.tab.components' },
  { key: 'jokers', label: 'collection.tab.jokers' },
  { key: 'tarots', label: 'collection.tab.tarots' },
  { key: 'packs', label: 'collection.tab.packs' },
  { key: 'patterns', label: 'collection.tab.patterns' },
];

const domains = ['compute', 'data', 'network', 'defense', 'platform'] as const;

export default function CollectionScreen() {
  const { gameData } = useGameStore();
  const setScreen = useGameStore(s => s.setScreen);
  const [activeTab, setActiveTab] = useState<Tab>('components');
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [testBench, setTestBench] = useState<Component[]>([]);

  const addToTest = (c: Component) => {
    if (testBench.length < 5) {
      setTestBench(prev => [...prev, c]);
    }
  };
  const removeFromTest = (index: number) => {
    setTestBench(prev => prev.filter((_, i) => i !== index));
  };
  const clearTest = () => setTestBench([]);

  // Compute patterns and score for test bench
  const testResult = useMemo(() => {
    if (testBench.length === 0) return null;
    const triggered = detectPatterns(testBench, gameData.patterns);
    const baseline = { perf: 2, rel: 2, cx: 2 };
    const panel = computePanel(testBench, baseline);
    const patternChips = triggered.reduce((s, p) => s + p.effects.chips_add, 0);
    const chips = computeChips(testBench, patternChips, 0);
    const mult = computeMult(triggered, 0, []);
    const finalScore = computeFinalScore(chips, mult, 0);
    return { triggered, panel, chips, mult, finalScore };
  }, [testBench, gameData.patterns]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[var(--color-surface)]/60">
        <button
          onClick={() => setScreen('title')}
          className="px-4 py-2 rounded-lg border border-white/20 text-sm hover:border-white/40 transition"
        >
          {t('collection.back')}
        </button>
        <h1 className="font-display text-2xl font-bold neon-chips">{t('collection.title')}</h1>
        <div className="w-20" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-3 border-b border-white/5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setDomainFilter(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white/10 text-white'
                : 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/5'
            }`}
          >
            {t(tab.label)}
            <span className="ml-1.5 text-[10px] opacity-60">
              {tab.key === 'components' && gameData.components.length}
              {tab.key === 'jokers' && gameData.jokers.length}
              {tab.key === 'tarots' && gameData.tarots.length}
              {tab.key === 'packs' && PACK_CATALOG.length}
              {tab.key === 'patterns' && (gameData.patterns.length + gameData.superPatterns.length)}
            </span>
          </button>
        ))}
      </div>

      {/* Content — leave room for test bench */}
      <div className="flex-1 overflow-y-auto px-6 py-4" style={{ paddingBottom: testBench.length > 0 ? 320 : 4 }}>
        {activeTab === 'components' && (
          <ComponentsTab
            components={gameData.components}
            domainFilter={domainFilter}
            setDomainFilter={setDomainFilter}
            onCardClick={addToTest}
          />
        )}
        {activeTab === 'jokers' && <JokersTab jokers={gameData.jokers} />}
        {activeTab === 'tarots' && <TarotsTab tarots={gameData.tarots} />}
        {activeTab === 'packs' && <PacksTab />}
        {activeTab === 'patterns' && (
          <PatternsTab patterns={gameData.patterns} superPatterns={gameData.superPatterns} />
        )}
      </div>

      {/* ─── Test Bench (sticky bottom) ─── */}
      {testBench.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)]/95 backdrop-blur border-t border-white/10 px-6 py-4 z-50">
          <div className="flex items-start gap-6">
            {/* Selected cards */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                  测试台 ({testBench.length}/5)
                </span>
                <button
                  onClick={clearTest}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)] hover:text-white transition"
                >
                  清空
                </button>
              </div>
              <div className="flex gap-2">
                {testBench.map((c, i) => (
                  <div key={`${c.id}-${i}`} className="cursor-pointer" onClick={() => removeFromTest(i)}>
                    <ComponentCard component={c} size="sm" />
                  </div>
                ))}
                {Array.from({ length: 5 - testBench.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-[120px] h-[160px] rounded-xl border border-dashed border-white/10 flex items-center justify-center">
                    <span className="text-[10px] text-white/20">+</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Results panel */}
            {testResult && (
              <div className="w-72 shrink-0 space-y-2">
                {/* Patterns triggered */}
                <div>
                  <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                    {t('common.patterns')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {testResult.triggered.length > 0 ? (
                      testResult.triggered.map(p => (
                        <PatternBadge key={p.id} name={p.name} desc={p.desc} />
                      ))
                    ) : (
                      <span className="text-[11px] text-[var(--color-text-muted)]">{t('play.noneDetected')}</span>
                    )}
                  </div>
                </div>

                {/* Panel values */}
                <div className="flex gap-3 text-xs">
                  <span className="text-[var(--color-perf)]">P {testResult.panel.perf.toFixed(1)}</span>
                  <span className="text-[var(--color-rel)]">R {testResult.panel.rel.toFixed(1)}</span>
                  <span className="text-[var(--color-cx)]">CX {testResult.panel.cx.toFixed(1)}</span>
                </div>

                {/* Score */}
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">{t('common.chips')}</div>
                    <div className="font-display text-lg font-bold neon-chips">{testResult.chips}</div>
                  </div>
                  <span className="text-[var(--color-text-muted)] font-display">x</span>
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">{t('common.mult')}</div>
                    <div className="font-display text-lg font-bold neon-mult">{testResult.mult.toFixed(1)}</div>
                  </div>
                  <span className="text-[var(--color-text-muted)] font-display">=</span>
                  <div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">{t('common.score')}</div>
                    <div className="font-display text-lg font-bold text-white">{testResult.finalScore}</div>
                  </div>
                </div>

                {/* Tags summary */}
                <div className="flex flex-wrap gap-1">
                  {[...new Set(testBench.flatMap(c => c.tags))].map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Components Tab ─── */

function ComponentsTab({
  components, domainFilter, setDomainFilter, onCardClick,
}: {
  components: Component[];
  domainFilter: string | null;
  setDomainFilter: (d: string | null) => void;
  onCardClick: (c: Component) => void;
}) {
  const filtered = domainFilter
    ? components.filter(c => c.domain === domainFilter)
    : components;

  const counts = Object.fromEntries(
    domains.map(d => [d, components.filter(c => c.domain === d).length])
  );

  return (
    <div>
      {/* Domain filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setDomainFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            !domainFilter ? 'bg-white/15 text-white' : 'text-[var(--color-text-muted)] hover:bg-white/5'
          }`}
        >
          {t('common.total')} ({components.length})
        </button>
        {domains.map(d => (
          <button
            key={d}
            onClick={() => setDomainFilter(domainFilter === d ? null : d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              domainFilter === d ? 'bg-white/15' : 'hover:bg-white/5'
            }`}
            style={{ color: domainColors[d] }}
          >
            {t(`domain.${d}`)} ({counts[d]})
          </button>
        ))}
      </div>

      <div className="text-[11px] text-[var(--color-text-muted)] mb-3">
        点击卡牌添加到测试台
      </div>

      {/* Cards grid */}
      <div className="flex flex-wrap gap-3">
        {filtered.map(c => (
          <div key={c.id} className="cursor-pointer" onClick={() => onCardClick(c)}>
            <ComponentCard component={c} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Jokers Tab ─── */

function JokersTab({ jokers }: { jokers: Joker[] }) {
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {jokers.map(j => (
          <div key={j.id} className="relative group">
            <JokerCard joker={j} />
            <div className="absolute left-0 top-full mt-2 z-50 w-64 p-3 rounded-lg bg-[var(--color-surface)] border border-white/10 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
              <div className="text-sm font-medium mb-1">{j.name}</div>
              <div className="text-xs text-[var(--color-text-muted)] mb-2">{j.desc}</div>
              <div className="space-y-1 text-[11px]">
                <div><span className="text-[var(--color-text-muted)]">{t('collection.effect')}:</span> <span className="text-white">{formatJokerEffect(j.effect)}</span></div>
                {hasCondition(j.condition) && (
                  <div><span className="text-[var(--color-text-muted)]">{t('collection.condition')}:</span> <span className="text-white">{formatCondition(j.condition)}</span></div>
                )}
                <div><span className="text-[var(--color-text-muted)]">{t('collection.cost')}:</span> <span className="neon-gold">${j.shop_cost}</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Tarots Tab ─── */

function TarotsTab({ tarots }: { tarots: Tarot[] }) {
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {tarots.map(tt => (
          <div key={tt.id} className="relative group">
            <TarotCard tarot={tt} showPrice />
            <div className="absolute left-0 top-full mt-2 z-50 w-64 p-3 rounded-lg bg-[var(--color-surface)] border border-white/10 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
              <div className="text-sm font-medium mb-1">{tt.name}</div>
              <div className="text-xs text-[var(--color-text-muted)] mb-2">{tt.desc}</div>
              <div className="space-y-1 text-[11px]">
                <div><span className="text-[var(--color-text-muted)]">{t('collection.effect')}:</span> <span className="text-white">{formatTarotEffect(tt.effect)}</span></div>
                <div><span className="text-[var(--color-text-muted)]">{t('collection.cost')}:</span> <span className="neon-gold">${tt.shop_cost}</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Packs Tab ─── */

function PacksTab() {
  return (
    <div>
      <div className="text-[11px] text-[var(--color-text-muted)] mb-3">
        {t('collection.packsHint')}
      </div>
      <div className="flex flex-wrap gap-4">
        {PACK_CATALOG.map(pack => (
          <div key={pack.id} className="relative group">
            <TarotPack pack={pack} showPrice />
            <div className="absolute left-0 top-full mt-2 z-50 w-56 p-3 rounded-lg bg-[var(--color-surface)] border border-white/10 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
              <div className="text-sm font-medium mb-1">{pack.name}</div>
              <div className="space-y-1 text-[11px]">
                <div>
                  <span className="text-[var(--color-text-muted)]">{t('collection.cost')}:</span>{' '}
                  <span className="neon-gold">${pack.price}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">{t('collection.packCards')}:</span>{' '}
                  <span className="text-white">{pack.cardCount} {t('collection.packCardsUnit')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Patterns Tab ─── */

function PatternsTab({ patterns, superPatterns }: { patterns: Pattern[]; superPatterns: SuperPattern[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg font-bold mb-3">{t('common.patterns')} ({patterns.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {patterns.map(p => (
            <div key={p.id} className="rounded-xl bg-[var(--color-surface)] border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <PatternBadge name={p.name} />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">{p.desc}</p>
              <div className="flex gap-4 text-[11px]">
                <span className="neon-chips">+{p.effects.chips_add} {t('common.chips')}</span>
                <span className="neon-mult">+{p.effects.mult_add} {t('common.mult')}</span>
              </div>
              {(p.requires_all_tags.length > 0 || p.requires_any_tags.length > 0) && (
                <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                  {p.requires_all_tags.length > 0 && (
                    <div>ALL: {p.requires_all_tags.join(' + ')}</div>
                  )}
                  {p.requires_any_tags.length > 0 && (
                    <div>ANY: {p.requires_any_tags.join(' / ')}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold mb-3 neon-gold">
          {t('settlement.superPatterns')} ({superPatterns.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {superPatterns.map(sp => (
            <div key={sp.id} className="rounded-xl bg-[var(--color-surface)] border border-yellow-500/30 p-4">
              <div className="text-sm font-bold neon-gold mb-1">{sp.name}</div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">{sp.desc}</p>
              <div className="space-y-1 text-[11px]">
                <div>
                  <span className="text-[var(--color-text-muted)]">{t('collection.trigger')}:</span>{' '}
                  <span className="text-white">{formatTrigger(sp.trigger)}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">{t('collection.reward')}:</span>{' '}
                  <span className="neon-gold">{formatReward(sp.reward)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Formatters ─── */

function formatJokerEffect(effect: Joker['effect']): string {
  switch (effect.type) {
    case 'mult': return `x${effect.value} 倍率`;
    case 'chips': return effect.per_tag ? `每张 [${effect.per_tag}] +${effect.value} 筹码` : `+${effect.value} 筹码`;
    case 'pattern_enhance': return `牌型额外 +${effect.extra_mult} 倍率`;
    case 'hand_size': return `手牌 +${effect.value}`;
    case 'discard': return `弃牌次数 +${effect.value}`;
    case 'gold': return `每${effect.per === 'pattern' ? '牌型' : '阶段'} +${effect.value} 金币`;
    case 'combo_mult': return `${effect.min_patterns}+ 牌型时 x${effect.value} 倍率`;
    default: return JSON.stringify(effect);
  }
}

function hasCondition(cond: Joker['condition']): boolean {
  return cond.require_all_tags.length > 0 || cond.require_any_tags.length > 0 || !!cond.special;
}

function formatCondition(cond: Joker['condition']): string {
  const parts: string[] = [];
  if (cond.require_all_tags.length > 0) parts.push(`需要: ${cond.require_all_tags.join(' + ')}`);
  if (cond.require_any_tags.length > 0) parts.push(`任一: ${cond.require_any_tags.join(' / ')}`);
  if (cond.special) parts.push(cond.special);
  return parts.join('; ');
}

function formatTarotEffect(effect: Tarot['effect']): string {
  switch (effect.type) {
    case 'add_tag': return `给 [${effect.target_tag}] 加 ${effect.add_tag} 标签`;
    case 'add_chips': return `给 [${effect.target_tag}] +${effect.chips} 筹码`;
    case 'change_domain': return `${effect.from_domain} → ${effect.to_domain}`;
    case 'reduce_cost': return `[${effect.target_tag}] 容量 -${effect.amount}`;
    default: return JSON.stringify(effect);
  }
}

function formatTrigger(trigger: SuperPattern['trigger']): string {
  switch (trigger.type) {
    case 'pattern_count': return `触发 ${trigger.min_patterns}+ 个牌型`;
    case 'budget_and_pattern': return `容量 <${trigger.max_budget_usage_percent}% 且 ${trigger.min_patterns}+ 牌型`;
    case 'domain_count': return `${trigger.min_domains}+ 域 且 ${trigger.min_patterns}+ 牌型`;
    default: return JSON.stringify(trigger);
  }
}

function formatReward(reward: SuperPattern['reward']): string {
  switch (reward.type) {
    case 'mult_burst': return `+${reward.mult_add} 倍率`;
    case 'chips_burst': return `+${reward.chips_add} 筹码`;
    case 'capacity_refund': return `退还 ${reward.refund_amount} 容量`;
    case 'gold_burst': return `+${reward.gold} 金币`;
    default: return JSON.stringify(reward);
  }
}
