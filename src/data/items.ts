import type { Item } from './types'

export const ITEMS: Item[] = [
  // ===== Common =====
  {
    id: 'hint_card',
    name: '애널리스트 노트',
    description: '증권사 애널리스트의 비공개 종목 메모. 뉴스 1개의 진위를 미리 알려줍니다',
    rarity: 'common',
    cost: 10,
    isConsumable: true,
    effect: 'reveal_one_news',
  },
  {
    id: 'cash_boost_small',
    name: '마진콜 긴급대출',
    description: '마진콜 직전 긴급 유동성 확보. 포트폴리오의 5%를 현금으로 수령',
    rarity: 'common',
    cost: 8,
    isConsumable: true,
    effect: 'cash_boost_percent',
  },
  {
    id: 'emergency_fund',
    name: 'CMA 긴급인출',
    description: 'CMA 계좌에서 비상금 인출. 현금 $500 이하일 때 $2,000 즉시 지급',
    rarity: 'common',
    cost: 10,
    isConsumable: true,
    effect: 'emergency_fund',
  },

  // ===== Uncommon =====
  {
    id: 'insurance',
    name: '풋옵션 헤지',
    description: '풋옵션 매수로 하방 보호. 다음 주 손실을 50%까지 보전',
    rarity: 'uncommon',
    cost: 18,
    isConsumable: true,
    effect: 'loss_insurance_50',
  },
  {
    id: 'double_rp',
    name: 'IR 미팅 참석',
    description: '기업 IR 미팅 참석으로 신뢰도 2배 획득. 다음 주 RP 2배',
    rarity: 'uncommon',
    cost: 15,
    isConsumable: true,
    effect: 'double_rp_next',
  },
  {
    id: 'market_report',
    name: '모닝 브리핑',
    description: '리서치센터 모닝 브리핑 보고서. 모든 섹터의 다음 주 트렌드 공개',
    rarity: 'uncommon',
    cost: 20,
    isConsumable: true,
    effect: 'reveal_all_trends',
  },
  {
    id: 'sector_report',
    name: '섹터 컨센서스',
    description: '증권사 컨센서스 리포트. 선택 섹터의 다음 주 트렌드 힌트 (정확도 80%)',
    rarity: 'uncommon',
    cost: 18,
    isConsumable: true,
    effect: 'sector_trend_hint',
  },

  // ===== Rare =====
  {
    id: 'insider_tip',
    name: '다크풀 시그널',
    description: '기관 대량거래(다크풀) 방향 포착. 가장 크게 오를 종목 1개를 알려줍니다',
    rarity: 'rare',
    cost: 30,
    isConsumable: true,
    effect: 'reveal_best_stock',
  },
  {
    id: 'volatility_shield',
    name: 'VIX 헤지 포지션',
    description: 'VIX 선물 매수로 변동성 헤지. 다음 1주간 최대 손실 -5% 제한',
    rarity: 'rare',
    cost: 30,
    isConsumable: true,
    effect: 'volatility_cap',
  },

  // ===== Legendary =====
  {
    id: 'crystal_ball',
    name: '퀀트 시그널',
    description: '퀀트 알고리즘 기반 5일 예측. 주가 방향을 미리 봅니다',
    rarity: 'legendary',
    cost: 45,
    isConsumable: true,
    effect: 'predict_5_turns',
  },
  {
    id: 'insider_network',
    name: '프라임 브로커 채널',
    description: 'PB 라인을 통한 기관 정보망. 3일간 모든 뉴스의 실제 영향 공개',
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
