import type { Portfolio } from '../../data/types'

interface AssetPanelProps {
  portfolio: Portfolio
  totalValue: number
  totalReturn: number
}

export function AssetPanel({ portfolio, totalValue, totalReturn }: AssetPanelProps) {
  const isPositive = totalReturn >= 0

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-bal-text-dim text-xs">현금</span>
        <span className="text-bal-gold font-bold">${Math.floor(portfolio.cash).toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-bal-text-dim text-xs">총 자산</span>
        <span className="text-white text-lg font-bold">${Math.floor(totalValue).toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-bal-text-dim text-xs">수익률</span>
        <span className={`font-bold ${isPositive ? 'text-bal-green' : 'text-bal-red'}`}>
          {isPositive ? '+' : ''}{(totalReturn * 100).toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-bal-text-dim text-xs">RP</span>
        <span className="text-bal-purple font-bold">{portfolio.reputationPoints}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-bal-text-dim text-xs">보유 종목</span>
        <span className="text-bal-blue font-bold">{portfolio.positions.length}</span>
      </div>
    </div>
  )
}
