import { motion } from 'motion/react'
import type { GamePhase } from '../../data/types'

interface PhaseCTAProps {
  phase: GamePhase
  onAdvanceToInvestment: () => void
  onAdvanceToResult: () => void
  onNextTurn: () => void
}

const PHASE_CONFIG: Record<string, { label: string; color: string; colorDim: string }> = {
  news: { label: '투자하기', color: '#5b9bd5', colorDim: 'rgba(91,155,213,0.15)' },
  investment: { label: '주 마감', color: '#f0b429', colorDim: 'rgba(240,180,41,0.15)' },
  result: { label: '다음 주', color: '#5ec269', colorDim: 'rgba(94,194,105,0.15)' },
}

export function PhaseCTA({ phase, onAdvanceToInvestment, onAdvanceToResult, onNextTurn }: PhaseCTAProps) {
  const config = PHASE_CONFIG[phase]
  if (!config) return null

  const handleClick = () => {
    if (phase === 'news') onAdvanceToInvestment()
    else if (phase === 'investment') onAdvanceToResult()
    else if (phase === 'result') onNextTurn()
  }

  return (
    <div className="phase-cta-container">
      <motion.button
        className="phase-cta-btn"
        style={{
          background: config.color,
          boxShadow: `0 4px 0 ${config.color}88, 0 0 20px ${config.colorDim}`,
        }}
        onClick={handleClick}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98, y: 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {config.label}
      </motion.button>
    </div>
  )
}
