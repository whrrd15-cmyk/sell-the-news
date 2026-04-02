import { useMemo } from 'react'

interface JudgmentSliderProps {
  value: number         // -100 to +100
  onChange: (value: number) => void
  onConfirm: () => void
  disabled?: boolean
}

export function JudgmentSlider({ value, onChange, onConfirm, disabled }: JudgmentSliderProps) {
  const label = useMemo(() => {
    if (value === 0) return '중립'
    const dir = value > 0 ? '호재' : '악재'
    return `${dir} ${value > 0 ? '+' : ''}${value}%`
  }, [value])

  const labelColor = value > 0 ? 'var(--color-bal-green)' : value < 0 ? 'var(--color-bal-red)' : 'var(--color-bal-text-dim)'
  const confirmColor = value > 0 ? 'var(--color-bal-green)' : value < 0 ? 'var(--color-bal-red)' : '#555'

  return (
    <div className="judgment-slider">
      <div className="judgment-slider-labels">
        <span className="judgment-slider-label-bear">악재</span>
        <span className="judgment-slider-value" style={{ color: labelColor }}>
          {label}
        </span>
        <span className="judgment-slider-label-bull">호재</span>
      </div>

      <input
        type="range"
        min={-100}
        max={100}
        step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
      />

      <button
        className="judgment-slider-confirm"
        style={{ background: value !== 0 ? confirmColor : '#333' }}
        onClick={onConfirm}
        disabled={disabled || value === 0}
      >
        {value === 0 ? '슬라이더를 움직여 판단하세요' : '확정'}
      </button>
    </div>
  )
}
