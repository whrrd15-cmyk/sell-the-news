import { useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { NewsCard as NewsCardType, Sector } from '../../data/types'
import { getSourceLabel } from '../../engine/news'
import { CATEGORY_LABELS, SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'
import { useCardTilt } from '../../hooks/useCardTilt'

/**
 * 실시간 뉴스 피드 패널
 *
 * 교육 포인트: "새로운 뉴스에 즉시 반응하는 것이 항상 좋은 것은 아니다.
 * 뉴스의 신뢰도와 실제 영향을 냉정하게 분석하라."
 */

interface NewsFeedPanelProps {
  news: NewsCardType[]
  freshness: Record<string, number>
  unreadCount: number
  onMarkRead: (id: string) => void
  unlockedSkills: string[]
}

export function NewsFeedPanel({ news, freshness, unreadCount, onMarkRead, unlockedSkills }: NewsFeedPanelProps) {
  if (news.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-bal-text-dim text-xs p-4">
        <div className="text-center">
          <div className="text-2xl mb-2">📰</div>
          <div>장이 열리면 뉴스가 들어옵니다</div>
          <div className="text-[9px] mt-1 opacity-60">뉴스를 분석하고 스스로 판단하세요</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      {unreadCount > 0 && (
        <div className="news-feed-unread-bar">
          <span className="news-feed-unread-dot" />
          새 뉴스 {unreadCount}건
        </div>
      )}

      {/* 뉴스 리스트 */}
      <div className="flex-1 min-h-0 overflow-y-auto news-feed-scroll">
        <AnimatePresence initial={false}>
          {news.map((card) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              transition={{ duration: 0.3, type: 'spring', damping: 20 }}
            >
              <NewsFeedItem
                card={card}
                freshness={freshness[card.id] ?? 0}
                onClick={() => onMarkRead(card.id)}
                unlockedSkills={unlockedSkills}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ═══ 개별 뉴스 아이템 ═══

interface NewsFeedItemProps {
  card: NewsCardType
  freshness: number
  onClick: () => void
  unlockedSkills: string[]
}

function NewsFeedItem({ card, freshness, onClick, unlockedSkills }: NewsFeedItemProps) {
  const isFresh = freshness > 0.7
  const isStale = freshness < 0.3
  const opacity = Math.max(0.4, 0.4 + freshness * 0.6)

  return (
    <button
      className="news-feed-item"
      onClick={onClick}
      style={{ opacity }}
    >
      {/* 신선도 표시 */}
      {isFresh && <span className="news-feed-new-badge">NEW</span>}
      {isStale && <span className="news-feed-old-badge">OLD</span>}

      {/* 출처 + 카테고리 */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="news-feed-source">{getSourceLabel(card.source)}</span>
        <span className="news-feed-category">{CATEGORY_LABELS[card.category]}</span>
      </div>

      {/* 헤드라인 */}
      <div className="news-feed-headline">{card.headline}</div>

      {/* 섹터 임팩트 태그 */}
      {card.perceivedImpact.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {card.perceivedImpact.map((si, i) => {
            const sectorKey = si.sector as Sector
            const color = si.sector === 'all' ? '#f0b429' : (SECTOR_COLORS[sectorKey] ?? '#888')
            const label = si.sector === 'all' ? '전체' : (SECTOR_LABELS[sectorKey] ?? si.sector)
            const arrow = si.impact > 0.3 ? '▲▲' : si.impact > 0 ? '▲' : si.impact < -0.3 ? '▼▼' : '▼'
            return (
              <span key={i} className="news-impact-tag" style={{ color, background: `${color}12`, border: `1px solid ${color}25` }}>
                {label}{arrow}
              </span>
            )
          })}
        </div>
      )}
    </button>
  )
}
