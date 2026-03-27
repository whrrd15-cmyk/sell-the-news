import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'motion/react'

interface SplitTextProps {
  text: string
  className?: string
  delay?: number
  duration?: number
  splitBy?: 'characters' | 'words'
  staggerFrom?: 'first' | 'last' | 'center'
  onAnimationComplete?: () => void
}

export default function SplitText({
  text,
  className = '',
  delay = 50,
  duration = 0.5,
  splitBy = 'characters',
  staggerFrom = 'first',
  onAnimationComplete,
}: SplitTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [hasAnimated, setHasAnimated] = useState(false)

  const elements = splitBy === 'words' ? text.split(' ') : text.split('')

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true)
    }
  }, [isInView, hasAnimated])

  const getDelay = (index: number) => {
    const len = elements.length
    switch (staggerFrom) {
      case 'last':
        return (len - 1 - index) * (delay / 1000)
      case 'center': {
        const center = (len - 1) / 2
        return Math.abs(center - index) * (delay / 1000)
      }
      default:
        return index * (delay / 1000)
    }
  }

  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {elements.map((el, i) => (
        <motion.span
          key={`${el}-${i}`}
          className="inline-block"
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={
            hasAnimated
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, y: 20, filter: 'blur(4px)' }
          }
          transition={{
            duration,
            delay: getDelay(i),
            ease: [0.25, 0.1, 0.25, 1],
          }}
          onAnimationComplete={
            i === elements.length - 1 ? onAnimationComplete : undefined
          }
        >
          {el === ' ' ? '\u00A0' : el}
          {splitBy === 'words' && i < elements.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  )
}
