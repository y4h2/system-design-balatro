import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import TitleScreen from './screens/TitleScreen';
import DraftScreen from './screens/DraftScreen';
import BlindSelectScreen from './screens/BlindSelectScreen';
import PlayScreen from './screens/PlayScreen';
import SettlementScreen from './screens/SettlementScreen';
import ShopScreen from './screens/ShopScreen';
import GameOverScreen from './screens/GameOverScreen';

const screens: Record<string, React.FC> = {
  title: TitleScreen,
  draft: DraftScreen,
  blindSelect: BlindSelectScreen,
  play: PlayScreen,
  settlement: SettlementScreen,
  shop: ShopScreen,
  gameOver: GameOverScreen,
};

export default function App() {
  const currentScreen = useGameStore(s => s.currentScreen);
  const Screen = screens[currentScreen];

  return (
    <div className="min-h-screen felt-bg text-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen"
        >
          <Screen />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
