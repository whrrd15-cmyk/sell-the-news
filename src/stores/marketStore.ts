import { create } from 'zustand'
import type { MarketCondition, WeeklyRule } from '../data/types'
import { tickMarket, applyNewsEffect as applyNewsEffectPure, type MarketState, createInitialMarketState, generatePreviousQuarter } from '../engine/market'
import { detectSectorConditions } from '../engine/marketCondition'
import type { ClockEvent } from '../engine/clock'
import type { RunConfig } from '../data/types'
import { useMacroStore } from './macroStore'

interface RealtimeMarketState {
  market: MarketState
  marketConditions: Record<string, MarketCondition>
  dangerLevel: number
  currentWeeklyRule: WeeklyRule | null

  // 액션
  initialize: (config: RunConfig) => void
  handleClockEvents: (events: ClockEvent[], tickCount: number) => void
  applyNewsEffect: (newsId: string, impacts: { sector: string; impact: number; duration: number }[], headline?: string) => void
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

    // 거시경제 효과 읽기
    const macroState = useMacroStore.getState()
    const macroEffects = macroState.sectorMacroEffects

    for (const event of events) {
      switch (event.type) {
        case 'TICK':
          updated = tickMarket(updated, tickCount, dangerLevel, currentWeeklyRule, macroEffects)
          break
        case 'DAY_END':
          needsConditionUpdate = true
          break
        case 'WEEK_END':
          // 거시경제 주간 업데이트
          macroState.advanceWeek(tickCount, tickCount)
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

  applyNewsEffect: (newsId, impacts, headline) => {
    const { market } = get()
    if (!market) return
    const updated = applyNewsEffectPure(market, newsId, impacts, undefined, headline)
    set({ market: updated })
  },

  setWeeklyRule: (rule) => set({ currentWeeklyRule: rule }),
  setDangerLevel: (level) => set({ dangerLevel: level }),
}))
