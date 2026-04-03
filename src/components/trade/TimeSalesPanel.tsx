import type { MarketTrade } from '../../data/types'

interface TimeSalesPanelProps {
  trades: MarketTrade[]
}

export function TimeSalesPanel({ trades }: TimeSalesPanelProps) {
  const visible = trades.slice(-50).reverse()

  return (
    <div className="time-sales">
      <div className="time-sales-header">
        <span>시간</span>
        <span>종목</span>
        <span>방향</span>
        <span>수량</span>
        <span>가격</span>
      </div>
      <div className="time-sales-body">
        {visible.map((t, i) => (
          <div
            key={`${t.time}-${i}`}
            className={`time-sales-row ${t.isUserTrade ? 'time-sales-row--user' : ''}`}
            style={{ color: t.side === 'buy' ? '#5ec269' : '#e8534a' }}
          >
            <span className="time-sales-time">{t.time}</span>
            <span className="time-sales-ticker">{t.ticker}</span>
            <span>{t.isUserTrade ? '★ ' : ''}{t.side === 'buy' ? 'BUY' : 'SELL'}</span>
            <span>{t.quantity}</span>
            <span>${t.price.toFixed(2)}</span>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="time-sales-empty">장 개시 대기 중...</div>
        )}
      </div>
    </div>
  )
}
