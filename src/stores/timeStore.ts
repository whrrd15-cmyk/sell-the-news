import { create } from 'zustand'
import type { GameTime, TimeSpeed, MarketSession } from '../data/types'
import {
  createInitialGameTime,
  advanceGameTime,
  getMarketSession,
  type ClockEvent,
} from '../engine/clock'

interface TimeState {
  gameTime: GameTime
  speed: TimeSpeed
  session: MarketSession
  isQuarterEnded: boolean

  // 이벤트 구독자
  _listeners: ((events: ClockEvent[]) => void)[]

  // 액션
  setSpeed: (speed: TimeSpeed) => void
  togglePause: () => void
  tick: (deltaMs: number) => void
  reset: () => void
  subscribe: (listener: (events: ClockEvent[]) => void) => () => void
}

export const useTimeStore = create<TimeState>((set, get) => ({
  gameTime: createInitialGameTime(),
  speed: '1x',
  session: { isOpen: false, preMarket: true, afterHours: false },
  isQuarterEnded: false,
  _listeners: [],

  setSpeed: (speed) => set({ speed }),

  togglePause: () => {
    const current = get().speed
    set({ speed: current === 'paused' ? '1x' : 'paused' })
  },

  tick: (deltaMs) => {
    const { gameTime, speed, isQuarterEnded, _listeners } = get()
    if (isQuarterEnded || speed === 'paused') return

    const result = advanceGameTime(gameTime, deltaMs, speed)
    const session = getMarketSession(result.newTime)
    const quarterEnded = result.events.some(e => e.type === 'QUARTER_END')

    set({
      gameTime: result.newTime,
      session,
      isQuarterEnded: quarterEnded,
      speed: quarterEnded ? 'paused' : speed,
    })

    // 이벤트 디스패치
    if (result.events.length > 0) {
      for (const listener of _listeners) {
        listener(result.events)
      }
    }
  },

  reset: () => set({
    gameTime: createInitialGameTime(),
    speed: '1x',
    session: { isOpen: false, preMarket: true, afterHours: false },
    isQuarterEnded: false,
  }),

  subscribe: (listener) => {
    set(s => ({ _listeners: [...s._listeners, listener] }))
    return () => {
      set(s => ({ _listeners: s._listeners.filter(l => l !== listener) }))
    }
  },
}))
