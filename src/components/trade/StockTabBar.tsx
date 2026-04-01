import { useMemo } from 'react'
import type { Stock, Position } from '../../data/types'
import { SECTOR_COLORS } from '../../data/constants'

/**
 * 바이낸스 스타일 종목 선택 탭바
 * 상단에 모든 종목을 가로 탭으로 표시, 선택 종목 하이라이트
 */

interface StockTabBarProps {
  stocks: Stock[]
  prices: Record<string, number>
  positions: Position[]
  selectedStockId: string | null
  pickedStockId?: string | null
  onSelectStock: (stockId: string) => void
}

export function StockTabBar({ stocks, prices, positions, selectedStockId, pickedStockId, onSelectStock }: StockTabBarProps) {
  const stockData = useMemo(() =>
    stocks.filter(s => !s.isETF && (!pickedStockId || s.id === pickedStockId)).map(s => {
      const price = prices[s.id] ?? s.basePrice
      const pos = positions.find(p => p.stockId === s.id)
      return { stock: s, price, hasPosition: pos && pos.shares > 0 }
    }),
  [stocks, prices, positions])

  return (
    <div className="stock-tab-bar">
      {stockData.map(({ stock, price, hasPosition }) => {
        const isSelected = stock.id === selectedStockId
        const color = SECTOR_COLORS[stock.sector]
        return (
          <button
            key={stock.id}
            className={`stock-tab ${isSelected ? 'stock-tab--active' : ''}`}
            style={{ '--tab-color': color } as React.CSSProperties}
            onClick={() => onSelectStock(stock.id)}
          >
            {hasPosition && <span className="stock-tab-dot" />}
            <span className="stock-tab-ticker">{stock.ticker}</span>
            <span className="stock-tab-price">${price.toFixed(2)}</span>
          </button>
        )
      })}
    </div>
  )
}
