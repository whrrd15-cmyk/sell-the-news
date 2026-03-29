import type { MarketCondition } from '../data/types'
import type { MarketState } from './market'
import { STOCKS } from '../data/stocks'

/**
 * 단순 이동평균 계산
 */
export function getSimpleMovingAverage(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

/**
 * 개별 종목의 시장 상황 감지
 * @param prices - 가격 히스토리 (최소 5개 이상 필요)
 * @param momentum - 섹터 모멘텀 (-1 ~ +1)
 * @param panicLevel - 시장 패닉 레벨 (0 ~ 1)
 */
export function detectMarketCondition(
  prices: number[],
  momentum: number,
  panicLevel: number
): MarketCondition {
  if (prices.length < 5) return 'neutral'

  const ma3 = getSimpleMovingAverage(prices, 3)
  const ma5 = getSimpleMovingAverage(prices, 5)
  const recent3 = prices.slice(-3)

  // 상승 추세: 단기 MA > 장기 MA AND 최근 3개 상승 AND 양의 모멘텀
  const isAscending = recent3.length >= 3 &&
    recent3[1] > recent3[0] &&
    recent3[2] > recent3[1]
  if (ma3 > ma5 && isAscending && momentum > 0.02) {
    return 'bull_trend'
  }

  // 하락장: 단기 MA < 장기 MA AND (패닉 OR 3연속 저점)
  const isDescending = recent3.length >= 3 &&
    recent3[1] < recent3[0] &&
    recent3[2] < recent3[1]
  if (ma3 < ma5 && (panicLevel > 0.2 || isDescending)) {
    return 'bear_market'
  }

  // 횡보장: 5턴 평균 대비 ±5% 이내 AND 낮은 모멘텀
  const avg5 = ma5
  const lastPrice = prices[prices.length - 1]
  const deviation = Math.abs(lastPrice - avg5) / avg5
  if (deviation < 0.05 && Math.abs(momentum) < 0.01) {
    return 'range_bound'
  }

  return 'neutral'
}

/**
 * 전체 시장의 섹터별 상황 감지
 */
export function detectSectorConditions(market: MarketState): Record<string, MarketCondition> {
  const conditions: Record<string, MarketCondition> = {}
  const sectors = ['tech', 'energy', 'finance', 'consumer', 'healthcare'] as const

  for (const sector of sectors) {
    // 섹터의 대표 종목 히스토리 평균 사용
    const sectorStocks = STOCKS.filter(s => s.sector === sector && !s.isETF)
    const sectorPrices: number[] = []

    if (sectorStocks.length > 0) {
      const histories = sectorStocks
        .map(s => market.priceHistories.find(h => h.stockId === s.id)?.prices ?? [])
        .filter(h => h.length > 0)

      if (histories.length > 0) {
        const maxLen = Math.max(...histories.map(h => h.length))
        for (let i = 0; i < maxLen; i++) {
          let sum = 0
          let count = 0
          for (const h of histories) {
            if (i < h.length) {
              sum += h[i]
              count++
            }
          }
          sectorPrices.push(count > 0 ? sum / count : 0)
        }
      }
    }

    const momentum = market.sectorMomentum[sector] ?? 0
    conditions[sector] = detectMarketCondition(sectorPrices, momentum, market.panicLevel)
  }

  return conditions
}

/**
 * 개별 종목의 시장 상황 감지
 */
export function detectStockCondition(
  stockId: string,
  market: MarketState
): MarketCondition {
  const history = market.priceHistories.find(h => h.stockId === stockId)
  if (!history || history.prices.length < 5) return 'neutral'

  const stock = STOCKS.find(s => s.id === stockId)
  const sectorMomentum = stock ? (market.sectorMomentum[stock.sector] ?? 0) : 0

  return detectMarketCondition(history.prices, sectorMomentum, market.panicLevel)
}
