import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { NewsJudgmentCard } from './NewsJudgmentCard'
import { AnalysisSummary } from './AnalysisSummary'
import { SFX } from '../../utils/sound'
import type { JudgmentType } from '../../data/types'

type ExitDirection = 'right' | 'left' | 'down' | 'up'

const EXIT_VARIANTS: Record<ExitDirection, { x?: number; y?: number; scale?: number; rotate?: number; opacity: number }> = {
  right: { x: 350, y: -80, rotate: 15, opacity: 0 },
  left: { x: -350, y: -80, rotate: -15, opacity: 0 },
  down: { y: 200, scale: 0.5, opacity: 0 },
  up: { y: -60, opacity: 0 },
}

function getExitDirection(type: JudgmentType): ExitDirection {
  switch (type) {
    case 'bullish': return 'right'
    case 'bearish': return 'left'
    case 'fake': return 'down'
    case 'skip': return 'up'
  }
}

export function NewsAnalystView() {
  const {
    currentNews, currentNewsIndex, allNewsJudged, newsJudgments,
    unlockedSkills, judgeNews, skipNews, advanceToInvestmentPhase,
  } = useGameStore()

  const [exitDir, setExitDir] = useState<ExitDirection>('up')
  const [flashColor, setFlashColor] = useState<string | null>(null)

  const currentCard = currentNewsIndex < currentNews.length ? currentNews[currentNewsIndex] : null
  const total = currentNews.length

  const triggerFlash = useCallback((color: string) => {
    setFlashColor(color)
    setTimeout(() => setFlashColor(null), 200)
  }, [])

  const handleJudge = useCallback((type: JudgmentType, sliderValue: number) => {
    if (!currentCard) return
    setExitDir(getExitDirection(type))

    // Flash color
    if (type === 'bullish') triggerFlash('rgba(94,194,105,0.15)')
    else if (type === 'bearish') triggerFlash('rgba(232,83,74,0.15)')
    else if (type === 'fake') triggerFlash('rgba(240,180,41,0.15)')

    SFX.cardFlick()
    judgeNews(currentCard.id, type, sliderValue)

    // Next card enter sound
    setTimeout(() => {
      if (currentNewsIndex + 1 < total) SFX.cardReveal()
    }, 300)
  }, [currentCard, currentNewsIndex, total, judgeNews, triggerFlash])

  const handleSkip = useCallback(() => {
    if (!currentCard) return
    setExitDir('up')
    SFX.cardFlick()
    skipNews(currentCard.id)

    setTimeout(() => {
      if (currentNewsIndex + 1 < total) SFX.cardReveal()
    }, 300)
  }, [currentCard, currentNewsIndex, total, skipNews])

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-2 relative">
      {/* 배경 플래시 */}
      {flashColor && (
        <div
          className="judgment-flash"
          style={{ boxShadow: `inset 0 0 120px ${flashColor}` }}
        />
      )}

      {!allNewsJudged ? (
        <>
          {/* 진행 표시 */}
          <div className="text-center mb-4">
            <div className="text-xs text-bal-text-dim mb-2 font-bold">
              뉴스 분석 {Math.min(currentNewsIndex + 1, total)}/{total}
            </div>
            <div className="progress-dots">
              {currentNews.map((n, i) => {
                const judgment = newsJudgments.find(j => j.newsId === n.id)
                const isCompleted = i < currentNewsIndex
                const isCurrent = i === currentNewsIndex

                let dotColor = 'transparent'
                if (isCompleted && judgment) {
                  if (judgment.type === 'bullish') dotColor = 'var(--color-bal-green)'
                  else if (judgment.type === 'bearish') dotColor = 'var(--color-bal-red)'
                  else if (judgment.type === 'fake') dotColor = 'var(--color-bal-gold)'
                  else dotColor = 'var(--color-bal-text-dim)'
                }

                return (
                  <div
                    key={n.id}
                    className={`progress-dot ${isCompleted ? 'progress-dot--completed' : ''} ${isCurrent ? 'progress-dot--current' : ''}`}
                    style={isCompleted ? { background: dotColor } : undefined}
                  />
                )
              })}
            </div>
          </div>

          {/* 카드 영역 */}
          <AnimatePresence mode="wait">
            {currentCard && (
              <motion.div
                key={currentCard.id}
                initial={{ y: 80, opacity: 0, scale: 0.92 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={EXIT_VARIANTS[exitDir]}
                transition={{
                  type: 'spring',
                  damping: 22,
                  stiffness: 280,
                }}
              >
                <NewsJudgmentCard
                  news={currentCard}
                  unlockedSkills={unlockedSkills}
                  onJudge={handleJudge}
                  onSkip={handleSkip}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* 분석 요약 */
        <AnalysisSummary
          news={currentNews}
          judgments={newsJudgments}
          onAdvanceToInvestment={advanceToInvestmentPhase}
        />
      )}
    </div>
  )
}
