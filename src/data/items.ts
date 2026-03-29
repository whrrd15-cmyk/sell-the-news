import type { Item } from './types'

export const ITEMS: Item[] = [
  // ===== Common =====
  {
    id: 'hint_card',
    name: '힌트 카드',
    description: '다음 주 뉴스 1개의 진위를 미리 알려줍니다',
    rarity: 'common',
    cost: 10,
    isConsumable: true,
    effect: 'reveal_one_news',
  },
  {
    id: 'cash_boost_small',
    name: '긴급 지원금',
    description: '현재 포트폴리오의 5%를 현금으로 받습니다',
    rarity: 'common',
    cost: 8,
    isConsumable: true,
    effect: 'cash_boost_percent',
  },
  // 신규
  {
    id: 'emergency_fund',
    name: '비상자금',
    description: '현금이 $500 이하일 때 사용 가능. $2,000 즉시 지급',
    rarity: 'common',
    cost: 10,
    isConsumable: true,
    effect: 'emergency_fund',
  },

  // ===== Uncommon =====
  {
    id: 'insurance',
    name: '투자 보험',
    description: '다음 주 손실을 50%까지 보전합니다',
    rarity: 'uncommon',
    cost: 18,
    isConsumable: true,
    effect: 'loss_insurance_50',
  },
  {
    id: 'double_rp',
    name: 'RP 부스터',
    description: '다음 주 획득 RP가 2배가 됩니다',
    rarity: 'uncommon',
    cost: 15,
    isConsumable: true,
    effect: 'double_rp_next',
  },
  {
    id: 'market_report',
    name: '시장 분석 리포트',
    description: '모든 섹터의 다음 주 트렌드를 공개합니다',
    rarity: 'uncommon',
    cost: 20,
    isConsumable: true,
    effect: 'reveal_all_trends',
  },
  // 신규
  {
    id: 'sector_report',
    name: '섹터 리포트',
    description: '선택 섹터의 다음 주 트렌드 방향 힌트 (정확도 80%)',
    rarity: 'uncommon',
    cost: 18,
    isConsumable: true,
    effect: 'sector_trend_hint',
  },

  // ===== Rare =====
  {
    id: 'insider_tip',
    name: '내부자 팁',
    description: '가장 크게 오를 종목 1개를 알려줍니다',
    rarity: 'rare',
    cost: 30,
    isConsumable: true,
    effect: 'reveal_best_stock',
  },
  // 신규
  {
    id: 'volatility_shield',
    name: '변동성 방어막',
    description: '다음 1주간 보유 종목 최대 손실을 -5%로 제한합니다',
    rarity: 'rare',
    cost: 30,
    isConsumable: true,
    effect: 'volatility_cap',
  },

  // ===== Legendary =====
  {
    id: 'crystal_ball',
    name: '수정 구슬',
    description: '5일 후의 주가 방향을 미리 봅니다',
    rarity: 'legendary',
    cost: 45,
    isConsumable: true,
    effect: 'predict_5_turns',
  },
  // 신규
  {
    id: 'insider_network',
    name: '내부자 네트워크',
    description: '3일간 모든 뉴스의 실제 영향을 공개합니다',
    rarity: 'legendary',
    cost: 45,
    isConsumable: true,
    effect: 'reveal_all_actual_impacts',
  },
]

export const RARITY_COLORS: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  common: { text: 'text-gray-300', border: 'border-bal-grey/40', bg: 'bg-bal-grey/10', glow: '' },
  uncommon: { text: 'text-bal-green', border: 'border-bal-green/40', bg: 'bg-bal-green/10', glow: '' },
  rare: { text: 'text-bal-blue', border: 'border-bal-blue/40', bg: 'bg-bal-blue/10', glow: '' },
  legendary: { text: 'text-bal-gold', border: 'border-bal-gold/40', bg: 'bg-bal-gold/10', glow: '' },
}

export const RARITY_LABELS: Record<string, string> = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  legendary: '전설',
}

/** Pick random items for the shop */
export function generateShopItems(runNumber: number, count: number = 3): Item[] {
  const available = ITEMS.filter((item) => {
    if (item.rarity === 'legendary' && runNumber < 3) return false
    if (item.rarity === 'rare' && runNumber < 2) return false
    return true
  })

  const shuffled = [...available].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
