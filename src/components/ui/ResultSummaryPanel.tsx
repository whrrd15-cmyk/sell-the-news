import type { Portfolio } from '../../data/types'
import { STOCKS } from '../../data/stocks'

interface ResultSummaryPanelProps {
  portfolio: Portfolio
  prices: Record<string, number>
  lastFeedback: { newsId: string; note: string; wasFake: boolean }[]
  totalReturn: number
  interestEarned?: number
}

export function ResultSummaryPanel({ portfolio, prices, lastFeedback, totalReturn, interestEarned = 0 }: ResultSummaryPanelProps) {
  const activePositions = portfolio.positions.filter(p => p.shares > 0)

  return (
    <div className="result-summary">
      {/* 포트폴리오 변화 */}
      <div className="result-summary-section">
        <div className="result-summary-title">포트폴리오</div>
        <div className="result-summary-row">
          <span className="text-bal-text-dim">현금</span>
          <span className="text-bal-gold font-bold">${Math.floor(portfolio.cash).toLocaleString()}</span>
        </div>
        {interestEarned > 0 && (
          <div className="result-summary-row">
            <span className="text-bal-text-dim">이자 수익</span>
            <span className="text-bal-gold font-bold text-[10px]">+${interestEarned}</span>
          </div>
        )}
        <div className="result-summary-row">
          <span className="text-bal-text-dim">수익률</span>
          <span className={`font-bold ${totalReturn >= 0 ? 'text-bal-green' : 'text-bal-red'}`}>
            {totalReturn >= 0 ? '+' : ''}{(totalReturn * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 종목별 손익 */}
      {activePositions.length > 0 && (
        <div className="result-summary-section">
          <div className="result-summary-title">보유 종목</div>
          {activePositions.map(pos => {
            const stock = STOCKS.find(s => s.id === pos.stockId)
            const curPrice = prices[pos.stockId] ?? 0
            const pnl = pos.avgBuyPrice > 0 ? (curPrice - pos.avgBuyPrice) / pos.avgBuyPrice : 0
            return (
              <div key={pos.stockId} className="result-summary-row">
                <span className="text-white text-[10px]">{stock?.ticker ?? pos.stockId}</span>
                <span className={`font-bold text-[10px] ${pnl >= 0 ? 'text-bal-green' : 'text-bal-red'}`}>
                  {pnl >= 0 ? '+' : ''}{(pnl * 100).toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 뉴스 피드백 */}
      {lastFeedback.length > 0 && (
        <div className="result-summary-section">
          <div className="result-summary-title">뉴스 피드백</div>
          {lastFeedback.map((fb, i) => (
            <div key={i} className="result-feedback-item">
              <span className={`result-feedback-badge ${fb.wasFake ? 'result-feedback-badge--fake' : 'result-feedback-badge--real'}`}>
                {fb.wasFake ? '가짜' : '진짜'}
              </span>
              <span className="result-feedback-note">{fb.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
