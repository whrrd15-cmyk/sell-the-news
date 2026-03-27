import { motion } from 'motion/react'
import { NewsPanel } from '../news/NewsPanel'
import type { NewsCard } from '../../data/types'

interface NewsReferenceDrawerProps {
  isOpen: boolean
  onClose: () => void
  news: NewsCard[]
  unlockedSkills: string[]
}

export function NewsReferenceDrawer({ isOpen, onClose, news, unlockedSkills }: NewsReferenceDrawerProps) {
  if (!isOpen) return null

  return (
    <div className="news-drawer-overlay" onClick={onClose}>
      <motion.div
        className="news-drawer-panel"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="news-drawer-header">
          <span className="text-xs font-bold text-bal-blue">뉴스 참고</span>
          <button className="news-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="news-drawer-content">
          <NewsPanel news={news} unlockedSkills={unlockedSkills} />
        </div>
      </motion.div>
    </div>
  )
}
