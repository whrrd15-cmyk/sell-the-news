import { motion } from 'motion/react'
import type { Stock, Position } from '../../data/types'
import { SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'

interface StockCardProps {
  stock: Stock
  currentPrice: number
  priceChange: number
  isSelected: boolean
  onClick: () => void
  position?: Position
}

export default function StockCard({
  stock, currentPrice, priceChange, isSelected, onClick, position,
}: StockCardProps) {
  const isPositive = priceChange >= 0
  const changePercent = (priceChange * 100).toFixed(1)
  const borderColor = SECTOR_COLORS[stock.sector]

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="bal-card cursor-pointer p-2.5"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: borderColor,
        borderColor: isSelected ? '#5b9bd5' : undefined,
        boxShadow: isSelected ? '0 0 8px #5b9bd544' : undefined,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-white">{stock.name}</span>
            {stock.isETF && (
              <span className="shrink-0 px-1 py-px text-[8px] font-bold text-bal-gold border border-bal-gold/30 bg-bal-gold/10 rounded">
                ETF
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[10px] text-bal-text-dim">{stock.ticker}</span>
            <span className="text-[10px] font-bold" style={{ color: borderColor }}>
              {SECTOR_LABELS[stock.sector]}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold text-white">${currentPrice.toFixed(0)}</div>
          <div className={`text-[11px] font-bold ${isPositive ? 'text-bal-green' : 'text-bal-red'}`}>
            {isPositive ? '+' : ''}{changePercent}%
          </div>
        </div>
      </div>

      {position && position.shares > 0 && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="px-1.5 py-0.5 text-[9px] font-bold text-bal-blue border border-bal-blue/30 bg-bal-blue/10 rounded">
            {position.shares}주
          </span>
        </div>
      )}
    </motion.div>
  )
}
