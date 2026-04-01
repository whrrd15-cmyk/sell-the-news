import type { Sector, WeeklyRule } from './types'

const SECTORS: Sector[] = ['tech', 'energy', 'finance', 'consumer', 'healthcare']

export const WEEKLY_RULES: WeeklyRule[] = [
  {
    id: 'volatile_week',
    name: 'FOMC 주간',
    description: '연준 금리 결정 주간. 모든 종목 변동성 2배',
    icon: '/icons/rules/fomc.png',
    effect: { type: 'volatile_week', multiplier: 2.0 },
    minQuarter: 2,
  },
  {
    id: 'fomo_week',
    name: '실적 시즌',
    description: '기업 실적 발표 시즌. 모멘텀 효과 3배',
    icon: '/icons/rules/earnings.png',
    effect: { type: 'fomo_week', bonusMomentum: 3.0 },
    minQuarter: 2,
  },
  {
    id: 'news_overload',
    name: 'IPO 러쉬',
    description: '대규모 IPO 동시 진행. 뉴스가 2배로 쏟아집니다',
    icon: '/icons/rules/ipo.png',
    effect: { type: 'news_overload', extraNews: 5 },
    minQuarter: 2,
  },
  {
    id: 'sector_blackout',
    name: '서킷브레이커',
    description: '특정 섹터에 서킷브레이커 발동. 해당 섹터 뉴스 차단',
    icon: '/icons/rules/circuit.png',
    effect: { type: 'sector_blackout', sector: 'tech' }, // sector는 roll 시 랜덤 교체
    minQuarter: 3,
  },
  {
    id: 'double_or_nothing',
    name: '쿼드러플 위칭',
    description: '선물·옵션 동시 만기일. 모든 가격 변동 2배',
    icon: '/icons/rules/witching.png',
    effect: { type: 'double_or_nothing' },
    minQuarter: 3,
  },
  {
    id: 'no_selling',
    name: '공매도 금지',
    description: '금융위원회 공매도 임시 금지 조치. 매도 불가',
    icon: '/icons/rules/ban.png',
    effect: { type: 'no_selling' },
    minQuarter: 4,
  },
  {
    id: 'fog_of_war',
    name: 'HTS 장애',
    description: '증권사 서버 장애로 차트 미표시. 뉴스만으로 판단하세요',
    icon: '/icons/rules/outage.png',
    effect: { type: 'fog_of_war' },
    minQuarter: 4,
  },
  {
    id: 'flash_crash_risk',
    name: '플래시 크래시',
    description: '알고리즘 트레이딩 오작동. 일부 종목 급락 가능',
    icon: '/icons/rules/flash.png',
    effect: { type: 'flash_crash_risk', probability: 0.15 },
    minQuarter: 5,
  },
  {
    id: 'pandemic_week',
    name: '글로벌 위기',
    description: '팬데믹/지정학 리스크 폭발. 변동성 3배 + 공포 지수 급등',
    icon: '/icons/rules/crisis.png',
    effect: { type: 'pandemic_week', volatilityMultiplier: 3.0, panicBoost: 0.3 },
    minQuarter: 5,
  },
  {
    id: 'strategy_week',
    name: 'MSCI 리밸런싱',
    description: '지수 편입·편출 발생. 섹터별 다른 시장 상황',
    icon: '/icons/rules/rebalance.png',
    effect: { type: 'strategy_week' },
    minQuarter: 3,
  },
]

export function rollWeeklyRule(
  turn: number,
  quarterNumber: number,
  usedRuleIds: string[],
): WeeklyRule | null {
  if (turn < 3) return null

  // Seeded RNG
  let seed = turn * 4729 + quarterNumber * 53
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 0xffffffff
  }

  // 확률: Q1=15%, Q2=20%, ... 최대 35%
  const probability = Math.min(0.35, 0.10 + quarterNumber * 0.05)
  if (rng() > probability) return null

  const usedSet = new Set(usedRuleIds)
  const available = WEEKLY_RULES.filter(
    (r) => r.minQuarter <= quarterNumber && !usedSet.has(r.id),
  )
  if (available.length === 0) return null

  const picked = { ...available[Math.floor(rng() * available.length)] }

  // sector_blackout: 랜덤 섹터 선택
  if (picked.effect.type === 'sector_blackout') {
    const randomSector = SECTORS[Math.floor(rng() * SECTORS.length)]
    picked.effect = { type: 'sector_blackout', sector: randomSector }
    const sectorNames: Record<Sector, string> = {
      tech: '기술', energy: '에너지', finance: '금융',
      consumer: '소비재', healthcare: '헬스케어',
    }
    picked.description = `${sectorNames[randomSector]} 섹터 서킷브레이커 발동. 해당 섹터 뉴스 차단`
  }

  return picked
}
