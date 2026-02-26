import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import ComponentCard from '../components/ComponentCard';
import JokerCard from '../components/JokerCard';
import TarotCard from '../components/TarotCard';
import TarotPack, { PACK_CATALOG } from '../components/TarotPack';
import GoldDisplay from '../components/GoldDisplay';
import { t } from '../i18n';

function getComponentPrice(rarity: string): number {
  switch (rarity) {
    case 'rare': return 8;
    case 'uncommon': return 5;
    default: return 3;
  }
}

function getSellValue(rarity: string): number {
  return Math.floor(getComponentPrice(rarity) / 2);
}

export default function ShopScreen() {
  const {
    gameState,
    shopInventory,
    openedPack,
    shopBuyComponent,
    shopSellComponent,
    shopBuyJoker,
    shopSellJoker,
    shopBuyTarotPack,
    shopSelectFromPack,
    shopClosePack,
    shopRemoveComponent,
    closeShop,
  } = useGameStore();

  if (!gameState || !shopInventory) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left sidebar */}
      <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-white/5 p-4 bg-[var(--color-surface)]/40 flex flex-col">
        <h2 className="text-xl font-medium mb-4">{t('shop.title')}</h2>
        <GoldDisplay amount={gameState.gold} />

        <div className="mt-4 space-y-2 text-sm text-[var(--color-text-muted)]">
          <div className="flex justify-between">
            <span>{t('common.components')}</span>
            <span>{gameState.componentPool.length}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('common.jokers')}</span>
            <span>{gameState.jokerSlots.length}/{gameState.jokerSlotMax}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('common.tarots')}</span>
            <span>{gameState.tarotHand.length}/{gameState.tarotHandMax}</span>
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={closeShop}
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-chips)] text-black font-bold hover:brightness-110 transition shadow-[var(--glow-chips)]"
          >
            {t('shop.nextRound')}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* For sale: Jokers + Tarot Packs */}
        <div className="mb-8">
          <h3 className="text-sm text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            {t('shop.jokersAndPacks')}
          </h3>
          <div className="flex gap-3 flex-wrap">
            {shopInventory.jokers.map((joker, i) => (
              <motion.div
                key={joker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <JokerCard
                  joker={joker}
                  showPrice
                  onClick={() => shopBuyJoker(joker)}
                />
              </motion.div>
            ))}
            {shopInventory.packIndices.map((catalogIdx, i) => {
              const pack = PACK_CATALOG[catalogIdx];
              if (!pack) return null;
              const canAfford = gameState.gold >= pack.price;
              const tarotFull = gameState.tarotHand.length >= gameState.tarotHandMax;
              return (
                <motion.div
                  key={`pack-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (shopInventory.jokers.length + i) * 0.08 }}
                >
                  <TarotPack
                    pack={pack}
                    showPrice
                    disabled={!canAfford || tarotFull}
                    onClick={() => shopBuyTarotPack(i)}
                  />
                </motion.div>
              );
            })}
            {shopInventory.jokers.length === 0 && shopInventory.packIndices.length === 0 && (
              <span className="text-sm text-[var(--color-text-muted)]">{t('shop.soldOut')}</span>
            )}
          </div>
        </div>

        {/* For sale: Components */}
        <div className="mb-8">
          <h3 className="text-sm text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            {t('shop.componentsForSale')}
          </h3>
          <div className="flex gap-3 flex-wrap">
            {shopInventory.components.map((component, i) => (
              <motion.div
                key={component.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <ComponentCard
                  component={component}
                  showPrice={getComponentPrice(component.rarity)}
                  onClick={() => shopBuyComponent(component)}
                />
              </motion.div>
            ))}
            {shopInventory.components.length === 0 && (
              <span className="text-sm text-[var(--color-text-muted)]">{t('shop.soldOut')}</span>
            )}
          </div>
        </div>

        {/* Owned: Sell/Remove */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-sm text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            {t('shop.yourInventory')}
          </h3>

          {/* Owned jokers */}
          {gameState.jokerSlots.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('common.jokers')}</div>
              <div className="flex gap-2 flex-wrap">
                {gameState.jokerSlots.map(joker => (
                  <div key={joker.id} className="relative group">
                    <JokerCard joker={joker} onClick={() => shopSellJoker(joker)} />
                    <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                      <span className="text-red-400 text-xs font-display">
                        {t('shop.sell')} ${Math.floor(joker.shop_cost / 2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owned components */}
          {gameState.componentPool.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('common.components')}</div>
              <div className="flex gap-2 flex-wrap">
                {gameState.componentPool.map(component => (
                  <div key={component.id} className="relative group">
                    <ComponentCard component={component} size="sm" onClick={() => shopSellComponent(component)} />
                    <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                      <span className="text-red-400 text-xs font-display">
                        {t('shop.sell')} ${getSellValue(component.rarity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Owned tarots */}
          {gameState.tarotHand.length > 0 && (
            <div>
              <div className="text-xs text-[var(--color-text-muted)] mb-2">{t('common.tarots')}</div>
              <div className="flex gap-2 flex-wrap">
                {gameState.tarotHand.map((tarot, i) => (
                  <div key={`${tarot.id}-${i}`}>
                    <TarotCard tarot={tarot} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Pack Opening Modal ─── */}
      <AnimatePresence>
        {openedPack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={shopClosePack}
          >
            <div className="flex flex-col items-center" onClick={e => e.stopPropagation()}>
              {/* Book opening animation */}
              <div className="relative mb-8" style={{ perspective: 1000 }}>
                {/* Book cover — flips open to the left */}
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: -160 }}
                  transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                  style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                  className="relative z-10"
                >
                  <img
                    src={openedPack.pack.cover}
                    alt={openedPack.pack.name}
                    className="w-[180px] h-[260px] rounded-lg object-cover"
                    style={{
                      boxShadow: '3px 3px 10px rgba(0,0,0,0.5)',
                      backfaceVisibility: 'hidden',
                    }}
                  />
                </motion.div>

                {/* Book pages underneath (visible when cover flips) */}
                <div
                  className="absolute top-0 left-0 w-[180px] h-[260px] rounded-lg overflow-hidden"
                  style={{
                    background: '#f5f0e6',
                    boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.15)',
                    borderLeft: '4px solid #c8c0b0',
                  }}
                >
                  {/* Page lines */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="mx-5 my-3 h-[1px]"
                      style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
                    />
                  ))}
                </div>
              </div>

              {/* Pick one hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-[var(--color-text-muted)] mb-4"
              >
                {t('shop.pickOne')}
              </motion.p>

              {/* Cards emerge from the book */}
              <div className="flex gap-4">
                {openedPack.tarots.map((tarot, i) => {
                  const total = openedPack.tarots.length;
                  const mid = (total - 1) / 2;
                  const offset = (i - mid) * 8;
                  return (
                    <motion.div
                      key={tarot.id}
                      initial={{ opacity: 0, y: -120, scale: 0.6, rotate: offset * 2 }}
                      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                      transition={{
                        delay: 0.4 + i * 0.15,
                        duration: 0.45,
                        type: 'spring',
                        stiffness: 200,
                        damping: 18,
                      }}
                      whileHover={{ y: -12, scale: 1.05 }}
                      className="cursor-pointer"
                    >
                      <TarotCard
                        tarot={tarot}
                        onClick={() => shopSelectFromPack(tarot)}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Skip button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={shopClosePack}
                className="text-sm text-[var(--color-text-muted)] hover:text-white transition mt-6"
              >
                {t('shop.skipPack')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
