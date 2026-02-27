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
import { cardLore } from '../data/cardLore';
import type { Component, Joker, Tarot, Pattern, SuperPattern, Platform } from '../../schemas/index.js';
import type { PackType } from '../components/TarotPack';

const platformColors: Record<string, string> = {
  generic: '#9ca3af',
  aws: '#FF9900',
  gcp: '#4285F4',
  azure: '#0078D4',
  selfhosted: '#6B7280',
};
const platformLabels: Record<string, string> = {
  generic: '通用',
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  selfhosted: '自建',
};

type Tab = 'components' | 'jokers' | 'tarots' | 'packs' | 'patterns';

const tabs: { key: Tab; label: string }[] = [
  { key: 'components', label: 'collection.tab.components' },
  { key: 'jokers', label: 'collection.tab.jokers' },
  { key: 'tarots', label: 'collection.tab.tarots' },
  { key: 'packs', label: 'collection.tab.packs' },
  { key: 'patterns', label: 'collection.tab.patterns' },
];

const domains = ['compute', 'data', 'network', 'defense', 'platform'] as const;

type SelectedItem =
  | { type: 'component'; data: Component }
  | { type: 'joker'; data: Joker }
  | { type: 'tarot'; data: Tarot }
  | { type: 'pack'; data: PackType };

