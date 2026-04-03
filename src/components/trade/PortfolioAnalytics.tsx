import { useMemo } from 'react'
import { STOCKS } from '../../data/stocks'
import type { Portfolio, Sector } from '../../data/types'

interface PortfolioAnalyticsProps {
  portfolio: Portfolio
  prices: Record<string, number>
  totalFees: number
  realizedPnL: number
  portfolioValueHistory: number[]
}

const SECTORS: { key: Sector; label: string }[] = [
  { key: 'tech', label: '기술' },
  { key: 'energy', label: '에너' },
  { key: 'finance', label: '금융' },
  { key: 'consumer', label: '소비' },
  { key: 'healthcare', label: '헬스' },
]

export function PortfolioAnalytics({ portfolio, prices, totalFees, realizedPnL, portfolioValueHistory }: PortfolioAnalyticsProps) {
  const unrealizedPnL = useMemo(() => {
    return portfolio.positions.reduce((sum, pos) => {
      const price = prices[pos.stockId] ?? 0
      return sum + (price - pos.avgBuyPrice) * pos.shares
    }, 0)
  }, [portfolio.positions, prices])

  const totalValue = useMemo(() => {
    let v = portfolio.cash
    for (const pos of portfolio.positions) v += (prices[pos.stockId] ?? 0) * pos.shares
    return v
  }, [portfolio, prices])
  const totalReturn = (totalValue - 10000) / 10000

  const sectorContrib = useMemo(() => {
    const contrib: Record<string, number> = {}
    for (const { key } of SECTORS) contrib[key] = 0
    for (const pos of portfolio.positions) {
      const stock = STOCKS.find(s => s.id === pos.stockId)
      if (!stock) continue
      const pnl = ((prices[pos.stockId] ?? 0) - pos.avgBuyPrice) * pos.shares
      contrib[stock.sector] = (contrib[stock.sector] ?? 0) + pnl
    }
    return contrib
  }, [portfolio.positions, prices])

  const maxContrib = Math.max(1, ...Object.values(sectorContrib).map(Math.abs))

  const mdd = useMemo(() => {
    if (portfolioValueHistory.length < 2) return 0
    let peak = portfolioValueHistory[0]
    let maxDD = 0
    for (const v of portfolioValueHistory) {
      if (v > peak) peak = v
      const dd = (v - peak) / peak
      if (dd < maxDD) maxDD = dd
    }
    return maxDD
  }, [portfolioValueHistory])

  const svgPoints = useMemo(() => {
    const hist = portfolioValueHistory
    if (hist.length < 2) return ''
    const min = Math.min(...hist)
    const max = Math.max(...hist)
    const range = max - min || 1
    return hist.map((v, i) => {
      const x = (i / (hist.length - 1)) * 120
      const y = 55 - ((v - min) / range) * 50
      return `${x},${y}`
    }).join(' ')
  }, [portfolioValueHistory])

  return (
    <div className="portfolio-analytics">
      <div className="pa-card">
        <div className="pa-label">손익 요약</div>
        <div className={`pa-big-number ${totalReturn >= 0 ? 'pa-green' : 'pa-red'}`}>
          {totalReturn >= 0 ? '+' : ''}{(totalReturn * 100).toFixed(1)}%
        </div>
        <div className="pa-row">
          <span>실현</span>
          <span className={realizedPnL >= 0 ? 'pa-green' : 'pa-red'}>
            {realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(0)}
          </span>
        </div>
        <div className="pa-row">
          <span>미실현</span>
          <span className={unrealizedPnL >= 0 ? 'pa-green' : 'pa-red'}>
            {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(0)}
          </span>
        </div>
        <div className="pa-row">
          <span>수수료</span>
          <span className="pa-gold">-${totalFees.toFixed(0)}</span>
        </div>
      </div>

      <div className="pa-card">
        <div className="pa-label">섹터 기여도</div>
        <div className="pa-sector-bars">
          {SECTORS.map(({ key, label }) => {
            const val = sectorContrib[key] ?? 0
            const height = Math.max(2, (Math.abs(val) / maxContrib) * 50)
            const isPos = val >= 0
            return (
              <div key={key} className="pa-sector-col">
                <div
                  className="pa-sector-bar"
                  style={{
                    height: `${height}px`,
                    background: isPos ? 'rgba(94,194,105,0.7)' : 'rgba(232,83,74,0.7)',
                  }}
                />
                <span className="pa-sector-label">{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="pa-card">
        <div className="pa-label">포트폴리오 & MDD</div>
        {portfolioValueHistory.length >= 2 ? (
          <>
            <svg width="100%" height="55" viewBox="0 0 120 60" preserveAspectRatio="none" className="pa-mdd-svg">
              <polyline points={svgPoints} fill="none" stroke="#5ec269" strokeWidth="1.5" />
            </svg>
            <div className="pa-mdd-value pa-red">MDD: {(mdd * 100).toFixed(1)}%</div>
          </>
        ) : (
          <div className="pa-empty">데이터 수집 중...</div>
        )}
      </div>
    </div>
  )
}
