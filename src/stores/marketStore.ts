import { create } from 'zustand'
import type { MarketCondition, WeeklyRule } from '../data/types'
import { tickMarket, type MarketState, createInitialMarketState, generatePreviousQuarter } from '../engine/market'
import { detectSectorConditions } from '../engine/marketCondition'
import type { ClockEvent } from '../engine/clock'
import type { RunConfig } from '../data/types'

interface RealtimeMarketState {
  market: MarketState
  marketConditions: Record<string, MarketCondition>
  dangerLevel: number
  currentWeeklyRule: WeeklyRule | null

  // 액션
  initialize: (config: RunConfig) => void
  handleClockEvents: (events: ClockEvent[], tickCount: number) => void
  setWeeklyRule: (rule: WeeklyRule | null) => void
  setDangerLevel: (level: number) => void
}

export const useMarketStore = create<RealtimeMarketState>((set, get) => ({
  market: null as unknown as MarketState,
  marketConditions: {},
  dangerLevel: 0,
  currentWeeklyRule: null,

  initialize: (config) => {
    let market = createInitialMarketState(config)
    market = generatePreviousQuarter(market, config)
    const conditions = detectSectorConditions(market)
    set({ market, marketConditions: conditions })
  },

  handleClockEvents: (events, tickCount) => {
    const { market, dangerLevel, currentWeeklyRule } = get()
    if (!market) return

    let updated = market
    let needsConditionUpdate = false

    for (const event of events) {
      switch (event.type) {
        case 'TICK':
          updated = tickMarket(updated, tickCount, dangerLevel, currentWeeklyRule)
          break
        case 'DAY_END':
          // 일 종료: 버블/패닉 업데이트는 tickMarket 내부에서 처리
          needsConditionUpdate = true
          break
        case 'WEEK_END':
          needsConditionUpdate = true
          break
      }
    }

    const newState: Partial<RealtimeMarketState> = { market: updated }
    if (needsConditionUpdate) {
      newState.marketConditions = detectSectorConditions(updated)
    }

    set(newState)
  },

  setWeeklyRule: (rule) => set({ currentWeeklyRule: rule }),
  setDangerLevel: (level) => set({ dangerLevel: level }),
}))
