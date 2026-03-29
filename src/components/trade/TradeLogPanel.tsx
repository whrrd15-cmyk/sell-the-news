import { useMemo } from 'react'
import type { Portfolio } from '../../data/types'
import { formatWeekDay } from '../../engine/clock'
import { useTimeStore } from '../../stores/timeStore'

/**
 * 바이낸스 스타일 체결/포지션 패널
 * 2탭: 체결 내역 | 내 포지션
 */

interface TradeLogPanelProps {
  portfolio: Portfolio
  prices: Record<string, number>
}

export function TradeLogPanel({ portfolio, prices }: TradeLogPanelProps) {
  const gameTime = useTimeStore(s => s.gameTime)

  return (
    <div className="trade-log">
      {/* 내 포지션 */}
      <div className="trade-log-header">
        <span className="trade-log-title">내 포지션</span>
        <span className="text-[9px] text-bal-text-dim">
          현금 <span className="text-bal-gold font-bold">${Math.floor(portfolio.cash).toLocaleString()}</span>
        </span>
      </div>

      <div className="trade-log-body">
        {portfolio.positions.length === 0 ? (
          <div className="text-[10px] text-bal-text-dim text-center py-3">
            보유 포지션 없음
          </div>
        ) : (
          <table className="trade-log-table">
            <thead>
              <tr>
                <th>종목</th>
                <th>수량</th>
                <th>평단</th>
                <th>현재가</th>
                <th>손익</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions.filter(p => p.shares > 0).map(pos => {
                const price = prices[pos.stockId] ?? 0
                const pnl = (price - pos.avgBuyPrice) * pos.shares
                const pnlPct = pos.avgBuyPrice > 0 ? (price - pos.avgBuyPrice) / pos.avgBuyPrice : 0
                const isProfit = pnl >= 0
                return (
                  <tr key={pos.stockId}>
                    <td className="font-bold">{pos.stockId.split('_').pop()?.toUpperCase()}</td>
                    <td>{pos.shares}</td>
                    <td>${pos.avgBuyPrice.toFixed(0)}</td>
                    <td>${price.toFixed(0)}</td>
                    <td className={isProfit ? 'text-bal-green' : 'text-bal-red'}>
                      {isProfit ? '+' : ''}{pnl.toFixed(0)}
                      <span className="text-[8px] ml-0.5">({isProfit ? '+' : ''}{(pnlPct * 100).toFixed(1)}%)</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
