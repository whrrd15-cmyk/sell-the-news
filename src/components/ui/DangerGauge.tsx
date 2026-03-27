interface Props {
  level: number // 0~1
}

export function DangerGauge({ level }: Props) {
  if (level <= 0) return null

  const percent = Math.round(level * 100)
  const color =
    level < 0.3 ? '#4ade80'   // green
    : level < 0.6 ? '#facc15' // yellow
    : '#ef4444'                // red

  return (
    <div className="danger-gauge" title={`위험도 ${percent}%`}>
      <span className="danger-gauge-label" style={{ color }}>
        위험
      </span>
      <div className="danger-gauge-track">
        <div
          className="danger-gauge-fill"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      <span className="danger-gauge-value" style={{ color }}>
        {percent}%
      </span>
    </div>
  )
}
