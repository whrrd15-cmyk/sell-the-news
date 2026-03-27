interface TargetPanelProps {
  targetReturn: number
  currentReturn: number
}

export function TargetPanel({ targetReturn, currentReturn }: TargetPanelProps) {
  const isAhead = currentReturn >= targetReturn
  const progress = Math.min(currentReturn / targetReturn, 2) * 100

  return (
    <div className="text-center space-y-2">
      <div className="text-xs text-bal-text-dim">이번 런 목표</div>
      <div
        className="text-3xl font-bold"
        style={{ color: isAhead ? '#5ec269' : '#e8534a' }}
      >
        {(targetReturn * 100).toFixed(0)}%
      </div>
      <div className="text-xs text-bal-text-dim">
        현재: <span className={isAhead ? 'text-bal-green' : 'text-bal-red'}>
          {(currentReturn * 100).toFixed(1)}%
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-bal-bg-dark border border-bal-border-dim rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{
            width: `${Math.max(0, Math.min(progress, 100))}%`,
            background: isAhead ? '#5ec269' : '#e8534a',
          }}
        />
      </div>
    </div>
  )
}
