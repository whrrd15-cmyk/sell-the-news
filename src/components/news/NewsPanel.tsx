import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { NewsCard, EventCategory } from '../../data/types'
import { CATEGORY_LABELS } from '../../data/constants'
import { NewsListItem } from './NewsListItem'
import { NewsArticleView } from './NewsArticleView'

interface NewsPanelProps {
  news: NewsCard[]
  unlockedSkills: string[]
}

const CATEGORY_FILTERS: (EventCategory | 'all')[] = [
  'all', 'government', 'economic', 'technology', 'geopolitics', 'disaster', 'social', 'commodity',
]

export function NewsPanel({ news, unlockedSkills }: NewsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<EventCategory | 'all'>('all')
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null)

  const filteredNews = activeCategory === 'all'
    ? news
    : news.filter(n => n.category === activeCategory)

  const selectedNews = selectedNewsId
    ? news.find(n => n.id === selectedNewsId) ?? null
    : null

  const handleSelectNews = useCallback((id: string) => {
    setSelectedNewsId(id)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedNewsId(null)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence mode="wait">
        {selectedNews ? (
          /* ────── 기사 상세 뷰 ────── */
          <motion.div
            key="article"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <NewsArticleView
              news={selectedNews}
              unlockedSkills={unlockedSkills}
              onBack={handleBack}
            />
          </motion.div>
        ) : (
          /* ────── 뉴스 리스트 뷰 (네이버 스타일) ────── */
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            {/* 카테고리 탭 */}
            <div className="news-category-bar">
              {CATEGORY_FILTERS.map(cat => (
                <button
                  key={cat}
                  className={`news-category-tab ${activeCategory === cat ? 'news-category-tab--active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat === 'all' ? '전체' : CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* 뉴스 리스트 */}
            <div className="flex-1 min-h-0 overflow-y-auto news-list-scroll">
              {filteredNews.length === 0 ? (
                <div className="text-center py-10 text-bal-text-dim text-xs">
                  해당 카테고리 뉴스가 없습니다
                </div>
              ) : (
                <div className="news-list">
                  {filteredNews.map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.15 }}
                      {...(i === 0 ? { 'data-tutorial': 'news-item' } : {})}
                    >
                      <NewsListItem
                        news={n}
                        unlockedSkills={unlockedSkills}
                        onClick={() => handleSelectNews(n.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
