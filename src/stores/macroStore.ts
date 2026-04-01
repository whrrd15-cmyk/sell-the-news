import { create } from 'zustand'
import type { RunConfig } from '../data/types'
import {
  createInitialMacro,
  advanceMacroWeek,
  calculateAllSectorMacroEffects,
  type MacroEconomyState,
} from '../engine/macroEconomy'

interface MacroStoreState {
  macro: MacroEconomyState
  prevMacro: MacroEconomyState
  /** 사전 계산된 섹터별 거시경제 효과 (tickMarket에서 사용) */
  sectorMacroEffects: Record<string, number>

  initialize: (config: RunConfig) => void
  /** WEEK_END 이벤트 시 호출 — 거시경제 1주 전진 */
  advanceWeek: (weekNumber: number, seed: number) => void
  /** 세이브 복원용 */
  restore: (macro: MacroEconomyState, prevMacro: MacroEconomyState) => void
}

export const useMacroStore = create<MacroStoreState>((set) => ({
  macro: null as unknown as MacroEconomyState,
  prevMacro: null as unknown as MacroEconomyState,
  sectorMacroEffects: {},

  initialize: (config) => {
    const macro = createInitialMacro(config)
    set({
      macro,
      prevMacro: macro,  // 초기에는 delta = 0
      sectorMacroEffects: {},
    })
  },

  advanceWeek: (weekNumber, seed) => {
    set((state) => {
      if (!state.macro) return state
      const prevMacro = state.macro
      const macro = advanceMacroWeek(prevMacro, seed, weekNumber)
      const sectorMacroEffects = calculateAllSectorMacroEffects(macro, prevMacro)
      return { macro, prevMacro, sectorMacroEffects }
    })
  },

  restore: (macro, prevMacro) => {
    const sectorMacroEffects = calculateAllSectorMacroEffects(macro, prevMacro)
    set({ macro, prevMacro, sectorMacroEffects })
  },
}))
