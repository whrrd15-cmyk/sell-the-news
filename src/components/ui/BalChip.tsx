import type { ReactNode } from 'react'

interface BalChipProps {
  /** 표시할 값 */
  children: ReactNode
  /** 칩 색상 */
  color: 'gold' | 'blue' | 'green' | 'red' | 'purple' | 'white'
  /** 라벨 (칩 좌측) */
  label?: string
  /** 작은 사이즈 */
  small?: boolean
}

const COLOR_MAP: Record<BalChipProps['color'], { bg: string; border: string; text: string; shadow: string }> = {
  gold:   { bg: 'rgba(240,180,41,0.15)',  border: '#f0b429', text: '#f0b429', shadow: 'rgba(240,180,41,0.2)' },
  blue:   { bg: 'rgba(91,155,213,0.15)',   border: '#5b9bd5', text: '#5b9bd5', shadow: 'rgba(91,155,213,0.2)' },
  green:  { bg: 'rgba(94,194,105,0.15)',   border: '#5ec269', text: '#5ec269', shadow: 'rgba(94,194,105,0.2)' },
  red:    { bg: 'rgba(232,83,74,0.15)',    border: '#e8534a', text: '#e8534a', shadow: 'rgba(232,83,74,0.2)' },
  purple: { bg: 'rgba(155,114,207,0.15)',  border: '#9b72cf', text: '#9b72cf', shadow: 'rgba(155,114,207,0.2)' },
  white:  { bg: 'rgba(232,232,240,0.1)',   border: '#8888aa', text: '#e8e8f0', shadow: 'rgba(136,136,170,0.15)' },
}

export function BalChip({ children, color, label, small }: BalChipProps) {
  const c = COLOR_MAP[color]
  const py = small ? '1px' : '2px'
  const px = small ? '6px' : '8px'
  const fontSize = small ? '10px' : '12px'

  return (
    <span
      className="inline-flex items-center gap-1 font-bold font-pixel"
      style={{
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: '6px',
        padding: `${py} ${px}`,
        fontSize,
        color: c.text,
        boxShadow: `0 2px 0 ${c.shadow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
        lineHeight: 1.2,
      }}
    >
      {label && (
        <span style={{ fontSize: small ? '8px' : '10px', opacity: 0.7 }}>{label}</span>
      )}
      {children}
    </span>
  )
}
