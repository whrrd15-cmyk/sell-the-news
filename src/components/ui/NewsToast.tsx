import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { NewsCard } from '../../data/types'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../../data/constants'

/**
 * 뉴스 토스트 알림
 * 매매 페이지에서 임팩트 뉴스 도착 시 하단에 잠시 표시
 */

interface NewsToastProps {
  news: NewsCard | null
  onRead: (id: string) => void
  onDismiss: () => void
}

export function NewsToast({ news, onRead, onDismiss }: NewsToastProps) {
  useEffect(() => {
    if (!news) return
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [news, onDismiss])

  return (
    <AnimatePresence>
      {news && (
        <motion.div
          className="news-toast"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20 }}
          style={{ borderColor: `${CATEGORY_COLORS[news.category]}40` }}
        >
          <div className="news-toast-header">
            <span className="news-toast-badge" style={{ color: CATEGORY_COLORS[news.category] }}>
              {CATEGORY_ICONS[news.category]} 속보
            </span>
          </div>
          <div className="news-toast-headline">{news.headline}</div>
          <div className="news-toast-actions">
            <button className="news-toast-read" onClick={() => onRead(news.id)}>읽기</button>
            <button className="news-toast-close" onClick={onDismiss}>닫기</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
