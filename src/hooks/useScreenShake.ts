import { useRef, useCallback } from 'react'

interface ScreenShakeOptions {
  intensity?: number  // 흔들림 강도 (px), 기본 4
  duration?: number   // 흔들림 시간 (ms), 기본 300
}

export function useScreenShake(options?: ScreenShakeOptions) {
  const { intensity = 4, duration = 300 } = options ?? {}
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const shake = useCallback(() => {
    const el = ref.current
    if (!el) return

    const start = performance.now()
    cancelAnimationFrame(rafRef.current)

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = elapsed / duration

      if (progress >= 1) {
        el.style.transform = ''
        return
      }

      // 감쇠하는 랜덤 오프셋
      const decay = 1 - progress
      const x = (Math.random() - 0.5) * 2 * intensity * decay
      const y = (Math.random() - 0.5) * 2 * intensity * decay
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [intensity, duration])

  return { ref, shake }
}
