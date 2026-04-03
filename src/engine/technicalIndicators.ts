/**
 * 기술적 분석 지표 계산 함수
 * - SMA (단순 이동평균)
 * - RSI (상대강도지수)
 * - MACD (이동평균 수렴·확산)
 * - Bollinger Bands (볼린저 밴드)
 */

export function calculateSMA(prices: number[], period: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < period - 1) return null
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += prices[j]
    return sum / period
  })
}

function ema(prices: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = [prices[0]]
  for (let i = 1; i < prices.length; i++) {
    result.push(prices[i] * k + result[i - 1] * (1 - k))
  }
  return result
}

export function calculateRSI(prices: number[], period = 14): (number | null)[] {
  if (prices.length < period + 1) return prices.map(() => null)

  const gains: number[] = []
  const losses: number[] = []
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    gains.push(diff > 0 ? diff : 0)
    losses.push(diff < 0 ? -diff : 0)
  }

  const result: (number | null)[] = [null] // first price has no RSI
  let avgGain = 0
  let avgLoss = 0

  // Initial average
  for (let i = 0; i < period; i++) {
    avgGain += gains[i]
    avgLoss += losses[i]
    result.push(null)
  }
  avgGain /= period
  avgLoss /= period

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result.push(100 - 100 / (1 + rs))

  // Subsequent values (Wilder's smoothing)
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  return result
}

export function calculateMACD(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  if (prices.length < slowPeriod) {
    const empty = prices.map(() => null)
    return { macd: empty, signal: empty, histogram: empty }
  }

  const fastEma = ema(prices, fastPeriod)
  const slowEma = ema(prices, slowPeriod)

  const macdLine = fastEma.map((f, i) => f - slowEma[i])
  const signalLine = ema(macdLine, signalPeriod)
  const histogram = macdLine.map((m, i) => m - signalLine[i])

  // Mark early values as null (not enough data)
  const macd: (number | null)[] = macdLine.map((v, i) => (i < slowPeriod - 1 ? null : v))
  const signal: (number | null)[] = signalLine.map((v, i) => (i < slowPeriod + signalPeriod - 2 ? null : v))
  const hist: (number | null)[] = histogram.map((v, i) => (i < slowPeriod + signalPeriod - 2 ? null : v))

  return { macd, signal, histogram: hist }
}

export function calculateBollingerBands(
  prices: number[],
  period = 20,
  multiplier = 2,
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(prices, period)

  const upper: (number | null)[] = []
  const lower: (number | null)[] = []

  for (let i = 0; i < prices.length; i++) {
    const m = middle[i]
    if (m === null) {
      upper.push(null)
      lower.push(null)
      continue
    }
    let sumSq = 0
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += (prices[j] - m) ** 2
    }
    const stdDev = Math.sqrt(sumSq / period)
    upper.push(m + multiplier * stdDev)
    lower.push(m - multiplier * stdDev)
  }

  return { upper, middle, lower }
}
