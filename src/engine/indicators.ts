/**
 * 경제 지표 시스템
 *
 * MacroEconomyState에서 실시간으로 파생.
 * 숫자만 제공, 해석 없음 — "이 수치들이 시장에 어떤 영향을 줄까?"는 유저가 스스로 판단.
 */

import type { MacroEconomyState } from './macroEconomy'

export interface EconomicIndicator {
  id: string
  name: string
  current: number
  previous: number
  unit: string
  category: 'growth' | 'employment' | 'monetary' | 'price' | 'trade'
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}

/** 거시경제 상태 → 화면 표시용 지표 변환 */
export function deriveIndicatorsFromMacro(
  macro: MacroEconomyState,
  prevMacro: MacroEconomyState,
): EconomicIndicator[] {
  return [
    { id: 'gdp', name: 'GDP 성장률', current: round(macro.gdpGrowth), previous: round(prevMacro.gdpGrowth), unit: '%', category: 'growth' },
    { id: 'unemployment', name: '실업률', current: round(macro.unemployment), previous: round(prevMacro.unemployment), unit: '%', category: 'employment' },
    { id: 'interest_rate', name: '기준금리', current: round(macro.interestRate), previous: round(prevMacro.interestRate), unit: '%', category: 'monetary' },
    { id: 'cpi', name: '소비자물가(CPI)', current: round(macro.inflation), previous: round(prevMacro.inflation), unit: '%', category: 'price' },
    { id: 'pmi', name: '제조업 PMI', current: round(macro.pmi), previous: round(prevMacro.pmi), unit: '', category: 'trade' },
    { id: 'trade_balance', name: '무역수지', current: round(macro.tradeBalance), previous: round(prevMacro.tradeBalance), unit: '억$', category: 'trade' },
    { id: 'consumer_confidence', name: '소비자신뢰지수', current: round(macro.consumerConfidence), previous: round(prevMacro.consumerConfidence), unit: '', category: 'growth' },
    { id: 'exchange_rate', name: '원/달러 환율', current: round(macro.exchangeRate), previous: round(prevMacro.exchangeRate), unit: '원', category: 'trade' },
    { id: 'oil_price', name: '국제 유가(WTI)', current: round(macro.oilPrice), previous: round(prevMacro.oilPrice), unit: '$', category: 'price' },
  ]
}

// ── 하위 호환: 기존 generateIndicators를 유지하되 deprecated 표시 ──

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/** @deprecated — deriveIndicatorsFromMacro() 사용 권장 */
export function generateIndicators(
  runNumber: number,
  week: number,
  marketTrend: number,
): EconomicIndicator[] {
  const rng = seededRandom(runNumber * 997 + week * 13)
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
