import { useState, useMemo } from 'react'
import type { Portfolio, Sector } from '../../data/types'
import { STOCKS } from '../../data/stocks'
import { SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'

interface PortfolioOverviewProps {
  portfolio: Portfolio
  prices: Record<string, number>
}

const SECTORS: Sector[] = ['tech', 'energy', 'finance', 'consumer', 'healthcare']

export function PortfolioOverview({ portfolio, prices }: PortfolioOverviewProps) {
  const [collapsed, setCollapsed] = useState(true)

  const analysis = useMemo(() => {
    const sectorValues: Record<string, number> = {}
    let totalPositionValue = 0
    let unrealizedPnL = 0

    for (const pos of portfolio.positions) {
      const stock = STOCKS.find(s => s.id === pos.stockId)
      if (!stock || pos.shares <= 0) continue
      const price = prices[pos.stockId] ?? 0
      const value = pos.shares * price
      const sector = stock.isETF ? 'etf' : stock.sector
      sectorValues[sector] = (sectorValues[sector] ?? 0) + value
      totalPositionValue += value
      unrealizedPnL += (price - pos.avgBuyPrice) * pos.shares
    }

    const totalValue = portfolio.cash + totalPositionValue
    const cashRatio = totalValue > 0 ? portfolio.cash / totalValue : 1
    const sectorsHeld = SECTORS.filter(s => (sectorValues[s] ?? 0) > 0).length
    const pnlPercent = totalPositionValue > 0 ? unrealizedPnL / (totalPositionValue - unrealizedPnL) : 0

    return { sectorValues, totalPositionValue, totalValue, unrealizedPnL, pnlPercent, cashRatio, sectorsHeld }
  }, [portfolio, prices])

  if (portfolio.positions.length === 0) return null

  return (
    <div className="portfolio-overview">
      <button
        className="portfolio-overview-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="portfolio-overview-title">포트폴리오</span>
        <span className={`portfolio-overview-pnl ${analysis.unrealizedPnL >= 0 ? 'text-bal-green' : 'text-bal-red'}`}>
          {analysis.unrealizedPnL >= 0 ? '+' : ''}{Math.floor(analysis.unrealizedPnL).toLocaleString()}
          ({analysis.pnlPercent >= 0 ? '+' : ''}{(analysis.pnlPercent * 100).toFixed(1)}%)
        </span>
        <span className="portfolio-overview-toggle">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div className="portfolio-overview-body">
          {/* 섹터 비중 바 */}
          <div className="portfolio-sector-bar">
            {analysis.totalValue > 0 && (
              <>
                {/* 현금 */}
                <div
                  className="portfolio-sector-seg"
                  style={{
                    width: `${analysis.cashRatio * 100}%`,
                    background: '#8888aa',
                  }}
                  title={`현금 ${Math.round(analysis.cashRatio * 100)}%`}
                />
                {/* 섹터별 */}
                {SECTORS.map(sector => {
                  const value = analysis.sectorValues[sector] ?? 0
                  if (value <= 0) return null
                  const pct = value / analysis.totalValue
                  return (
                    <div
                      key={sector}
                      className="portfolio-sector-seg"
                      style={{
                        width: `${pct * 100}%`,
                        background: SECTOR_COLORS[sector],
                      }}
                      title={`${SECTOR_LABELS[sector]} ${Math.round(pct * 100)}%`}
                    />
                  )
                })}
              </>
            )}
          </div>

          {/* 범례 + 분산도 */}
          <div className="portfolio-overview-row">
            <div className="portfolio-overview-legend">
              <span className="portfolio-legend-item">
                <span className="portfolio-legend-dot" style={{ background: '#8888aa' }} />
                현금 {Math.round(analysis.cashRatio * 100)}%
              </span>
              {SECTORS.map(sector => {
                const value = analysis.sectorValues[sector] ?? 0
                if (value <= 0) return null
                const pct = value / analysis.totalValue
                return (
                  <span key={sector} className="portfolio-legend-item">
                    <span className="portfolio-legend-dot" style={{ background: SECTOR_COLORS[sector] }} />
                    {SECTOR_LABELS[sector]} {Math.round(pct * 100)}%
                  </span>
                )
              })}
            </div>

            <div className="portfolio-diversification">
              <span className="text-[9px] text-bal-text-dim">분산</span>
              {SECTORS.map(sector => (
                <span
                  key={sector}
                  className="portfolio-div-dot"
                  style={{
                    background: (analysis.sectorValues[sector] ?? 0) > 0
                      ? SECTOR_COLORS[sector]
                      : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
              <span className="text-[9px] text-bal-text-dim">{analysis.sectorsHeld}/5</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
