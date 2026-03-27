import type { Stock, Position } from '../../data/types'
import { SECTOR_COLORS } from '../../data/constants'
import { MiniSparkline } from './MiniSparkline'
import { useCardTilt } from '../../hooks/useCardTilt'

interface StockListRowProps {
  stock: Stock
  currentPrice: number
  priceChange: number
  priceHistory: number[]
  position: Position | null
  isSelected: boolean
  onClick: () => void
}

export function StockListRow({
  stock, currentPrice, priceChange, priceHistory,
  position, isSelected, onClick,
}: StockListRowProps) {
  const isPositive = priceChange >= 0
  const sectorColor = SECTOR_COLORS[stock.sector]
  const hasPosition = position && position.shares > 0
  const tilt = useCardTilt({ maxTilt: 10, scale: 1.04 })

  // 보유 수익률
  const posReturn = hasPosition && position.avgBuyPrice > 0
    ? (currentPrice - position.avgBuyPrice) / position.avgBuyPrice
    : null

  return (
    <div style={tilt.containerStyle}>
      <div
        ref={tilt.ref}
        onClick={onClick}
        className="cursor-pointer rounded-lg p-2 border relative overflow-hidden"
        style={{
          ...tilt.cardStyle,
          borderColor: isSelected ? sectorColor : 'rgba(255,255,255,0.06)',
          background: isSelected ? `${sectorColor}12` : 'rgba(255,255,255,0.02)',
          boxShadow: isSelected
            ? `0 0 8px ${sectorColor}33, inset 0 1px 0 rgba(255,255,255,0.05)`
            : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
        {...tilt.handlers}
      >
        {/* 빛 반사 오버레이 */}
        <div style={tilt.shineStyle} />

        {/* 상단: 티커 + 변동률 */}
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-bal-text-dim">{stock.ticker}</span>
            {stock.isETF && (
              <span className="px-1 text-[7px] font-bold text-bal-gold border border-bal-gold/30 bg-bal-gold/10 rounded">
                ETF
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold ${isPositive ? 'text-bal-green' : 'text-bal-red'}`}>
            {isPositive ? '+' : ''}{(priceChange * 100).toFixed(1)}%
          </span>
        </div>

        {/* 중단: 이름 + 가격 */}
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-white truncate">{stock.name}</span>
          <span className="text-xs font-bold text-white ml-1 shrink-0">${currentPrice.toFixed(0)}</span>
        </div>

        {/* 스파크라인 */}
        <div className="mt-1">
          <MiniSparkline prices={priceHistory.slice(-12)} width={100} height={16} />
        </div>

        {/* 보유 뱃지 */}
        {hasPosition && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-1 py-px text-[8px] font-bold text-bal-blue border border-bal-blue/30 bg-bal-blue/10 rounded">
              {position.shares}주
            </span>
            {posReturn !== null && (
              <span className={`text-[8px] font-bold ${posReturn >= 0 ? 'text-bal-green' : 'text-bal-red'}`}>
                {posReturn >= 0 ? '+' : ''}{(posReturn * 100).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
