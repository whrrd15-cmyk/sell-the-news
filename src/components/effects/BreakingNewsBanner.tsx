import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { SFX } from '../../utils/sound'

export function BreakingNewsBanner() {
  const { breakingNews, breakingNewsDismissed, dismissBreakingNews } = useGameStore()
  const [played, setPlayed] = useState<string | null>(null)

  const visible = breakingNews && !breakingNewsDismissed

  // Play SFX on first appearance
  useEffect(() => {
    if (breakingNews && breakingNews.id !== played) {
      SFX.breakingNews()
      setPlayed(breakingNews.id)
    }
  }, [breakingNews, played])

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => dismissBreakingNews(), 10000)
    return () => clearTimeout(timer)
  }, [visible, dismissBreakingNews])

  return (
    <AnimatePresence>
      {visible && breakingNews && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 280 }}
          style={{
            position: 'fixed',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            width: 'min(90vw, 600px)',
          }}
        >
          <div className="breaking-news-pixel">
            {/* 도트 패턴 오버레이 */}
            <div className="breaking-news-dots" />

            <div className="breaking-news-inner">
              {/* 속보 라벨 블록 */}
              <div className="breaking-news-label">
                <motion.span
                  className="breaking-news-dot"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <span>속보</span>
              </div>

              {/* 헤드라인 + 섹터 영향 */}
              <div className="breaking-news-content">
                <div className="breaking-news-headline">
                  {breakingNews.headline}
                </div>
                <div className="breaking-news-impacts">
                  {breakingNews.sectorImpacts.map((si, i) => {
                    const name = si.sector === 'all' ? '전체'
                      : { tech: '기술', energy: '에너지', finance: '금융', consumer: '소비재', healthcare: '헬스케어' }[si.sector] || si.sector
                    return (
                      <span
                        key={i}
                        className={si.impact > 0 ? 'impact-up' : 'impact-down'}
                      >
                        {name} {si.impact > 0 ? '▲' : '▼'}{Math.abs(si.impact * 100).toFixed(0)}%
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* 닫기 버튼 */}
              <button
                onClick={() => dismissBreakingNews()}
                className="breaking-news-close"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