export default function CollectionScreen() {
  const { gameData } = useGameStore();
  const setScreen = useGameStore(s => s.setScreen);
  const [activeTab, setActiveTab] = useState<Tab>('components');
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [testBench, setTestBench] = useState<Component[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);

  const addToTest = (c: Component) => {
    if (testBench.length < 5 && !testBench.some((t, _) => t === c)) {
      setTestBench(prev => [...prev, c]);
    }
  };
  const removeFromTest = (index: number) => {
    setTestBench(prev => prev.filter((_, i) => i !== index));
  };
  const clearTest = () => setTestBench([]);

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

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setDomainFilter(null);
    setPlatformFilter(null);
    setSelected(null);
  };

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
            onClick={() => handleTabChange(tab.key)}
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

      {/* Main content: left grid + right detail panel */}
      <div className="flex-1 flex overflow-hidden" style={{ paddingBottom: testBench.length > 0 ? 220 : 0 }}>
        {/* Left: card grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'components' && (
            <ComponentsTab
              components={gameData.components}
              platforms={gameData.platforms}
              domainFilter={domainFilter}
              setDomainFilter={setDomainFilter}
              platformFilter={platformFilter}
              setPlatformFilter={setPlatformFilter}
              selectedId={selected?.type === 'component' ? selected.data.id : null}
              onSelect={(c) => setSelected({ type: 'component', data: c })}
            />
          )}
          {activeTab === 'jokers' && (
            <JokersTab
              jokers={gameData.jokers}
              selectedId={selected?.type === 'joker' ? selected.data.id : null}
              onSelect={(j) => setSelected({ type: 'joker', data: j })}
            />
          )}
          {activeTab === 'tarots' && (
            <TarotsTab
              tarots={gameData.tarots}
              selectedId={selected?.type === 'tarot' ? selected.data.id : null}
              onSelect={(tt) => setSelected({ type: 'tarot', data: tt })}
            />
          )}
          {activeTab === 'packs' && (
            <PacksTab
              selectedId={selected?.type === 'pack' ? selected.data.id : null}
              onSelect={(p) => setSelected({ type: 'pack', data: p })}
            />
          )}
          {activeTab === 'patterns' && (
            <PatternsTab patterns={gameData.patterns} superPatterns={gameData.superPatterns} />
          )}
        </div>

        {/* Right: detail panel (hidden for patterns tab) */}
        {activeTab !== 'patterns' && (
          <div className="w-[360px] shrink-0 border-l border-white/10 overflow-y-auto bg-[var(--color-surface)]/40">
            {selected ? (
              <DetailPanel
                item={selected}
                onAddToTest={activeTab === 'components' ? addToTest : undefined}
                testBenchFull={testBench.length >= 5}
              />
            ) : (
              <EmptyDetail tab={activeTab} counts={{
                components: gameData.components.length,
                jokers: gameData.jokers.length,
                tarots: gameData.tarots.length,
                packs: PACK_CATALOG.length,
              }} />
            )}
          </div>
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
                <div>
                  <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                    {t('common.patterns')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {testResult.triggered.length > 0 ? (
                      testResult.triggered.map(p => (
                        <PatternBadge key={p.id} name={p.name} desc={p.desc} platform={p.platform} />
                      ))
                    ) : (
                      <span className="text-[11px] text-[var(--color-text-muted)]">{t('play.noneDetected')}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 text-xs">
                  <span className="text-[var(--color-perf)]">P {testResult.panel.perf.toFixed(1)}</span>
                  <span className="text-[var(--color-rel)]">R {testResult.panel.rel.toFixed(1)}</span>
                  <span className="text-[var(--color-cx)]">CX {testResult.panel.cx.toFixed(1)}</span>
                </div>

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

/* ─── Detail Panel ─── */

function DetailPanel({
  item,
  onAddToTest,
  testBenchFull,
}: {
  item: SelectedItem;
  onAddToTest?: (c: Component) => void;
  testBenchFull: boolean;
}) {
  const lore = cardLore[getItemId(item)];

  return (
    <div className="p-5 space-y-4">
      {/* Color bar */}
      <div
        className="h-1 rounded-full"
        style={{ backgroundColor: getItemColor(item) }}
      />

      {/* Name */}
      <h2 className="text-lg font-bold">{getItemName(item)}</h2>

      {/* Stats section */}
      <div className="space-y-2">
        {item.type === 'component' && <ComponentStats component={item.data} />}
        {item.type === 'joker' && <JokerStats joker={item.data} />}
        {item.type === 'tarot' && <TarotStats tarot={item.data} />}
        {item.type === 'pack' && <PackStats pack={item.data} />}
      </div>

      {/* Add to test bench button */}
      {item.type === 'component' && onAddToTest && (
        <button
          onClick={() => onAddToTest(item.data)}
          disabled={testBenchFull}
          className={`w-full py-2 rounded-lg text-sm font-medium transition ${
            testBenchFull
              ? 'bg-white/5 text-[var(--color-text-muted)] cursor-not-allowed'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {testBenchFull ? '测试台已满 (5/5)' : '添加到测试台'}
        </button>
      )}

      {/* Lore section */}
      {lore && (
        <div className="border-t border-white/10 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider">典故</span>
            <span className="text-xs opacity-40">ⓘ</span>
          </div>
          <p className="text-sm font-medium text-white/90 leading-relaxed">{lore.l2}</p>
          <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">{lore.l3}</p>
        </div>
      )}
    </div>
  );
}

function ComponentStats({ component }: { component: Component }) {
  const domainColor = domainColors[component.domain] ?? '#888';
  const platColor = platformColors[component.platform] ?? '#888';
  const platLabel = platformLabels[component.platform] ?? component.platform;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
          style={{ backgroundColor: domainColor + '30', color: domainColor }}
        >
          {t(`domain.${component.domain}`)}
        </span>
        {component.platform !== 'generic' && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: platColor + '25', color: platColor }}
          >
            {platLabel}
          </span>
        )}
        <span className="text-[10px] text-[var(--color-text-muted)]">{component.rarity}</span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{component.desc}</p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[var(--color-text-muted)]">{t('common.chips')}: </span>
          <span className="neon-chips font-display">+{component.base_chips}</span>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">{t('card.cap')}: </span>
          <span className="font-display">{component.capacity_cost}</span>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        {component.delta.perf !== 0 && (
          <span className="text-[var(--color-perf)]">P {component.delta.perf > 0 ? '+' : ''}{component.delta.perf}</span>
        )}
        {component.delta.rel !== 0 && (
          <span className="text-[var(--color-rel)]">R {component.delta.rel > 0 ? '+' : ''}{component.delta.rel}</span>
        )}
        {component.delta.cx !== 0 && (
          <span className="text-[var(--color-cx)]">CX {component.delta.cx > 0 ? '+' : ''}{component.delta.cx}</span>
        )}
        {component.delta.perf === 0 && component.delta.rel === 0 && component.delta.cx === 0 && (
          <span className="text-[var(--color-text-muted)]">无面板增量</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {component.tags.map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)]">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function JokerStats({ joker }: { joker: Joker }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[var(--color-text-muted)]">{joker.rarity}</span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{joker.desc}</p>
      <div className="space-y-1 text-xs">
        <div>
          <span className="text-[var(--color-text-muted)]">{t('collection.effect')}: </span>
          <span className="text-white">{formatJokerEffect(joker.effect)}</span>
        </div>
        {hasCondition(joker.condition) && (
          <div>
            <span className="text-[var(--color-text-muted)]">{t('collection.condition')}: </span>
            <span className="text-white">{formatCondition(joker.condition)}</span>
          </div>
        )}
        <div>
          <span className="text-[var(--color-text-muted)]">{t('collection.cost')}: </span>
          <span className="neon-gold">${joker.shop_cost}</span>
        </div>
      </div>
    </div>
  );
}

function TarotStats({ tarot }: { tarot: Tarot }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--color-text-muted)]">{tarot.desc}</p>
      <div className="space-y-1 text-xs">
        <div>
          <span className="text-[var(--color-text-muted)]">{t('collection.effect')}: </span>
          <span className="text-white">{formatTarotEffect(tarot.effect)}</span>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">{t('collection.cost')}: </span>
          <span className="neon-gold">${tarot.shop_cost}</span>
        </div>
      </div>
    </div>
  );
}

function PackStats({ pack }: { pack: PackType }) {
  return (
    <div className="space-y-2">
      <div className="space-y-1 text-xs">
        <div>
          <span className="text-[var(--color-text-muted)]">{t('collection.cost')}: </span>
          <span className="neon-gold">${pack.price}</span>
        </div>
        <div>
          <span className="text-[var(--color-text-muted)]">包含: </span>
          <span className="text-white">{pack.cardCount} 张塔罗牌</span>
        </div>
      </div>
    </div>
  );
}

function EmptyDetail({ tab, counts }: { tab: Tab; counts: Record<string, number> }) {
  const hints: Record<Tab, string> = {
    components: `共 ${counts.components} 张组件卡，分布在 5 个 Domain。点击卡牌查看详情与典故。`,
    jokers: `共 ${counts.jokers} 张 Joker，提供跨阶段持久增益。点击卡牌查看详情。`,
    tarots: `共 ${counts.tarots} 张塔罗牌，一次性使用，永久修改目标组件。`,
    packs: `共 ${counts.packs} 种卡包，每种以一本真实技术书命名。`,
    patterns: '',
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <p className="text-sm text-[var(--color-text-muted)] text-center leading-relaxed">
        {hints[tab]}
      </p>
    </div>
  );
}

/* ─── Helper functions for detail panel ─── */

function getItemId(item: SelectedItem): string {
  return item.data.id;
}

function getItemName(item: SelectedItem): string {
  return item.data.name;
}

function getItemColor(item: SelectedItem): string {
  if (item.type === 'component') return domainColors[item.data.domain] ?? '#888';
  if (item.type === 'joker') return '#a855f7';
  if (item.type === 'tarot') return '#6366f1';
  return '#f59e0b';
}

/* ─── Components Tab ─── */

function ComponentsTab({
  components, platforms, domainFilter, setDomainFilter, platformFilter, setPlatformFilter, selectedId, onSelect,
}: {
  components: Component[];
  platforms: Platform[];
  domainFilter: string | null;
  setDomainFilter: (d: string | null) => void;
  platformFilter: string | null;
  setPlatformFilter: (p: string | null) => void;
  selectedId: string | null;
  onSelect: (c: Component) => void;
}) {
  const afterPlatform = platformFilter
    ? components.filter(c => c.platform === platformFilter)
    : components;
  const filtered = domainFilter
    ? afterPlatform.filter(c => c.domain === domainFilter)
    : afterPlatform;

  const domainCounts = Object.fromEntries(
    domains.map(d => [d, afterPlatform.filter(c => c.domain === d).length])
  );

  const platformKeys = ['generic', ...platforms.map(p => p.id)] as const;
  const platformCounts = Object.fromEntries(
    platformKeys.map(p => [p, components.filter(c => c.platform === p).length])
  );

  return (
    <div>
      {/* Platform filter */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setPlatformFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            !platformFilter ? 'bg-white/15 text-white' : 'text-[var(--color-text-muted)] hover:bg-white/5'
          }`}
        >
          全部 ({components.length})
        </button>
        {platformKeys.map(p => (
          <button
            key={p}
            onClick={() => setPlatformFilter(platformFilter === p ? null : p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              platformFilter === p ? 'bg-white/15' : 'hover:bg-white/5'
            }`}
            style={{ color: platformColors[p] }}
          >
            {platformLabels[p]} ({platformCounts[p]})
          </button>
        ))}
      </div>

      {/* Domain filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setDomainFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            !domainFilter ? 'bg-white/15 text-white' : 'text-[var(--color-text-muted)] hover:bg-white/5'
          }`}
        >
          {t('common.total')} ({afterPlatform.length})
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
            {t(`domain.${d}`)} ({domainCounts[d]})
          </button>
        ))}
      </div>

      <div className="text-[11px] text-[var(--color-text-muted)] mb-3">
        点击卡牌查看详情，在右侧面板添加到测试台
      </div>

      {/* Cards grid */}
      <div className="flex flex-wrap gap-3">
        {filtered.map(c => (
          <div
            key={c.id}
            className={`rounded-xl transition ${selectedId === c.id ? 'ring-2' : ''}`}
            style={selectedId === c.id ? { ringColor: domainColors[c.domain] } : undefined}
          >
            <ComponentCard
              component={c}
              selected={selectedId === c.id}
              onClick={() => onSelect(c)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Jokers Tab ─── */

function JokersTab({
  jokers, selectedId, onSelect,
}: {
  jokers: Joker[];
  selectedId: string | null;
  onSelect: (j: Joker) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {jokers.map(j => (
        <div
          key={j.id}
          className={`rounded-xl transition ${selectedId === j.id ? 'ring-2 ring-purple-500' : ''}`}
        >
          <JokerCard joker={j} onClick={() => onSelect(j)} />
        </div>
      ))}
    </div>
  );
}

/* ─── Tarots Tab ─── */

function TarotsTab({
  tarots, selectedId, onSelect,
}: {
  tarots: Tarot[];
  selectedId: string | null;
  onSelect: (tt: Tarot) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {tarots.map(tt => (
        <div
          key={tt.id}
          className={`rounded-xl transition ${selectedId === tt.id ? 'ring-2 ring-indigo-500' : ''}`}
        >
          <TarotCard tarot={tt} showPrice onClick={() => onSelect(tt)} />
        </div>
      ))}
    </div>
  );
}

/* ─── Packs Tab ─── */

function PacksTab({
  selectedId, onSelect,
}: {
  selectedId: string | null;
  onSelect: (p: PackType) => void;
}) {
  return (
    <div>
      <div className="text-[11px] text-[var(--color-text-muted)] mb-3">
        {t('collection.packsHint')}
      </div>
      <div className="flex flex-wrap gap-4">
        {PACK_CATALOG.map(pack => (
          <div
            key={pack.id}
            className={`rounded-lg transition ${selectedId === pack.id ? 'ring-2 ring-amber-500' : ''}`}
          >
            <TarotPack pack={pack} showPrice onClick={() => onSelect(pack)} />
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
                <PatternBadge name={p.name} platform={p.platform} />
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
