import { useState, useMemo } from 'react'
import type { Stock, Position, Sector } from '../../data/types'
import { SECTOR_COLORS } from '../../data/constants'
import { getSectorIcon } from '../icons/SkillIcons'
import { StockListRow } from './StockListRow'

interface StockListPanelProps {
  stocks: Stock[]
  prices: Record<string, number>
  priceHistories: { stockId: string; prices: number[] }[]
  positions: Position[]
  selectedStockId: string | null
  onSelectStock: (stockId: string) => void
}

type FilterKey = Sector | 'etf'
type SortKey = 'name' | 'price' | 'change' | 'held'

const FILTER_OPTIONS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'tech', label: '기술', color: SECTOR_COLORS.tech },
  { key: 'energy', label: '에너지', color: SECTOR_COLORS.energy },
  { key: 'finance', label: '금융', color: SECTOR_COLORS.finance },
  { key: 'consumer', label: '소비재', color: SECTOR_COLORS.consumer },
  { key: 'healthcare', label: '헬스', color: SECTOR_COLORS.healthcare },
  { key: 'etf', label: 'ETF', color: '#f0b429' },
]

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'name', label: '이름순', icon: 'Aa' },
  { key: 'change', label: '변동률순', icon: '%' },
  { key: 'price', label: '가격순', icon: '$' },
  { key: 'held', label: '보유만', icon: '◆' },
]

export function StockListPanel({
  stocks, prices, priceHistories, positions,
  selectedStockId, onSelectStock,
}: StockListPanelProps) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [heldOnly, setHeldOnly] = useState(false)

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const stockData = useMemo(() =>
    stocks.map(stock => {
      const price = prices[stock.id] ?? stock.basePrice
      const history = priceHistories.find(h => h.stockId === stock.id)
      const histPrices = history?.prices ?? []
      const prevPrice = histPrices.length >= 2 ? histPrices[histPrices.length - 2] : stock.basePrice
      const change = prevPrice > 0 ? (price - prevPrice) / prevPrice : 0
      const position = positions.find(p => p.stockId === stock.id) ?? null
      return { stock, price, change, histPrices, position }
    }), [stocks, prices, priceHistories, positions])

  const filtered = useMemo(() => {
    let result = stockData
    // 보유만 필터
    if (heldOnly) {
      result = result.filter(({ position }) => position && position.shares > 0)
    }
    // 섹터 필터
    if (activeFilters.size > 0) {
      result = result.filter(({ stock }) => {
        if (activeFilters.has('etf') && stock.isETF) return true
        if (activeFilters.has(stock.sector as FilterKey) && !stock.isETF) return true
        return false
      })
    }
    return result
  }, [stockData, activeFilters, heldOnly])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sortBy) {
      case 'price': arr.sort((a, b) => b.price - a.price); break
      case 'change': arr.sort((a, b) => b.change - a.change); break
      case 'held': arr.sort((a, b) => (b.position?.shares ?? 0) - (a.position?.shares ?? 0)); break
    }
    return arr
  }, [filtered, sortBy])

  const heldCount = useMemo(() =>
    stockData.filter(d => d.position && d.position.shares > 0).length
  , [stockData])

  return (
    <div className="stock-list-panel">
      {/* 정렬 + 보유 필터 */}
      <div className="stock-list-toolbar">
        <div className="stock-list-sort-group">
          {SORT_OPTIONS.filter(o => o.key !== 'held').map(o => (
            <button
              key={o.key}
              className={`stock-list-sort-btn ${sortBy === o.key ? 'stock-list-sort-btn--active' : ''}`}
              onClick={() => setSortBy(o.key)}
            >
              <span className="stock-list-sort-icon">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
        <button
          className={`stock-list-held-btn ${heldOnly ? 'stock-list-held-btn--active' : ''}`}
          onClick={() => setHeldOnly(!heldOnly)}
        >
          보유 {heldCount > 0 && <span className="stock-list-held-count">{heldCount}</span>}
        </button>
      </div>

      {/* 섹터 필터 칩 */}
      <div className="stock-list-filters">
        {FILTER_OPTIONS.map(({ key, label, color }) => {
          const isActive = activeFilters.has(key)
          return (
            <button
              key={key}
              className={`stock-list-filter-chip ${isActive ? 'stock-list-filter-chip--active' : ''}`}
              style={{
                '--chip-color': color,
              } as React.CSSProperties}
              onClick={() => toggleFilter(key)}
            >
              <span className="stock-list-filter-icon">{getSectorIcon(key, 10, isActive ? color : 'currentColor')}</span>
              {label}
            </button>
          )
        })}
      </div>

      {/* 종목 그리드 */}
      <div className="stock-list-grid-wrap">
        {sorted.length === 0 ? (
          <div className="stock-list-empty">
            {heldOnly ? '보유 종목이 없습니다' : '해당 섹터에 종목이 없습니다'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {sorted.map(({ stock, price, change, histPrices, position }) => (
              <StockListRow
                key={stock.id}
                stock={stock}
                currentPrice={price}
                priceChange={change}
                priceHistory={histPrices}
                position={position}
                isSelected={stock.id === selectedStockId}
                onClick={() => onSelectStock(stock.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
