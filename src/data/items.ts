import type { Item, ItemRarity } from './types'
import { CURSED_ITEMS } from './cursedItems'

export const ITEMS: Item[] = [
  // ===== Common =====
  {
    id: 'hint_card',
    name: '힌트 카드',
    description: '다음 턴 뉴스 1개의 진위를 미리 알려줍니다',
    rarity: 'common',
    cost: 8,
    isConsumable: true,
    effect: 'reveal_one_news',
  },
  {
    id: 'reroll_news',
    name: '뉴스 리롤',
    description: '현재 턴의 뉴스를 다시 생성합니다',
    rarity: 'common',
    cost: 10,
    isConsumable: true,
    effect: 'reroll_news',
  },
  {
    id: 'cash_boost_small',
    name: '긴급 지원금',
    description: '현재 포트폴리오의 5%를 현금으로 받습니다',
    rarity: 'common',
    cost: 5,
    isConsumable: true,
    effect: 'cash_boost_percent',
  },

  // ===== Uncommon =====
  {
    id: 'insurance',
    name: '투자 보험',
    description: '다음 턴 손실을 50%까지 보전합니다',
    rarity: 'uncommon',
    cost: 15,
    isConsumable: true,
    effect: 'loss_insurance_50',
  },
  {
    id: 'double_rp',
    name: 'RP 부스터',
    description: '다음 턴 획득 RP가 2배가 됩니다',
    rarity: 'uncommon',
    cost: 12,
    isConsumable: true,
    effect: 'double_rp_next',
  },
  {
    id: 'market_report',
    name: '시장 분석 리포트',
    description: '모든 섹터의 다음 턴 트렌드를 공개합니다',
    rarity: 'uncommon',
    cost: 18,
    isConsumable: true,
    effect: 'reveal_all_trends',
  },

  // ===== Rare =====
  {
    id: 'insider_tip',
    name: '내부자 팁',
    description: '가장 크게 오를 종목 1개를 알려줍니다',
    rarity: 'rare',
    cost: 25,
    isConsumable: true,
    effect: 'reveal_best_stock',
  },
  {
    id: 'time_rewind',
    name: '시간 되감기',
    description: '이전 턴의 거래를 취소합니다',
    rarity: 'rare',
    cost: 30,
    isConsumable: true,
    effect: 'undo_last_trade',
  },

  // ===== Rare (신규) =====
  {
    id: 'auto_dca_token',
    name: '자동 적립식 매수권',
    description: '종목을 선택하면 3턴간 매 턴 $500 자동 매수합니다',
    rarity: 'rare',
    cost: 20,
    isConsumable: true,
    effect: 'auto_dca_3_turns',
  },
  {
    id: 'panic_shield',
    name: '공포 방어막',
    description: '다음 턴 패닉 레벨 효과를 무효화합니다',
    rarity: 'rare',
    cost: 22,
    isConsumable: true,
    effect: 'nullify_panic',
  },

  // ===== Uncommon (신규) =====
  {
    id: 'market_condition_report',
    name: '시장 상황 리포트',
    description: '모든 섹터의 현재 시장 상황과 추천 전략을 보여줍니다',
    rarity: 'uncommon',
    cost: 12,
    isConsumable: true,
    effect: 'reveal_market_condition',
  },

  // ===== Legendary =====
  {
    id: 'crystal_ball',
    name: '수정 구슬',
    description: '5턴 후의 주가 방향을 미리 봅니다',
    rarity: 'legendary',
    cost: 30,
    isConsumable: true,
    effect: 'predict_5_turns',
  },
]

export const RARITY_COLORS: Record<ItemRarity, { text: string; border: string; bg: string; glow: string }> = {
  common: {
    text: 'text-gray-300',
    border: 'border-bal-grey/40',
    bg: 'bg-bal-grey/10',
    glow: '',
  },
  uncommon: {
    text: 'text-bal-green',
    border: 'border-bal-green/40',
    bg: 'bg-bal-green/10',
    glow: '',
  },
  rare: {
    text: 'text-bal-blue',
    border: 'border-bal-blue/40',
    bg: 'bg-bal-blue/10',
    glow: '',
  },
  legendary: {
    text: 'text-bal-gold',
    border: 'border-bal-gold/40',
    bg: 'bg-bal-gold/10',
    glow: '',
  },
}

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  legendary: '전설',
}

/** Pick random items for the shop based on run number */
export function generateShopItems(runNumber: number, count: number = 3): Item[] {
  // Higher runs unlock rarer items
  const available = ITEMS.filter((item) => {
    if (item.rarity === 'legendary' && runNumber < 3) return false
    if (item.rarity === 'rare' && runNumber < 2) return false
    return true
  })

  const shuffled = [...available].sort(() => Math.random() - 0.5)
  const result = shuffled.slice(0, count)

  // Q3부터 저주 아이템 1개 포함
  if (runNumber >= 3) {
    const availableCursed = CURSED_ITEMS.filter((item) => {
      if (item.rarity === 'legendary' && runNumber < 5) return false
      if (item.rarity === 'rare' && runNumber < 4) return false
      return true
    })
    if (availableCursed.length > 0) {
      const cursed = availableCursed[Math.floor(Math.random() * availableCursed.length)]
      result.push(cursed)
    }
  }

  return result
}
