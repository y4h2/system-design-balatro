import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import ComponentCard from '../components/ComponentCard';
import JokerCard from '../components/JokerCard';
import TarotCard from '../components/TarotCard';
import GoldDisplay from '../components/GoldDisplay';

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
    shopBuyComponent,
    shopSellComponent,
    shopBuyJoker,
    shopSellJoker,
    shopBuyTarot,
    shopRemoveComponent,
    closeShop,
  } = useGameStore();

  if (!gameState || !shopInventory) return null;

  return (
    <div className="min-h-screen flex">
      {/* Left sidebar */}
      <div className="w-56 border-r border-white/5 p-4 bg-[var(--color-surface)]/40 flex flex-col">
        <h2 className="text-xl font-medium mb-4">Shop</h2>
        <GoldDisplay amount={gameState.gold} />

        <div className="mt-4 space-y-2 text-sm text-[var(--color-text-muted)]">
          <div className="flex justify-between">
            <span>Components</span>
            <span>{gameState.componentPool.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Jokers</span>
            <span>{gameState.jokerSlots.length}/{gameState.jokerSlotMax}</span>
          </div>
          <div className="flex justify-between">
            <span>Tarots</span>
            <span>{gameState.tarotHand.length}/{gameState.tarotHandMax}</span>
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={closeShop}
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-chips)] text-black font-bold hover:brightness-110 transition shadow-[var(--glow-chips)]"
          >
            Next Round
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* For sale: Jokers + Tarots */}
        <div className="mb-8">
          <h3 className="text-sm text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Jokers & Tarots for Sale
          </h3>
          <div className="flex gap-3 flex-wrap">
            {shopInventory.jokers.map((joker, i) => (
              <motion.div
                key={joker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="w-48"
              >
                <JokerCard
                  joker={joker}
                  showPrice
                  onClick={() => shopBuyJoker(joker)}
                />
              </motion.div>
            ))}
            {shopInventory.tarots.map((tarot, i) => (
              <motion.div
                key={tarot.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (shopInventory.jokers.length + i) * 0.08 }}
                className="w-48"
              >
                <TarotCard
                  tarot={tarot}
                  showPrice
                  onClick={() => shopBuyTarot(tarot)}
                />
              </motion.div>
            ))}
            {shopInventory.jokers.length === 0 && shopInventory.tarots.length === 0 && (
              <span className="text-sm text-[var(--color-text-muted)]">Sold out</span>
            )}
          </div>
        </div>

        {/* For sale: Components */}
        <div className="mb-8">
          <h3 className="text-sm text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Components for Sale
          </h3>
          <div className="flex gap-3 flex-wrap">
            {shopInventory.components.map((component, i) => (
              <motion.div
                key={component.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="w-48"
              >
                <ComponentCard
                  component={component}
                  showPrice={getComponentPrice(component.rarity)}
                  onClick={() => shopBuyComponent(component)}
                />
              </motion.div>
            ))}
            {shopInventory.components.length === 0 && (
              <span className="text-sm text-[var(--color-text-muted)]">Sold out</span>
            )}
          </div>
        </div>

        {/* Owned: Sell/Remove */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-sm text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Your Inventory (click to sell)
          </h3>

          {/* Owned jokers */}
          {gameState.jokerSlots.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-[var(--color-text-muted)] mb-2">Jokers</div>
              <div className="flex gap-2 flex-wrap">
                {gameState.jokerSlots.map(joker => (
                  <div key={joker.id} className="w-44 relative group">
                    <JokerCard joker={joker} onClick={() => shopSellJoker(joker)} />
                    <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                      <span className="text-red-400 text-xs font-display">
                        Sell ${Math.floor(joker.shop_cost / 2)}
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
              <div className="text-xs text-[var(--color-text-muted)] mb-2">Components</div>
              <div className="flex gap-2 flex-wrap">
                {gameState.componentPool.map(component => (
                  <div key={component.id} className="w-40 relative group">
                    <ComponentCard component={component} size="sm" onClick={() => shopSellComponent(component)} />
                    <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                      <span className="text-red-400 text-xs font-display">
                        Sell ${getSellValue(component.rarity)}
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
              <div className="text-xs text-[var(--color-text-muted)] mb-2">Tarots</div>
              <div className="flex gap-2 flex-wrap">
                {gameState.tarotHand.map((tarot, i) => (
                  <div key={`${tarot.id}-${i}`} className="w-44">
                    <TarotCard tarot={tarot} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
