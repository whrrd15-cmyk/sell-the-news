import type { MarketTrade } from '../data/types'
import { STOCKS } from '../data/stocks'

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/**
 * 매 틱마다 1~3개의 가상 시장 체결을 생성한다.
 * herdSentiment > 0 이면 매수 비율이 높아지고, < 0 이면 매도 비율이 높아진다.
 */
export function generateMarketTrades(
  tickCount: number,
  prices: Record<string, number>,
  herdSentiment: number,
  gameHour: number,
  gameMinute: number,
): MarketTrade[] {
  const rng = seededRandom(tickCount * 9973 + 41)
  const count = 1 + Math.floor(rng() * 3)
  const nonEtf = STOCKS.filter(s => !s.isETF)
  const trades: MarketTrade[] = []

  for (let i = 0; i < count; i++) {
    const stock = nonEtf[Math.floor(rng() * nonEtf.length)]
    const price = prices[stock.id] ?? stock.basePrice
    const buyProb = 0.5 + herdSentiment * 0.2
    const side: 'buy' | 'sell' = rng() < buyProb ? 'buy' : 'sell'
    const quantity = 1 + Math.floor(rng() * 50 * stock.volatility)
    const spreadPct = 0.001 + rng() * 0.002
    const tradePrice = side === 'buy'
      ? price * (1 + spreadPct)
      : price * (1 - spreadPct)

    const hh = String(gameHour).padStart(2, '0')
    const mm = String(gameMinute).padStart(2, '0')
    const ss = String(Math.floor(rng() * 60)).padStart(2, '0')

    trades.push({
      time: `${hh}:${mm}:${ss}`,
      stockId: stock.id,
      ticker: stock.ticker,
      side,
      quantity,
      price: Math.round(tradePrice * 100) / 100,
      isUserTrade: false,
    })
  }

  return trades
}
