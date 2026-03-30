import type { MetaUpgrade, MetaProgress } from './types'

export const META_UPGRADES: MetaUpgrade[] = [
  {
    id: 'starting_cash_1',
    name: '초기 자본 증가',
    description: '시작 자금이 $1,000 증가합니다',
    cost: 2,
    maxLevel: 3,
    effect: { type: 'starting_cash_bonus', amount: 1000 },
  },
  {
    id: 'starting_rp_1',
    name: '초기 평판',
    description: '시작 시 평판 포인트 5를 받습니다',
    cost: 3,
    maxLevel: 2,
    effect: { type: 'starting_rp_bonus', amount: 5 },
  },
  {
    id: 'news_accuracy_1',
    name: '뉴스 감각',
    description: '가짜 뉴스의 신뢰도 표시가 더 정확해집니다',
    cost: 4,
    maxLevel: 2,
    effect: { type: 'news_accuracy_bonus', amount: 0.1 },
  },
  {
    id: 'skill_discount_1',
    name: '스킬 할인',
    description: '스킬 구매 비용이 15% 감소합니다',
    cost: 5,
    maxLevel: 2,
    effect: { type: 'skill_discount', percent: 0.15 },
  },
]

export function createInitialMetaProgress(): MetaProgress {
  return {
    totalRuns: 0,
    highestRunCleared: 0,
    metaPoints: 0,
    unlockedMetaUpgrades: [],
    achievements: [],
  }
}

const META_STORAGE_KEY = 'sell-the-news-meta'

export function loadMetaProgress(): MetaProgress {
  try {
    const saved = localStorage.getItem(META_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as MetaProgress
    }
  } catch {
    // ignore
  }
  return createInitialMetaProgress()
}

export function saveMetaProgress(meta: MetaProgress): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta))
  } catch {
    // ignore
  }
}

export function getMetaUpgradeCount(meta: MetaProgress, upgradeId: string): number {
  return meta.unlockedMetaUpgrades.filter(id => id === upgradeId).length
}

export function getStartingCashBonus(meta: MetaProgress): number {
  const count = getMetaUpgradeCount(meta, 'starting_cash_1')
  return count * 1000
}

export function getStartingRPBonus(meta: MetaProgress): number {
  const count = getMetaUpgradeCount(meta, 'starting_rp_1')
  return count * 5
}
