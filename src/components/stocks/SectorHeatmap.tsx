import { STOCKS } from '../../data/stocks'
import { useMarketStore } from '../../stores/marketStore'
import type { Sector } from '../../data/types'

const SECTOR_META: { sector: Sector; label: string; icon: string }[] = [
  { sector: 'tech', label: '기술', icon: '💻' },
  { sector: 'energy', label: '에너지', icon: '⚡' },
  { sector: 'finance', label: '금융', icon: '🏦' },
  { sector: 'consumer', label: '소비재', icon: '🛒' },
  { sector: 'healthcare', label: '헬스케어', icon: '🏥' },
]

interface SectorHeatmapProps {
  onSelectSector?: (sector: Sector) => void
}

export function SectorHeatmap({ onSelectSector }: SectorHeatmapProps) {
  const market = useMarketStore(s => s.market)

  const sectors = SECTOR_META.map(({ sector, label, icon }) => {
    const sectorStocks = STOCKS.filter(s => s.sector === sector && !s.isETF)
    let totalChange = 0
    const stockDetails: { ticker: string; change: number }[] = []

    for (const stock of sectorStocks) {
      const price = market.prices[stock.id] ?? stock.basePrice
      const change = (price - stock.basePrice) / stock.basePrice
      totalChange += change
      stockDetails.push({ ticker: stock.ticker, change })
    }

    const avgChange = sectorStocks.length > 0 ? totalChange / sectorStocks.length : 0
    const momentum = market.sectorMomentum[sector] ?? 0
    const bubble = market.sectorBubble[sector] ?? 0

    return { sector, label, icon, avgChange, momentum, bubble, stocks: stockDetails }
  })

  return (
    <div className="sector-heatmap">
      <div className="sector-heatmap-title">SECTOR MAP</div>
      <div className="sector-heatmap-grid">
        {sectors.map(s => {
          const intensity = Math.min(1, Math.abs(s.avgChange) * 3)
          const isUp = s.avgChange >= 0
          const bg = isUp
            ? `rgba(94,194,105,${0.12 + intensity * 0.35})`
            : `rgba(232,83,74,${0.12 + intensity * 0.35})`
          const border = isUp
            ? `rgba(94,194,105,${0.25 + intensity * 0.4})`
            : `rgba(232,83,74,${0.25 + intensity * 0.4})`

          return (
            <div
              key={s.sector}
              className="sector-heatmap-cell"
              style={{ background: bg, borderColor: border }}
              onClick={() => onSelectSector?.(s.sector)}
            >
              <div className="sector-heatmap-header">
                <span className="sector-heatmap-icon">{s.icon}</span>
                <span className="sector-heatmap-label">{s.label}</span>
              </div>
              <div className="sector-heatmap-change" style={{ color: isUp ? '#5ec269' : '#e8534a' }}>
                {isUp ? '+' : ''}{(s.avgChange * 100).toFixed(1)}%
              </div>
              <div className="sector-heatmap-momentum">
                {s.momentum > 0.01 ? '↗' : s.momentum < -0.01 ? '↘' : '→'}
                {s.bubble > 0.3 && <span className="sector-heatmap-bubble">🫧</span>}
              </div>
              <div className="sector-heatmap-stocks">
                {s.stocks.map(st => (
                  <span key={st.ticker} className="sector-heatmap-stock" style={{ color: st.change >= 0 ? '#5ec269' : '#e8534a' }}>
                    {st.ticker} {st.change >= 0 ? '+' : ''}{(st.change * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
