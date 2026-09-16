import { useGame } from './state/gameStore';
import { Embers } from './components/Embers';
import { MusicPlayer } from './components/MusicPlayer';
import { SettingsPanel } from './components/SettingsPanel';
import { TitleScreen } from './screens/TitleScreen';
import { StoryScreen } from './screens/StoryScreen';
import { BondScreen } from './screens/BondScreen';
import { HubScreen } from './screens/HubScreen';
import { SkillScreen } from './screens/SkillScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { ShopScreen } from './screens/ShopScreen';
import { BattleScreen } from './screens/BattleScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { EndingScreen } from './screens/EndingScreen';

function CurrentScreen() {
  const screen = useGame((s) => s.screen);
  switch (screen) {
    case 'title': return <TitleScreen />;
    case 'story': return <StoryScreen />;
    case 'bond': return <BondScreen />;
    case 'hub': return <HubScreen />;
    case 'skills': return <SkillScreen />;
    case 'inventory': return <InventoryScreen />;
    case 'shop': return <ShopScreen />;
    case 'battle': return <BattleScreen />;
    case 'results': return <ResultsScreen />;
    case 'ending': return <EndingScreen />;
  }
}

export default function App() {
  return (
    <>
      <Embers />
      <CurrentScreen />
      <MusicPlayer />
      <SettingsPanel />
    </>
  );
}
