import { useGameStore } from './store/gameStore';
import TitleScreen from './screens/TitleScreen';
import DraftScreen from './screens/DraftScreen';
import BlindSelectScreen from './screens/BlindSelectScreen';
import PlayScreen from './screens/PlayScreen';
import SettlementScreen from './screens/SettlementScreen';
import ShopScreen from './screens/ShopScreen';
import GameOverScreen from './screens/GameOverScreen';

function ScreenRouter() {
  const currentScreen = useGameStore(s => s.currentScreen);
  switch (currentScreen) {
    case 'title': return <TitleScreen />;
    case 'draft': return <DraftScreen />;
    case 'blindSelect': return <BlindSelectScreen />;
    case 'play': return <PlayScreen />;
    case 'settlement': return <SettlementScreen />;
    case 'shop': return <ShopScreen />;
    case 'gameOver': return <GameOverScreen />;
  }
}

export default function App() {
  return (
    <div className="min-h-screen felt-bg text-white">
      <ScreenRouter />
    </div>
  );
}
