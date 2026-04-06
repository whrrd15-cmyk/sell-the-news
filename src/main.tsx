import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 벤치마크 모드: 디버그 훅 노출 (?benchmark=1 시에만)
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('benchmark')) {
  import('./stores/gameStore').then(({ useGameStore }) => {
    ;(window as unknown as { __gameStore: typeof useGameStore }).__gameStore = useGameStore
  })
  import('./stores/marketStore').then(({ useMarketStore }) => {
    ;(window as unknown as { __marketStore: typeof useMarketStore }).__marketStore = useMarketStore
  })
  import('./stores/timeStore').then(({ useTimeStore }) => {
    ;(window as unknown as { __timeStore: typeof useTimeStore }).__timeStore = useTimeStore
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
