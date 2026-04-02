import { useMemo } from 'react'
import { motion } from 'motion/react'
import type { JudgmentType } from '../../data/types'

interface JudgmentStampProps {
  type: JudgmentType
  value?: number
  onAnimationComplete: () => void
}

const STAMP_CONFIG: Record<string, { text: string; className: string }> = {
  bullish: { text: '호재!', className: 'judgment-stamp--bullish' },
  bearish: { text: '악재!', className: 'judgment-stamp--bearish' },
  fake: { text: 'FAKE!', className: 'judgment-stamp--fake' },
}

export function JudgmentStamp({ type, onAnimationComplete }: JudgmentStampProps) {
  const config = STAMP_CONFIG[type]
  if (!config) return null

  const rotation = useMemo(() => (Math.random() - 0.5) * 10, [])

  return (
    <motion.div
      className={`judgment-stamp ${config.className}`}
      style={{ rotate: rotation }}
      initial={{ scale: 1.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 400 }}
      onAnimationComplete={onAnimationComplete}
    >
      {config.text}
    </motion.div>
  )
}
