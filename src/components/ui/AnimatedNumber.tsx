import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  /** 접두사 (예: '$') */
  prefix?: string
  /** 접미사 (예: '%') */
  suffix?: string
  /** 소수점 자릿수 */
  decimals?: number
  /** 천 단위 구분자 사용 */
  separator?: boolean
  /** 애니메이션 시간 (ms) */
  duration?: number
  /** 텍스트 색상 클래스 */
  className?: string
  /** 값 변화 시 플래시 색상 표시 */
  flash?: boolean
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  separator = true,
  duration = 500,
  className = '',
  flash = false,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [flashColor, setFlashColor] = useState<string | null>(null)
  const prevRef = useRef(value)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const prev = prevRef.current
    const diff = value - prev
    prevRef.current = value

    if (diff === 0) return

    // 플래시 효과
    if (flash && diff !== 0) {
      setFlashColor(diff > 0 ? 'rgba(94,194,105,0.25)' : 'rgba(232,83,74,0.25)')
      setTimeout(() => setFlashColor(null), 400)
    }

    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(prev + diff * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration, flash])

  const formatted = separator
    ? Math.floor(displayValue).toLocaleString()
    : decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.floor(displayValue).toString()

  return (
    <span
      className={`inline-block transition-colors duration-300 ${className}`}
      style={{
        backgroundColor: flashColor ?? 'transparent',
        borderRadius: '3px',
        padding: flashColor ? '0 2px' : undefined,
      }}
    >
      {prefix}{formatted}{suffix}
    </span>
  )
}
