import { useState, useMemo, useRef, useCallback } from 'react'
import type { Stock, Position, Sector } from '../../data/types'
import { SECTOR_COLORS } from '../../data/constants'
import { getSectorIcon } from '../icons/SkillIcons'
import { MiniSparkline } from './MiniSparkline'

interface StockCardStripProps {
  stocks: Stock[]
  prices: Record<string, number>
  priceHistories: { stockId: string; prices: number[] }[]
  positions: Position[]
  selectedStockId: string | null
  onSelectStock: (stockId: string) => void
}

type FilterKey = Sector | 'etf'

const FILTER_OPTIONS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'tech', label: '기술', color: SECTOR_COLORS.tech },
  { key: 'energy', label: '에너지', color: SECTOR_COLORS.energy },
  { key: 'finance', label: '금융', color: SECTOR_COLORS.finance },
  { key: 'consumer', label: '소비재', color: SECTOR_COLORS.consumer },
  { key: 'healthcare', label: '헬스', color: SECTOR_COLORS.healthcare },
  { key: 'etf', label: 'ETF', color: '#f0b429' },
]

export function StockCardStrip({
  stocks, prices, priceHistories, positions,
  selectedStockId, onSelectStock,
}: StockCardStripProps) {
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

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
    if (activeFilters.size === 0) return stockData
    return stockData.filter(({ stock }) => {
      if (activeFilters.has('etf') && stock.isETF) return true
      if (activeFilters.has(stock.sector as FilterKey) && !stock.isETF) return true
      return false
    })
  }, [stockData, activeFilters])

  // 드래그 스크롤
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0)
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return
    const x = e.pageX - (scrollRef.current.offsetLeft ?? 0)
    scrollRef.current.scrollLeft = scrollLeft.current - (x - startX.current)
  }, [])

  const handleMouseUp = useCallback(() => { isDragging.current = false }, [])

  return (
    <div className="stock-card-strip" data-guide="stock-sidebar">
      {/* 섹터 필터 칩 */}
      <div className="stock-card-strip-filters">
        {FILTER_OPTIONS.map(({ key, label, color }) => {
          const isActive = activeFilters.has(key)
          return (
            <button
              key={key}
              className={`stock-card-filter-chip ${isActive ? 'stock-card-filter-chip--active' : ''}`}
              style={{ '--chip-color': color } as React.CSSProperties}
              onClick={() => toggleFilter(key)}
            >
              {getSectorIcon(key, 9, isActive ? color : 'currentColor')}
              {label}
            </button>
          )
        })}
      </div>

      {/* 카드 스크롤 */}
      <div
        ref={scrollRef}
        className="stock-card-strip-scroll"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {filtered.map(({ stock, price, change, histPrices, position }) => {
          const isSelected = stock.id === selectedStockId
          const sectorColor = stock.isETF ? '#f0b429' : SECTOR_COLORS[stock.sector]
          const isUp = change >= 0
          const hasPosition = position && position.shares > 0

          return (
            <button
              key={stock.id}
              className={`stock-card ${isSelected ? 'stock-card--selected' : ''}`}
              style={{
                '--card-color': sectorColor,
                borderColor: isSelected ? sectorColor : 'rgba(255,255,255,0.08)',
              } as React.CSSProperties}
              onClick={() => onSelectStock(stock.id)}
            >
              {hasPosition && <span className="stock-card-held">◆</span>}
              <span className="stock-card-ticker">{stock.ticker}</span>
              <span className="stock-card-price">${price.toFixed(0)}</span>
              <span className={`stock-card-change ${isUp ? 'stock-card-change--up' : 'stock-card-change--down'}`}>
                {isUp ? '▲' : '▼'}{(Math.abs(change) * 100).toFixed(1)}%
              </span>
              <MiniSparkline prices={histPrices} width={70} height={16} />
              {hasPosition && (
                <span className="stock-card-shares">{position!.shares}주</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
