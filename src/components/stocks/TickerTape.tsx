import { STOCKS } from '../../data/stocks'
import { useMarketStore } from '../../stores/marketStore'

const SECTOR_COLORS: Record<string, string> = {
  tech: '#4dabf7',
  energy: '#f0b429',
  finance: '#5ec269',
  consumer: '#e599f7',
  healthcare: '#e8534a',
}

export function TickerTape() {
  const market = useMarketStore(s => s.market)

  const items = STOCKS.map(stock => {
    const price = market.prices[stock.id] ?? stock.basePrice
    const history = market.priceHistories.find(h => h.stockId === stock.id)
    const prevPrice = history && history.prices.length >= 2
      ? history.prices[history.prices.length - 2]
      : price
    const change = prevPrice > 0 ? (price - prevPrice) / prevPrice : 0
    return { stock, price, change }
  })

  const renderItems = () => items.map(({ stock, price, change }) => {
    const isUp = change >= 0
    const color = isUp ? '#5ec269' : '#e8534a'
    const arrow = isUp ? '▲' : '▼'
    return (
      <span key={stock.id} className="ticker-tape-item">
        <span style={{ color: SECTOR_COLORS[stock.sector] ?? '#888', opacity: 0.6 }}>●</span>
        {' '}
        <span className="ticker-tape-ticker">{stock.ticker}</span>
        {' '}
        <span className="ticker-tape-price">${price.toFixed(0)}</span>
        {' '}
        <span style={{ color }}>
          {arrow} {(Math.abs(change) * 100).toFixed(1)}%
        </span>
      </span>
    )
  })

  return (
    <div className="ticker-tape">
      <div className="ticker-tape-track">
        {renderItems()}
        {renderItems()}
      </div>
    </div>
  )
}
