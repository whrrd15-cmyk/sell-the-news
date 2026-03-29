import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import type { NewsCard, EventCategory, Sector } from '../../data/types'
import { getSourceLabel } from '../../engine/news'
import { CATEGORY_LABELS, SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'
import { CausalityChain } from '../news/CausalityChain'
import { BalPanel } from '../ui/BalPanel'

/**
 * 뉴스 페이지
 *
 * "정보를 소화하는 공간"
 * 유저가 직접 찾아와서 기사를 읽고 분석한다.
 * 매매 페이지에서는 헤드라인만 보이고, 여기서 전문과 영향 분석을 확인한다.
 */

interface NewsPageProps {
  news: NewsCard[]
  freshness: Record<string, number>
  unlockedSkills: string[]
}

const CATEGORY_FILTERS: (EventCategory | 'all')[] = [
  'all', 'government', 'economic', 'technology', 'geopolitics', 'disaster', 'social', 'commodity',
]

export function NewsPage({ news, freshness, unlockedSkills }: NewsPageProps) {
  const [activeCategory, setActiveCategory] = useState<EventCategory | 'all'>('all')
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null)

  const hasDeepNews = unlockedSkills.includes('deep_news')

  const filteredNews = activeCategory === 'all'
    ? news
    : news.filter(n => n.category === activeCategory)

  const selectedNews = selectedNewsId ? news.find(n => n.id === selectedNewsId) ?? null : null

  return (
    <div className="news-page">
      {/* 왼쪽: 뉴스 리스트 */}
      <div className="news-page-list">
        <BalPanel label="뉴스" className="flex flex-col h-full overflow-hidden">
          {/* 카테고리 필터 */}
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

          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredNews.map((card, i) => {
              const fr = freshness[card.id] ?? 0
              const isSelected = card.id === selectedNewsId
              return (
                <motion.button
                  key={card.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`news-page-item ${isSelected ? 'news-page-item--selected' : ''}`}
                  onClick={() => setSelectedNewsId(card.id)}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="news-feed-source">{getSourceLabel(card.source)}</span>
                    <span className="news-feed-category">{CATEGORY_LABELS[card.category]}</span>
                    {fr > 0.7 && <span className="news-feed-new-badge" style={{ position: 'static' }}>NEW</span>}
                  </div>
                  <div className="text-[11px] font-bold text-bal-text leading-tight">
                    {card.headline}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </BalPanel>
      </div>

      {/* 오른쪽: 뉴스 상세 */}
      <div className="news-page-detail">
        {selectedNews ? (
          <BalPanel
            label={selectedNews.headline.slice(0, 30) + (selectedNews.headline.length > 30 ? '...' : '')}
            className="flex flex-col h-full overflow-hidden"
          >
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {/* 출처 + 카테고리 */}
              <div className="flex items-center gap-2">
                <span className="news-feed-source">{getSourceLabel(selectedNews.source)}</span>
                <span className="news-feed-category">{CATEGORY_LABELS[selectedNews.category]}</span>
                <span className="text-[9px] text-bal-text-dim">
                  신뢰도: {(selectedNews.reliability * 100).toFixed(0)}%
                </span>
              </div>

              {/* 헤드라인 */}
              <h2 className="text-sm font-bold text-white leading-snug">
                {selectedNews.headline}
              </h2>

              {/* 요약 */}
              <p className="text-xs text-bal-text leading-relaxed">
                {selectedNews.content}
              </p>

              {/* 기사 전문 */}
              {selectedNews.body && (
                <div className="text-xs text-bal-text-dim leading-relaxed whitespace-pre-line">
                  {selectedNews.body}
                </div>
              )}

              {/* 섹터 영향 (여기서만 표시) */}
              {selectedNews.perceivedImpact.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] text-bal-text-dim font-bold">예상 섹터 영향</div>
                  <div className="flex gap-1 flex-wrap">
                    {selectedNews.perceivedImpact.map((si, i) => {
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
                </div>
              )}

              {/* 인과관계 다이어그램 */}
              <CausalityChain news={selectedNews} hasDeepNews={hasDeepNews} />

              {/* 교육 노트 */}
              {selectedNews.educationalNote && (
                <div className="text-[10px] text-bal-purple p-2 rounded" style={{ background: 'rgba(155,114,207,0.08)', border: '1px solid rgba(155,114,207,0.15)' }}>
                  💡 {selectedNews.educationalNote}
                </div>
              )}
            </div>
          </BalPanel>
        ) : (
          <div className="flex-1 flex items-center justify-center text-bal-text-dim text-xs">
            <div className="text-center">
              <div className="text-3xl mb-3">📰</div>
              <div className="text-sm font-bold mb-1">뉴스를 선택하세요</div>
              <div className="text-[10px] opacity-60">
                기사를 읽고 시장에 미칠 영향을 스스로 판단하세요
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
