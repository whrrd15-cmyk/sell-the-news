import { useMemo } from 'react'
import { getSpread } from '../../engine/portfolio'

/**
 * 바이낸스 스타일 호가창
 * 매도 5단계(빨강) + 현재가 + 매수 5단계(초록)
 * 게임화: 실제 주문이 아닌 시뮬레이션된 호가
 */

interface OrderBookPanelProps {
  currentPrice: number
  volatility: number
  ticker: string
}

function seededNoise(seed: number): number {
  const s = Math.sin(seed * 9301 + 49297) * 49297
  return s - Math.floor(s)
}

export function OrderBookPanel({ currentPrice, volatility, ticker }: OrderBookPanelProps) {
  const levels = useMemo(() => {
    if (currentPrice <= 0) return { asks: [], bids: [], spread: 0 }

    const { bid, ask } = getSpread(currentPrice, volatility)
    const spreadPct = ((ask - bid) / currentPrice * 100).toFixed(2)
    const step = currentPrice * (0.002 + volatility * 0.003)

    const asks = Array.from({ length: 5 }, (_, i) => {
      const price = ask + step * (4 - i)
      const qty = Math.floor(10 + seededNoise(price * 100 + i) * 90)
      const total = Math.floor(price * qty)
      return { price, qty, total, depth: 0.2 + (4 - i) * 0.15 }
    })

    const bids = Array.from({ length: 5 }, (_, i) => {
      const price = bid - step * i
      const qty = Math.floor(10 + seededNoise(price * 100 + i + 50) * 90)
      const total = Math.floor(price * qty)
      return { price: Math.max(1, price), qty, total, depth: 0.8 - i * 0.12 }
    })

    return { asks, bids, spread: parseFloat(spreadPct) }
  }, [currentPrice, volatility])

  if (currentPrice <= 0) {
    return (
      <div className="order-book-empty">
        <span className="text-bal-text-dim text-[10px]">종목을 선택하세요</span>
      </div>
    )
  }

  return (
    <div className="order-book">
      {/* 헤더 */}
      <div className="order-book-header">
        <span>가격($)</span>
        <span>수량</span>
        <span>총액</span>
      </div>

      {/* 매도 호가 (빨강, 위에서 아래로 가격 하락) */}
      <div className="order-book-asks">
        {levels.asks.map((level, i) => (
          <div key={`ask-${i}`} className="order-book-row order-book-row--ask">
            <div className="order-book-depth" style={{ width: `${level.depth * 100}%`, background: 'rgba(232,83,74,0.1)' }} />
            <span className="order-book-price text-bal-red">{level.price.toFixed(1)}</span>
            <span className="order-book-qty">{level.qty}</span>
            <span className="order-book-total">{level.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* 현재가 + 스프레드 */}
      <div className="order-book-current">
        <span className="order-book-current-price">${currentPrice.toFixed(1)}</span>
        <span className="order-book-spread">스프레드 {levels.spread}%</span>
      </div>

      {/* 매수 호가 (초록, 위에서 아래로 가격 하락) */}
      <div className="order-book-bids">
        {levels.bids.map((level, i) => (
          <div key={`bid-${i}`} className="order-book-row order-book-row--bid">
            <div className="order-book-depth" style={{ width: `${level.depth * 100}%`, background: 'rgba(94,194,105,0.1)' }} />
            <span className="order-book-price text-bal-green">{level.price.toFixed(1)}</span>
            <span className="order-book-qty">{level.qty}</span>
            <span className="order-book-total">{level.total.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
