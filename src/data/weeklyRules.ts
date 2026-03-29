import type { Sector, WeeklyRule } from './types'

const SECTORS: Sector[] = ['tech', 'energy', 'finance', 'consumer', 'healthcare']

export const WEEKLY_RULES: WeeklyRule[] = [
  {
    id: 'volatile_week',
    name: '변동성 폭풍',
    description: '이번 주 모든 종목의 변동성이 2배입니다',
    icon: '🌪️',
    effect: { type: 'volatile_week', multiplier: 2.0 },
    minQuarter: 2,
  },
  {
    id: 'fomo_week',
    name: 'FOMO 주간',
    description: '군중 심리가 극대화됩니다. 모멘텀 효과 3배',
    icon: '🏃',
    effect: { type: 'fomo_week', bonusMomentum: 3.0 },
    minQuarter: 2,
  },
  {
    id: 'news_overload',
    name: '정보 과부하',
    description: '뉴스가 2배로 쏟아집니다. 핵심을 골라내세요',
    icon: '📰',
    effect: { type: 'news_overload', extraNews: 5 },
    minQuarter: 2,
  },
  {
    id: 'sector_blackout',
    name: '섹터 블랙아웃',
    description: '특정 섹터의 뉴스가 차단됩니다',
    icon: '🔇',
    effect: { type: 'sector_blackout', sector: 'tech' }, // sector는 roll 시 랜덤 교체
    minQuarter: 3,
  },
  {
    id: 'double_or_nothing',
    name: '더블 오어 낫싱',
    description: '모든 가격 변동이 2배입니다',
    icon: '🎲',
    effect: { type: 'double_or_nothing' },
    minQuarter: 3,
  },
  {
    id: 'no_selling',
    name: '매도 금지령',
    description: '이번 주는 매도할 수 없습니다',
    icon: '🚫',
    effect: { type: 'no_selling' },
    minQuarter: 4,
  },
  {
    id: 'fog_of_war',
    name: '전장의 안개',
    description: '가격 차트가 보이지 않습니다. 뉴스만으로 판단하세요',
    icon: '🌫️',
    effect: { type: 'fog_of_war' },
    minQuarter: 4,
  },
  {
    id: 'flash_crash_risk',
    name: '플래시 크래시 경보',
    description: '이번 주 일부 종목에 급락이 발생할 수 있습니다',
    icon: '⚡',
    effect: { type: 'flash_crash_risk', probability: 0.15 },
    minQuarter: 5,
  },
  {
    id: 'pandemic_week',
    name: '팬데믹 주간',
    description: '변동성 3배 + 공포 지수 급등! 극한 공포를 체험하세요',
    icon: '🦠',
    effect: { type: 'pandemic_week', volatilityMultiplier: 3.0, panicBoost: 0.3 },
    minQuarter: 5,
  },
  {
    id: 'strategy_week',
    name: '전략 주간',
    description: '섹터별로 다른 시장 상황이 펼쳐집니다. 전략을 분산하세요',
    icon: '🎯',
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
    picked.description = `${sectorNames[randomSector]} 섹터의 뉴스가 차단됩니다`
  }

  return picked
}
