import { useRef, useCallback, useState } from 'react'

interface CardTiltOptions {
  maxTilt?: number   // 최대 기울기 (도), 기본 8
  scale?: number     // hover 스케일, 기본 1.03
  glare?: boolean    // 빛 반사 효과, 기본 true
}

interface CardTiltReturn {
  ref: React.RefObject<HTMLDivElement | null>
  containerStyle: React.CSSProperties
  cardStyle: React.CSSProperties
  shineStyle: React.CSSProperties
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void
    onMouseEnter: () => void
    onMouseLeave: () => void
  }
}

export function useCardTilt(options?: CardTiltOptions): CardTiltReturn {
  const { maxTilt = 8, scale = 1.03, glare = true } = options ?? {}
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')
  const [shinePos, setShinePos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width   // 0~1
    const y = (e.clientY - rect.top) / rect.height    // 0~1

    const rotateY = (x - 0.5) * maxTilt * 2   // 좌우 기울기
    const rotateX = (0.5 - y) * maxTilt * 2   // 상하 기울기

    setTransform(`perspective(800px) rotateX(${rotateX.toFixed(1)}deg) rotateY(${rotateY.toFixed(1)}deg) scale3d(${scale},${scale},1)`)
    setShinePos({ x: x * 100, y: y * 100 })
  }, [maxTilt, scale])

  const onMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const onMouseLeave = useCallback(() => {
    setIsHovered(false)
    setTransform('')
    setShinePos({ x: 50, y: 50 })
  }, [])

  const containerStyle: React.CSSProperties = {
    perspective: '800px',
  }

  const cardStyle: React.CSSProperties = {
    transform: isHovered ? transform : 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
    transition: isHovered ? 'none' : 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
    transformStyle: 'preserve-3d',
    willChange: isHovered ? 'transform' : 'auto',
  }

  const shineStyle: React.CSSProperties = glare ? {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    opacity: isHovered ? 0.12 : 0,
    transition: isHovered ? 'none' : 'opacity 0.3s',
    background: `radial-gradient(circle at ${shinePos.x}% ${shinePos.y}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
  } : { display: 'none' }

  return {
    ref,
    containerStyle,
    cardStyle,
    shineStyle,
    handlers: { onMouseMove, onMouseEnter, onMouseLeave },
  }
}
