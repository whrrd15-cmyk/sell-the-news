/**
 * 경제 지표 생성 엔진
 *
 * 숫자만 제공, 해석 없음.
 * "이 수치들이 시장에 어떤 영향을 줄까?"는 유저가 스스로 판단.
 */

export interface EconomicIndicator {
  id: string
  name: string
  current: number
  previous: number
  unit: string
  category: 'growth' | 'employment' | 'monetary' | 'price' | 'trade'
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/**
 * 분기별 경제 지표 생성
 * marketTrend가 양수면 경제 지표가 개선 방향, 음수면 악화 방향
 */
export function generateIndicators(
  runNumber: number,
  week: number,
  marketTrend: number,
): EconomicIndicator[] {
  const rng = seededRandom(runNumber * 997 + week * 13)

  // 기본값 + 트렌드 반영
  const trendBias = marketTrend * 0.1

  const gdpBase = 1.5 + rng() * 2.0
  const gdpCurrent = gdpBase + trendBias + (rng() - 0.5) * 0.5

  const unemployBase = 3.0 + rng() * 2.0
  const unemployCurrent = unemployBase - trendBias * 0.5 + (rng() - 0.5) * 0.3

  const rateBase = 2.5 + rng() * 2.0
  const rateCurrent = rateBase + (rng() - 0.5) * 0.5

  const cpiBase = 2.0 + rng() * 2.0
  const cpiCurrent = cpiBase + (rng() - 0.5) * 0.5 - trendBias * 0.2

  const pmiBase = 48 + rng() * 6
  const pmiCurrent = pmiBase + trendBias * 2 + (rng() - 0.5) * 3

  const tradeBase = -20 + rng() * 80
  const tradeCurrent = tradeBase + trendBias * 10 + (rng() - 0.5) * 15

  const consumerConfBase = 90 + rng() * 20
  const consumerConfCurrent = consumerConfBase + trendBias * 5 + (rng() - 0.5) * 5

  const housingBase = -5 + rng() * 15
  const housingCurrent = housingBase + trendBias * 2 + (rng() - 0.5) * 3

  return [
    { id: 'gdp', name: 'GDP 성장률', current: round(gdpCurrent), previous: round(gdpBase), unit: '%', category: 'growth' },
    { id: 'unemployment', name: '실업률', current: round(unemployCurrent), previous: round(unemployBase), unit: '%', category: 'employment' },
    { id: 'interest_rate', name: '기준금리', current: round(rateCurrent), previous: round(rateBase), unit: '%', category: 'monetary' },
    { id: 'cpi', name: '소비자물가(CPI)', current: round(cpiCurrent), previous: round(cpiBase), unit: '%', category: 'price' },
    { id: 'pmi', name: '제조업 PMI', current: round(pmiCurrent), previous: round(pmiBase), unit: '', category: 'trade' },
    { id: 'trade_balance', name: '무역수지', current: round(tradeCurrent), previous: round(tradeBase), unit: '억$', category: 'trade' },
    { id: 'consumer_confidence', name: '소비자신뢰지수', current: round(consumerConfCurrent), previous: round(consumerConfBase), unit: '', category: 'growth' },
    { id: 'housing', name: '주택가격변동률', current: round(housingCurrent), previous: round(housingBase), unit: '%', category: 'price' },
  ]
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
