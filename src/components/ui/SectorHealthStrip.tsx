import { useMemo } from 'react'
import type { Sector, ActiveEffect } from '../../data/types'
import { SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'

interface SectorHealthStripProps {
  sectorMomentum: Record<string, number>
  sectorBubble: Record<string, number>
  activeEffects: ActiveEffect[]
}

const SECTORS: Sector[] = ['tech', 'energy', 'finance', 'consumer', 'healthcare']

export function SectorHealthStrip({ sectorMomentum, sectorBubble, activeEffects }: SectorHealthStripProps) {
  const sectorData = useMemo(() =>
    SECTORS.map(sector => {
      const momentum = sectorMomentum[sector] ?? 0
      const bubble = sectorBubble[sector] ?? 0
      const effectCount = activeEffects.filter(e =>
        e.sectorImpacts.some(si => si.sector === sector)
      ).length
      return { sector, momentum, bubble, effectCount }
    }), [sectorMomentum, sectorBubble, activeEffects])

  return (
    <div className="sector-health-strip">
      {sectorData.map(({ sector, momentum, bubble, effectCount }) => {
        const color = SECTOR_COLORS[sector]
        const momPct = Math.min(Math.abs(momentum) * 100, 100)
        const isUp = momentum >= 0
        const bubbleRisk = bubble > 0.5 ? 'high' : bubble > 0.25 ? 'mid' : null

        return (
          <div
            key={sector}
            className="sector-health-item"
            style={{ '--sector-color': color } as React.CSSProperties}
          >
            {/* 섹터 이름 */}
            <span className="sector-health-label">{SECTOR_LABELS[sector]}</span>

            {/* 모멘텀 바 */}
            <div className="sector-health-bar">
              <div
                className={`sector-health-bar-fill ${isUp ? 'sector-health-bar-fill--up' : 'sector-health-bar-fill--down'}`}
                style={{ width: `${momPct}%` }}
              />
            </div>

            {/* 지표들 */}
            <div className="sector-health-indicators">
              <span className={`sector-health-mom ${isUp ? 'text-bal-green' : 'text-bal-red'}`}>
                {isUp ? '▲' : '▼'}{(Math.abs(momentum) * 100).toFixed(0)}
              </span>
              {bubbleRisk && (
                <span className={`sector-health-bubble ${bubbleRisk === 'high' ? 'sector-health-bubble--high' : 'sector-health-bubble--mid'}`}>
                  {bubbleRisk === 'high' ? '🫧' : '○'}
                </span>
              )}
              {effectCount > 0 && (
                <span className="sector-health-effects">{effectCount}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
