import type { MarketCondition } from '../../data/types'

interface MarketConditionBadgeProps {
  condition: MarketCondition
}

const CONDITION_CONFIG: Record<MarketCondition, { label: string; icon: string; color: string; bg: string }> = {
  bull_trend: { label: '상승 추세', icon: '📈', color: '#5ec269', bg: 'rgba(94,194,105,0.15)' },
  range_bound: { label: '횡보', icon: '📊', color: '#e88c3a', bg: 'rgba(232,140,58,0.15)' },
  bear_market: { label: '하락 추세', icon: '📉', color: '#e8534a', bg: 'rgba(232,83,74,0.15)' },
  neutral: { label: '중립', icon: '➖', color: '#8888aa', bg: 'rgba(136,136,170,0.10)' },
}

export function MarketConditionBadge({ condition }: MarketConditionBadgeProps) {
  if (condition === 'neutral') return null

  const { label, icon, color, bg } = CONDITION_CONFIG[condition]

  return (
    <div
      className="market-condition-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        background: bg,
        border: `1px solid ${color}33`,
        fontSize: 11,
        fontWeight: 600,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  )
}
