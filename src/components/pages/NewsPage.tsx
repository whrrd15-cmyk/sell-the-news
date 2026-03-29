import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { NewsCard, EventCategory, Sector } from '../../data/types'
import { getSourceLabel } from '../../engine/news'
import { CATEGORY_LABELS, SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'
import { CausalityChain } from '../news/CausalityChain'

/**
 * 뉴스 페이지 — 네이버뉴스 스타일
 *
 * "뉴스를 읽는 것이 투자의 시작이다."
 *
 * 대형 헤드라인 카드 + 소형 카드 그리드 + 실시간 피드
 * 기사 클릭 시 모달로 전문 표시
 */

interface NewsPageProps {
  news: NewsCard[]
  freshness: Record<string, number>
  unlockedSkills: string[]
}

const CATEGORIES: (EventCategory | 'all')[] = [
  'all', 'government', 'economic', 'technology', 'geopolitics', 'disaster', 'social', 'commodity',
]

function getReliabilityStars(reliability: number): string {
  if (reliability >= 0.8) return '★★★'
  if (reliability >= 0.5) return '★★☆'
  return '★☆☆'
}

export function NewsPage({ news, freshness, unlockedSkills }: NewsPageProps) {
  const [activeCat, setActiveCat] = useState<EventCategory | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = activeCat === 'all' ? news : news.filter(n => n.category === activeCat)
  const headline = filtered[0] ?? null
  const smallCards = filtered.slice(1, 4)
  const feedItems = filtered.slice(4)

  const selectedNews = selectedId ? news.find(n => n.id === selectedId) ?? null : null
  const hasDeepNews = unlockedSkills.includes('deep_news')

  return (
    <div className="naver-news-page">
      {/* 카테고리 탭 */}
      <div className="naver-cat-bar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`naver-cat-tab ${activeCat === cat ? 'naver-cat-tab--active' : ''}`}
            onClick={() => setActiveCat(cat)}
          >
            {cat === 'all' ? '전체' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="naver-news-body">
        {filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-bal-text-dim text-sm">
            해당 카테고리 뉴스가 없습니다
          </div>
        ) : (
          <>
            {/* 헤드라인 대형 카드 */}
            {headline && (
              <button className="naver-headline-card" onClick={() => setSelectedId(headline.id)}>
                <div className="naver-headline-badge">🔥 TODAY'S HEADLINE</div>
                <h2 className="naver-headline-title">{headline.headline}</h2>
                <div className="naver-headline-meta">
                  <span className="naver-headline-source">{getSourceLabel(headline.source)}</span>
                  <span className="naver-headline-cat">{CATEGORY_LABELS[headline.category]}</span>
                  {(freshness[headline.id] ?? 0) > 0.7 && <span className="naver-headline-new">NEW</span>}
                  <span className="naver-headline-stars">{getReliabilityStars(headline.reliability)}</span>
                </div>
                <p className="naver-headline-summary">{headline.content}</p>
              </button>
            )}

            {/* 소형 카드 그리드 */}
            {smallCards.length > 0 && (
              <div className="naver-small-grid">
                {smallCards.map(card => (
                  <button key={card.id} className="naver-small-card" onClick={() => setSelectedId(card.id)}>
                    <div className="naver-small-meta">
                      <span className="naver-small-source">{getSourceLabel(card.source)}</span>
                      <span className="naver-small-cat">{CATEGORY_LABELS[card.category]}</span>
                      {(freshness[card.id] ?? 0) > 0.7 && <span className="naver-headline-new">NEW</span>}
                    </div>
                    <div className="naver-small-title">{card.headline}</div>
                    <div className="naver-small-stars">{getReliabilityStars(card.reliability)}</div>
                  </button>
                ))}
              </div>
            )}

            {/* 실시간 피드 */}
            {feedItems.length > 0 && (
              <div className="naver-feed">
                <div className="naver-feed-header">최신 뉴스</div>
                {feedItems.map(card => (
                  <button key={card.id} className="naver-feed-item" onClick={() => setSelectedId(card.id)}>
                    <span className="naver-feed-dot">📰</span>
                    <span className="naver-feed-title">{card.headline}</span>
                    <span className="naver-feed-source">{getSourceLabel(card.source)}</span>
                    <span className="naver-feed-stars">{getReliabilityStars(card.reliability)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 기사 모달 */}
      <AnimatePresence>
        {selectedNews && (
          <motion.div
            className="naver-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              className="naver-modal"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="naver-modal-close" onClick={() => setSelectedId(null)}>✕</button>

              <div className="naver-modal-body">
                <div className="naver-modal-meta">
                  <span className="naver-headline-source">{getSourceLabel(selectedNews.source)}</span>
                  <span className="naver-headline-cat">{CATEGORY_LABELS[selectedNews.category]}</span>
                  <span className="text-[10px] text-bal-text-dim">
                    신뢰도 {(selectedNews.reliability * 100).toFixed(0)}% {getReliabilityStars(selectedNews.reliability)}
                  </span>
                </div>

                <h2 className="naver-modal-title">{selectedNews.headline}</h2>

                <p className="naver-modal-content">{selectedNews.content}</p>

                {selectedNews.body && (
                  <div className="naver-modal-full">{selectedNews.body}</div>
                )}

                {/* 섹터 영향 태그 */}
                {selectedNews.perceivedImpact.length > 0 && (
                  <div className="naver-modal-impacts">
                    <div className="text-[9px] text-bal-text-dim font-bold mb-1">예상 영향</div>
                    <div className="flex gap-1 flex-wrap">
                      {selectedNews.perceivedImpact.map((si, i) => {
                        const key = si.sector as Sector
                        const color = si.sector === 'all' ? '#f0b429' : (SECTOR_COLORS[key] ?? '#888')
                        const label = si.sector === 'all' ? '전체' : (SECTOR_LABELS[key] ?? si.sector)
                        const arrow = si.impact > 0.3 ? '▲▲' : si.impact > 0 ? '▲' : si.impact < -0.3 ? '▼▼' : '▼'
                        return (
                          <span key={i} className="news-impact-tag" style={{ color, background: `${color}12`, border: `1px solid ${color}25` }}>
                            {label}{arrow}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 인과관계 */}
                <CausalityChain news={selectedNews} hasDeepNews={hasDeepNews} />

                {/* 교육 노트 */}
                {selectedNews.educationalNote && (
                  <div className="naver-modal-edu">
                    💡 {selectedNews.educationalNote}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
