import { useInView, useMotionValue, useSpring } from 'motion/react'
import { useEffect, useRef } from 'react'

interface CountUpProps {
  to: number
  from?: number
  delay?: number
  duration?: number
  className?: string
  startWhen?: boolean
  separator?: string
  suffix?: string
  onEnd?: () => void
}

export default function CountUp({
  to,
  from = 0,
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  suffix = '',
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(from)
  const damping = 20 + 40 * (1 / duration)
  const stiffness = 100 * (1 / duration)
  const springValue = useSpring(motionValue, { damping, stiffness })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  useEffect(() => {
    if (ref.current) ref.current.textContent = String(from) + suffix
  }, [from, suffix])

  useEffect(() => {
    if (isInView && startWhen) {
      const t = setTimeout(() => motionValue.set(to), delay * 1000)
      const d = setTimeout(() => onEnd?.(), (delay + duration) * 1000)
      return () => { clearTimeout(t); clearTimeout(d) }
    }
  }, [isInView, startWhen, motionValue, from, to, delay, onEnd, duration])

  useEffect(() => {
    const unsub = springValue.on('change', (latest: number) => {
      if (ref.current) {
        const formatted = separator
          ? Intl.NumberFormat('en-US', { useGrouping: true }).format(Math.round(latest)).replace(/,/g, separator)
          : String(Math.round(latest))
        ref.current.textContent = formatted + suffix
      }
    })
    return unsub
  }, [springValue, separator, suffix])

  return <span className={className} ref={ref} />
}
