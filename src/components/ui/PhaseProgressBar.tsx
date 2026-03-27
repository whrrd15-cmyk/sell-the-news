import { useState } from 'react'
import { motion } from 'motion/react'
import type { GamePhase } from '../../data/types'
import { SFX, bgm } from '../../utils/sound'

interface PhaseProgressBarProps {
  phase: GamePhase
  turn: number
  maxTurns: number
  runName: string
}

const PHASES: { key: GamePhase; label: string; step: number }[] = [
  { key: 'news', label: '뉴스', step: 1 },
  { key: 'investment', label: '투자', step: 2 },
  { key: 'result', label: '결과', step: 3 },
]

function getPhaseStep(phase: GamePhase): number {
  if (phase === 'news') return 1
  if (phase === 'investment' || phase === 'analysis') return 2
  return 3 // result, event
}

export function PhaseProgressBar({ phase, turn, maxTurns, runName }: PhaseProgressBarProps) {
  const currentStep = getPhaseStep(phase)
  const [muted, setMuted] = useState(false)

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    SFX.muted = next
    bgm.muted = next
  }

  return (
    <div className="phase-progress-bar">
      <div className="phase-progress-left">
        <span className="phase-progress-run">{runName} (분기)</span>
        <span className="phase-progress-week">WEEK {turn}/{maxTurns}</span>
      </div>

      <div className="phase-progress-steps">
        {PHASES.map((p, i) => {
          const isComplete = p.step < currentStep
          const isCurrent = p.step === currentStep
          const isPending = p.step > currentStep

          return (
            <div key={p.key} className="phase-progress-step-group">
              {i > 0 && (
                <div className={`phase-progress-line ${isComplete ? 'phase-progress-line--done' : ''}`} />
              )}
              <div className={`phase-progress-step ${
                isCurrent ? 'phase-progress-step--current' :
                isComplete ? 'phase-progress-step--done' :
                'phase-progress-step--pending'
              }`}>
                {isComplete ? (
                  <svg width={10} height={10} viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="phase-progress-step-num">{p.step}</span>
                )}
              </div>
              <span className={`phase-progress-label ${
                isCurrent ? 'phase-progress-label--current' :
                isComplete ? 'phase-progress-label--done' :
                ''
              }`}>
                {p.label}
              </span>
              {isCurrent && (
                <motion.div
                  className="phase-progress-glow"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={toggleMute}
        className="phase-progress-mute"
        title={muted ? '사운드 켜기' : '사운드 끄기'}
      >
        {muted ? (
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
            <path d="M2 5h3l4-3v12l-4-3H2V5z" fill="currentColor" opacity={0.4} />
            <path d="M12 4l-5 8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        ) : (
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
            <path d="M2 5h3l4-3v12l-4-3H2V5z" fill="currentColor" opacity={0.6} />
            <path d="M11 5.5c.7.7 1 1.5 1 2.5s-.3 1.8-1 2.5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M13 3.5c1.2 1.2 1.8 2.7 1.8 4.5s-.6 3.3-1.8 4.5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  )
}
