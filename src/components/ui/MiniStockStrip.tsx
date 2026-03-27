import { useState, useMemo } from 'react'
import type { Stock, Position } from '../../data/types'
import { SECTOR_COLORS } from '../../data/constants'

interface MiniStockStripProps {
  stocks: Stock[]
  prices: Record<string, number>
  priceHistories: { stockId: string; prices: number[] }[]
  positions?: Position[]
  selectedStockId: string | null
  onSelectStock: (stockId: string) => void
}

type SortKey = 'name' | 'change' | 'price'
type FilterKey = 'held'

const SORT_OPTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: '이름순' },
  { key: 'change', label: '변동률순' },
  { key: 'price', label: '가격순' },
]

export function MiniStockStrip({ stocks, prices, priceHistories, positions, selectedStockId, onSelectStock }: MiniStockStripProps) {
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [heldOnly, setHeldOnly] = useState(false)

  const enriched = useMemo(() =>
    stocks.map(stock => {
      const price = prices[stock.id] ?? 0
      const hist = priceHistories.find(h => h.stockId === stock.id)
      const prevPrice = hist && hist.prices.length >= 2 ? hist.prices[hist.prices.length - 2] : price
      const change = prevPrice > 0 ? (price - prevPrice) / prevPrice : 0
      const pos = positions?.find(p => p.stockId === stock.id)
      const held = pos && pos.shares > 0
      return { stock, price, change, held }
    }), [stocks, prices, priceHistories, positions])

  const sorted = useMemo(() => {
    let arr = heldOnly ? enriched.filter(e => e.held) : enriched
    arr = [...arr]
    switch (sortBy) {
      case 'change': arr.sort((a, b) => b.change - a.change); break
      case 'price': arr.sort((a, b) => b.price - a.price); break
    }
    return arr
  }, [enriched, sortBy, heldOnly])

  return (
    <div className="mini-stock-panel">
      {/* 정렬/필터 바 */}
      <div className="mini-stock-controls">
        <div className="mini-stock-sort-group">
          {SORT_OPTS.map(o => (
            <button
              key={o.key}
              className={`mini-stock-sort-btn ${sortBy === o.key ? 'mini-stock-sort-btn--active' : ''}`}
              onClick={() => setSortBy(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          className={`mini-stock-sort-btn ${heldOnly ? 'mini-stock-sort-btn--held' : ''}`}
          onClick={() => setHeldOnly(!heldOnly)}
        >
          보유만
        </button>
      </div>

      {/* 종목 리스트 */}
      <div className="mini-stock-strip">
        {sorted.length === 0 ? (
          <span className="mini-stock-empty">보유 종목이 없습니다</span>
        ) : sorted.map(({ stock, price, change, held }) => {
          const isPositive = change >= 0
          const isSelected = selectedStockId === stock.id
          const sectorColor = SECTOR_COLORS[stock.sector]

          return (
            <button
              key={stock.id}
              className={`mini-stock-chip ${isSelected ? 'mini-stock-chip--selected' : ''} ${held ? 'mini-stock-chip--held' : ''}`}
              onClick={() => onSelectStock(stock.id)}
              style={{ borderColor: isSelected ? sectorColor : undefined }}
            >
              <span className="mini-stock-ticker">{stock.ticker}</span>
              <span className="mini-stock-price">${price.toFixed(0)}</span>
              <span className={`mini-stock-change ${isPositive ? 'mini-stock-change--up' : 'mini-stock-change--down'}`}>
                {isPositive ? '▲' : '▼'}{(Math.abs(change) * 100).toFixed(1)}%
              </span>
              {held && <span className="mini-stock-held-dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
