import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from './stores/gameStore'
import { TitleScreen } from './components/layout/TitleScreen'
import { GameScreen } from './components/layout/GameScreen'
import { TradingTerminal } from './components/layout/TradingTerminal'
import { ResultScreen } from './components/layout/ResultScreen'
import { ShopScreen } from './components/layout/ShopScreen'
import { MetaUpgradeScreen } from './components/layout/MetaUpgradeScreen'
import { SettingsScreen } from './components/layout/SettingsScreen'
import { ClearScreen } from './components/layout/ClearScreen'
import { OnboardingScreen } from './components/layout/OnboardingScreen'
import { StockPickerScreen } from './components/layout/StockPickerScreen'
import { CRTOverlay } from './components/effects/CRTOverlay'
import { FEATURES } from './data/features'
import './index.css'

const SCREEN_COMPONENTS: Record<string, React.FC> = {
  title: TitleScreen,
  onboarding: OnboardingScreen,
  stockpicker: StockPickerScreen,
  game: FEATURES.MULTI_WINDOW_UI ? TradingTerminal : GameScreen,
  shop: ShopScreen,
  result: ResultScreen,
  meta: MetaUpgradeScreen,
  settings: SettingsScreen,
  clear: ClearScreen,
}

function App() {
  const screen = useGameStore((s) => s.screen)
  const Screen = SCREEN_COMPONENTS[screen]

  return (
    <div className="min-h-screen bg-bal-bg font-pixel">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="min-h-screen"
        >
          {Screen && <Screen />}
        </motion.div>
      </AnimatePresence>
      <CRTOverlay />
    </div>
  )
}

export default App
