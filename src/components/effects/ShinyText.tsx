import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, useMotionValue, useAnimationFrame, useTransform } from 'motion/react'

interface ShinyTextProps {
  text: string
  disabled?: boolean
  speed?: number
  className?: string
  color?: string
  shineColor?: string
  spread?: number
  yoyo?: boolean
  direction?: 'left' | 'right'
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 2,
  className = '',
  color = '#b5b5b5',
  shineColor = '#ffffff',
  spread = 120,
  yoyo = false,
  direction = 'left',
}: ShinyTextProps) {
  const [isPaused] = useState(false)
  const progress = useMotionValue(0)
  const elapsedRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const directionRef = useRef(direction === 'left' ? 1 : -1)

  const animationDuration = speed * 1000

  useAnimationFrame(time => {
    if (disabled || isPaused) {
      lastTimeRef.current = null
      return
    }
    if (lastTimeRef.current === null) {
      lastTimeRef.current = time
      return
    }
    const deltaTime = time - lastTimeRef.current
    lastTimeRef.current = time
    elapsedRef.current += deltaTime

    if (yoyo) {
      const fullCycle = animationDuration * 2
      const cycleTime = elapsedRef.current % fullCycle
      if (cycleTime < animationDuration) {
        const p = (cycleTime / animationDuration) * 100
        progress.set(directionRef.current === 1 ? p : 100 - p)
      } else {
        const p = 100 - ((cycleTime - animationDuration) / animationDuration) * 100
        progress.set(directionRef.current === 1 ? p : 100 - p)
      }
    } else {
      const cycleTime = elapsedRef.current % animationDuration
      const p = (cycleTime / animationDuration) * 100
      progress.set(directionRef.current === 1 ? p : 100 - p)
    }
  })

  useEffect(() => {
    directionRef.current = direction === 'left' ? 1 : -1
    elapsedRef.current = 0
    progress.set(0)
  }, [direction])

  const backgroundPosition = useTransform(progress, p => `${150 - p * 2}% center`)

  const gradientStyle = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text' as const,
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  }

  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{ ...gradientStyle, backgroundPosition }}
    >
      {text}
    </motion.span>
  )
}
