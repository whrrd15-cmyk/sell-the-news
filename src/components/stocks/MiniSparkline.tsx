interface MiniSparklineProps {
  prices: number[]
  width?: number
  height?: number
}

export function MiniSparkline({ prices, width = 60, height = 20 }: MiniSparklineProps) {
  if (prices.length < 2) return <div style={{ width, height }} />

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const pad = 1

  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (p - min) / range) * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')

  const isUp = prices[prices.length - 1] >= prices[0]
  const color = isUp ? '#5ec269' : '#e8534a'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
