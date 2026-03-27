import { motion } from 'motion/react'

interface BouncyTextProps {
  text: string
  className?: string
  /** 바운스 진폭 (px) */
  amplitude?: number
  /** 한 사이클 시간 (초) */
  period?: number
  /** 글자 간 딜레이 비율 */
  stagger?: number
}

export function BouncyText({
  text,
  className = '',
  amplitude = 4,
  period = 2,
  stagger = 0.08,
}: BouncyTextProps) {
  return (
    <span className={`inline-flex ${className}`} aria-label={text}>
      {text.split('').map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          className="inline-block"
          animate={{
            y: [0, -amplitude, 0],
          }}
          transition={{
            duration: period,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * stagger,
          }}
          style={{ whiteSpace: char === ' ' ? 'pre' : undefined }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  )
}
