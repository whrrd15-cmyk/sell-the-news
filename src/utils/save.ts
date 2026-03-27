// localStorage save/load for game state

const SAVE_KEY = 'stock-roguelike-save'

export interface SaveData {
  version: number
  turn: number
  runNumber: number
  cash: number
  positions: { stockId: string; shares: number; avgBuyPrice: number }[]
  reputationPoints: number
  unlockedSkills: string[]
  prices: Record<string, number>
  priceHistories: { stockId: string; prices: number[] }[]
  stats: {
    totalTurns: number
    correctPredictions: number
    fakeNewsDetected: number
    fakeNewsTotal: number
    pumpDumpAvoided: number
    pumpDumpTotal: number
    fudAvoided: number
    fudTotal: number
    learnedConcepts: string[]
  }
  usedEventIds: string[]
  usedSpecialEventIds: string[]
  equippedCursedItems?: { id: string; effect: string }[]
  usedWeeklyRuleIds?: string[]
  timestamp: number
}

export function hasSaveData(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null
  } catch {
    return false
  }
}

export function loadSaveData(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (data.version !== 1 && data.version !== 2) return null
    return data
  } catch {
    return null
  }
}

export function writeSaveData(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    // storage full or blocked
  }
}

export function deleteSaveData(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}
