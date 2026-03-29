import type { NewsCard, Sector } from '../../data/types'
import { SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'

interface SectorImpactSummaryProps {
  news: NewsCard[]
}

const SECTORS: Sector[] = ['tech', 'energy', 'finance', 'consumer', 'healthcare']

export function SectorImpactSummary({ news }: SectorImpactSummaryProps) {
  // 모든 뉴스의 perceivedImpact를 섹터별로 합산
  const sectorTotals: Record<string, number> = {}
  for (const sector of SECTORS) sectorTotals[sector] = 0

  for (const n of news) {
    for (const si of n.perceivedImpact) {
      if (si.sector === 'all') {
        for (const s of SECTORS) sectorTotals[s] += si.impact
      } else if (si.sector in sectorTotals) {
        sectorTotals[si.sector] += si.impact
      }
    }
  }

  return (
    <div className="sector-impact-summary">
      <span className="sector-impact-summary-label">이번 주 예상 영향</span>
      <div className="sector-impact-summary-cards">
        {SECTORS.map(sector => {
          const total = sectorTotals[sector]
          const color = SECTOR_COLORS[sector]
          const arrow = total > 0.5 ? '▲▲' : total > 0.1 ? '▲' : total < -0.5 ? '▼▼' : total < -0.1 ? '▼' : '─'
          const valueColor = total > 0.1 ? '#5ec269' : total < -0.1 ? '#e8534a' : '#8888aa'

          return (
            <div
              key={sector}
              className="sector-impact-card"
              style={{ borderColor: `${color}30` }}
            >
              <span className="sector-impact-card-name" style={{ color }}>{SECTOR_LABELS[sector]}</span>
              <span className="sector-impact-card-arrow" style={{ color: valueColor }}>
                {arrow}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
