import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { NewsCard } from '../../data/types'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../data/constants'

/**
 * 속보 토스트 알림 — 긴급 픽셀 스타일
 * 매매 페이지에서 임팩트 뉴스 도착 시 표시, 8초 후 자동 소멸
 */

const AUTO_DISMISS_MS = 8000

interface NewsToastProps {
  news: NewsCard | null
  onRead: (id: string) => void
  onDismiss: () => void
}

export function NewsToast({ news, onRead, onDismiss }: NewsToastProps) {
  const [progress, setProgress] = useState(100)
  const startRef = useRef(0)
  const rafRef = useRef(0)

  // 프로그레스 바 애니메이션 + 자동 소멸
  useEffect(() => {
    if (!news) { setProgress(100); return }
    startRef.current = Date.now()
    setProgress(100)

    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const remaining = Math.max(0, 1 - elapsed / AUTO_DISMISS_MS)
      setProgress(remaining * 100)
      if (remaining <= 0) {
        onDismiss()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [news, onDismiss])

  const categoryColor = news ? CATEGORY_COLORS[news.category] : '#e8534a'
  const categoryLabel = news ? CATEGORY_LABELS[news.category] : ''

  // 섹터 영향 표시
  const impacts = news?.actualImpact?.filter(si => si.impact !== 0) ?? []

  return (
    <AnimatePresence>
      {news && (
        <motion.div
          className="ntoast"
          initial={{ opacity: 0, x: 80, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 80, scale: 0.9 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        >
          {/* 스캔라인 오버레이 */}
          <div className="ntoast-scanlines" />

          {/* 상단: 카운트다운 프로그레스 바 */}
          <div className="ntoast-progress-track">
            <div
              className="ntoast-progress-fill"
              style={{ width: `${progress}%`, background: categoryColor }}
            />
          </div>

          {/* 속보 태그 */}
          <div className="ntoast-tag" style={{ background: categoryColor }}>
            <span className="ntoast-tag-dot" />
            <span>BREAKING</span>
          </div>

          {/* 카테고리 */}
          <div className="ntoast-category" style={{ color: categoryColor }}>
            {categoryLabel}
          </div>

          {/* 헤드라인 */}
          <div className="ntoast-headline">{news.headline}</div>

          {/* 섹터 영향 칩 */}
          {impacts.length > 0 && (
            <div className="ntoast-impacts">
              {impacts.map((si, i) => {
                const sectorName = si.sector === 'all' ? '전체'
                  : { tech: '기술', energy: '에너지', finance: '금융', consumer: '소비재', healthcare: '헬스케어' }[si.sector] || si.sector
                const isUp = si.impact > 0
                return (
                  <span key={i} className={`ntoast-impact ${isUp ? 'ntoast-impact--up' : 'ntoast-impact--down'}`}>
                    {sectorName} {isUp ? '▲' : '▼'}
                  </span>
                )
              })}
            </div>
          )}

          {/* 하단 액션 */}
          <div className="ntoast-actions">
            <button className="ntoast-btn ntoast-btn--read" onClick={() => onRead(news.id)}>
              뉴스 보기
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
