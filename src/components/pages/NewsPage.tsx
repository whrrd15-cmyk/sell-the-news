import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { NewsCard, EventCategory, Sector, JudgmentType } from '../../data/types'
import { getSourceLabel } from '../../engine/news'
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS, SECTOR_COLORS, SECTOR_LABELS, SOURCE_ICONS } from '../../data/constants'
import { CausalityChain } from '../news/CausalityChain'
import { useGameStore } from '../../stores/gameStore'

/**
 * 뉴스 페이지 — 게임 플로우 중심 재설계
 *
 * 3단계 계층: 속보(대형) → 일반(중형) → 소음(접기)
 * 기사 모달: 스킬 힌트 + 체인 예고 + 매매 액션 버튼
 * "뉴스를 읽고, 판단하고, 행동하라"
 */

interface NewsPageProps {
  news: NewsCard[]
  freshness: Record<string, number>
  unlockedSkills: string[]
  onNavigateToTrading?: (sectorFilter?: string) => void
}

const CATEGORIES: (EventCategory | 'all')[] = [
  'all', 'government', 'economic', 'technology', 'geopolitics', 'disaster', 'social', 'commodity',
]

function getReliabilityStars(r: number): string {
  if (r >= 0.8) return '★★★'
  if (r >= 0.5) return '★★☆'
  return '★☆☆'
}

function getReliabilityColor(r: number): string {
  if (r >= 0.8) return '#5ec269'
  if (r >= 0.5) return '#e88c3a'
  return '#e8534a'
}

export function NewsPage({ news, freshness, unlockedSkills, onNavigateToTrading }: NewsPageProps) {
  const [activeCat, setActiveCat] = useState<EventCategory | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noiseExpanded, setNoiseExpanded] = useState(false)

  const filtered = activeCat === 'all' ? news : news.filter(n => n.category === activeCat)

  // 3단계 분류
  const { breaking, standard, noise } = useMemo(() => {
    const breaking: NewsCard[] = []
    const standard: NewsCard[] = []
    const noise: NewsCard[] = []
    for (const card of filtered) {
      if (card.isNoise) {
        noise.push(card)
      } else if ((freshness[card.id] ?? 0) > 0.7) {
        breaking.push(card)
      } else {
        standard.push(card)
      }
    }
    return { breaking, standard, noise }
  }, [filtered, freshness])

  const selectedNews = selectedId ? news.find(n => n.id === selectedId) ?? null : null
  const hasDeepNews = unlockedSkills.includes('deep_news')
  const hasFactCheck = unlockedSkills.includes('fact_check')
  const hasSourceTracking = unlockedSkills.includes('source_tracking')
  const hasNoiseFilter = unlockedSkills.includes('noise_filter')

  return (
    <div className="news-v2">
      {/* 카테고리 탭 */}
      <div className="news-v2-tabs">
        {CATEGORIES.map(cat => {
          const color = cat === 'all' ? '#f0b429' : CATEGORY_COLORS[cat]
          const icon = cat === 'all' ? '📰' : CATEGORY_ICONS[cat]
          return (
            <button
              key={cat}
              className={`news-v2-tab ${activeCat === cat ? 'news-v2-tab--active' : ''}`}
              style={{ '--cat-color': color } as React.CSSProperties}
              onClick={() => setActiveCat(cat)}
            >
              <span>{icon}</span>
              <span>{cat === 'all' ? '전체' : CATEGORY_LABELS[cat]}</span>
            </button>
          )
        })}
      </div>

      {/* 뉴스 목록 */}
      <div className="news-v2-body">
        {filtered.length === 0 ? (
          <div className="news-v2-empty">해당 카테고리 뉴스가 없습니다</div>
        ) : (
          <>
            {/* ═══ Tier 1: 속보 ═══ */}
            {breaking.map(card => (
              <BreakingCard key={card.id} card={card} freshness={freshness[card.id] ?? 0} onClick={() => setSelectedId(card.id)} />
            ))}

            {/* ═══ Tier 2: 일반 뉴스 ═══ */}
            {standard.length > 0 && (
              <div className="news-v2-standard-grid">
                {standard.map(card => (
                  <StandardCard key={card.id} card={card} onClick={() => setSelectedId(card.id)} />
                ))}
              </div>
            )}

            {/* ═══ Tier 3: 시장 소음 ═══ */}
            {noise.length > 0 && (
              <div className="news-v2-noise-section">
                {hasNoiseFilter && (
                  <div className="px-3 py-1 mb-1 text-[10px] text-bal-green font-bold">
                    노이즈 필터 활성
                  </div>
                )}
                <button className="news-v2-noise-toggle" onClick={() => setNoiseExpanded(!noiseExpanded)}>
                  <span className="news-v2-noise-label">시장 소음</span>
                  <span className="news-v2-noise-count">{noise.length}건</span>
                  <span className="news-v2-noise-arrow">{noiseExpanded ? '▲' : '▼'}</span>
                </button>
                {noiseExpanded && (
                  <div className="news-v2-noise-list">
                    {noise.map(card => (
                      <button key={card.id} className="news-v2-noise-item" onClick={() => setSelectedId(card.id)}>
                        <span className="news-v2-noise-dot">·</span>
                        <span className="news-v2-noise-headline">{card.headline}</span>
                        <span className="news-v2-noise-source">{getSourceLabel(card.source)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ 기사 모달 ═══ */}
      <AnimatePresence>
        {selectedNews && (
          <motion.div className="news-v2-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedId(null)}>
            <motion.div className="news-v2-modal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onClick={e => e.stopPropagation()}>
              <button className="news-v2-modal-close" onClick={() => setSelectedId(null)}>✕</button>

              <div className="news-v2-modal-scroll">
                {/* 카테고리 보더 */}
                <div className="news-v2-modal-cat-bar" style={{ background: CATEGORY_COLORS[selectedNews.category] }} />

                {/* 메타 */}
                <div className="news-v2-modal-meta">
                  <span className="news-v2-modal-cat" style={{ color: CATEGORY_COLORS[selectedNews.category] }}>
                    {CATEGORY_ICONS[selectedNews.category]} {CATEGORY_LABELS[selectedNews.category]}
                  </span>
                  <span className="news-v2-modal-source" style={{ color: SOURCE_ICONS[selectedNews.source]?.color }}>
                    {SOURCE_ICONS[selectedNews.source]?.icon} {getSourceLabel(selectedNews.source)}
                  </span>
                  <span className="news-v2-modal-reliability" style={{ color: getReliabilityColor(selectedNews.reliability) }}>
                    {getReliabilityStars(selectedNews.reliability)} {(selectedNews.reliability * 100).toFixed(0)}%
                  </span>
                </div>

                {/* 헤드라인 */}
                <h2 className="news-v2-modal-title">{selectedNews.headline}</h2>

                {/* 본문 */}
                <p className="news-v2-modal-content">{selectedNews.content}</p>
                {selectedNews.body && <div className="news-v2-modal-body">{selectedNews.body}</div>}

                {/* 섹터 영향 */}
                {selectedNews.perceivedImpact.length > 0 && (
                  <div className="news-v2-modal-section">
                    <div className="news-v2-modal-section-title">예상 섹터 영향</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {selectedNews.perceivedImpact.map((si, i) => {
                        const key = si.sector as Sector
                        const color = si.sector === 'all' ? '#f0b429' : (SECTOR_COLORS[key] ?? '#888')
                        const label = si.sector === 'all' ? '전체' : (SECTOR_LABELS[key] ?? si.sector)
                        const arrow = si.impact > 0.3 ? '▲▲' : si.impact > 0 ? '▲' : si.impact < -0.3 ? '▼▼' : '▼'
                        return (
                          <span key={i} className="news-impact-tag" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
                            {label} {arrow}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 인과관계 */}
                <CausalityChain news={selectedNews} hasDeepNews={hasDeepNews} />

                {/* ═══ 스킬 잠금 힌트 ═══ */}
                <div className="news-v2-skill-hints">
                  {!hasFactCheck && (
                    <div className="news-v2-skill-hint">
                      🔒 <strong>팩트체크</strong> 스킬을 언락하면 신뢰도 등급을 볼 수 있습니다
                    </div>
                  )}
                  {!hasDeepNews && (
                    <div className="news-v2-skill-hint">
                      🔒 <strong>심층 뉴스</strong> 스킬을 언락하면 실제 영향과 인지된 영향의 차이를 볼 수 있습니다
                    </div>
                  )}
                  {!hasSourceTracking && (
                    <div className="news-v2-skill-hint">
                      🔒 <strong>출처 추적</strong> 스킬을 언락하면 가짜뉴스 확률을 볼 수 있습니다
                    </div>
                  )}
                </div>

                {/* ═══ 체인 이벤트 예고 ═══ */}
                {selectedNews.chainEventId && (
                  <div className="news-v2-chain-hint">
                    <span className="news-v2-chain-icon">⛓️</span>
                    <div>
                      <div className="news-v2-chain-title">후속 영향이 있을 수 있습니다</div>
                      <div className="news-v2-chain-desc">
                        예상 시점: 약 {selectedNews.chainDelay ?? 2}-{(selectedNews.chainDelay ?? 2) + 1}일 후
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ 뉴스 판단 (실시간 모드) ═══ */}
                <RealtimeJudgment newsId={selectedNews.id} news={selectedNews} freshness={freshness[selectedNews.id] ?? 0} />

                {/* 교육 노트 */}
                {selectedNews.educationalNote && (
                  <div className="news-v2-edu">💡 {selectedNews.educationalNote}</div>
                )}

                {/* ═══ 액션 버튼: 뉴스→매매 ═══ */}
                {selectedNews.perceivedImpact.length > 0 && onNavigateToTrading && (
                  <div className="news-v2-actions">
                    <div className="news-v2-actions-title">이 뉴스에 반응하기</div>
                    <div className="news-v2-actions-sectors">
                      {selectedNews.perceivedImpact.filter(si => si.sector !== 'all').map((si, i) => {
                        const key = si.sector as Sector
                        const color = SECTOR_COLORS[key] ?? '#888'
                        const label = SECTOR_LABELS[key] ?? si.sector
                        return (
                          <button key={i} className="news-v2-action-sector" style={{ color, borderColor: `${color}40` }}
                            onClick={() => { setSelectedId(null); onNavigateToTrading(si.sector) }}>
                            {label} 종목 보기
                          </button>
                        )
                      })}
                    </div>
                    <div className="news-v2-actions-trade">
                      <button className="news-v2-action-buy" onClick={() => { setSelectedId(null); onNavigateToTrading() }}>
                        📈 매수하러 가기
                      </button>
                      <button className="news-v2-action-sell" onClick={() => { setSelectedId(null); onNavigateToTrading() }}>
                        📉 매도하러 가기
                      </button>
                    </div>
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

// ═══ 실시간 뉴스 판단 ═══

function RealtimeJudgment({ newsId, news, freshness }: { newsId: string; news: NewsCard; freshness: number }) {
  const judgedNewsIds = useGameStore(s => s.judgedNewsIds)
  const judgeNewsRealtime = useGameStore(s => s.judgeNewsRealtime)
  const [sliderValue, setSliderValue] = useState(0)
  const [result, setResult] = useState<{ rpEarned: number; accuracy: string } | null>(null)

  const isJudged = judgedNewsIds.has(newsId)
  const isExpired = freshness < 0.3
  const canJudge = !isJudged && !isExpired

  const handleConfirm = useCallback(() => {
    const type: JudgmentType = sliderValue > 0 ? 'bullish' : sliderValue < 0 ? 'bearish' : 'bullish'
    const res = judgeNewsRealtime(newsId, type, sliderValue / 100)
    setResult(res)
  }, [newsId, sliderValue, judgeNewsRealtime])

  const handleFake = useCallback(() => {
    const res = judgeNewsRealtime(newsId, 'fake', 0)
    setResult(res)
  }, [newsId, judgeNewsRealtime])

  const handleSkip = useCallback(() => {
    judgeNewsRealtime(newsId, 'skip', 0)
    setResult({ rpEarned: 0, accuracy: 'skipped' })
  }, [newsId, judgeNewsRealtime])

  // 이미 판단 완료
  if (isJudged && !result) {
    return (
      <div className="news-v2-modal-section" style={{ opacity: 0.5 }}>
        <div className="text-[10px] text-bal-text-dim text-center">✅ 판단 완료</div>
      </div>
    )
  }

  // 결과 표시
  if (result) {
    const accuracyLabel: Record<string, string> = {
      fake_correct: '🎯 가짜뉴스 정확 감별!',
      strength: '🎯 방향 + 강도 적중!',
      direction: '👍 방향 적중',
      wrong: '❌ 오답',
      skipped: '⏭️ 건너뜀',
    }
    const rpColor = result.rpEarned > 0 ? '#5ec269' : '#8888aa'
    return (
      <motion.div
        className="news-v2-modal-section"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ background: `${rpColor}10`, border: `1px solid ${rpColor}30`, borderRadius: 8, padding: 12, textAlign: 'center' }}
      >
        <div className="text-sm font-bold" style={{ color: rpColor }}>
          {accuracyLabel[result.accuracy] ?? result.accuracy}
        </div>
        {result.rpEarned > 0 && (
          <div className="text-xs mt-1" style={{ color: '#9b72cf' }}>
            +{result.rpEarned} RP 획득!
          </div>
        )}
      </motion.div>
    )
  }

  // 만료
  if (isExpired) {
    return (
      <div className="news-v2-modal-section" style={{ opacity: 0.4 }}>
        <div className="text-[10px] text-bal-text-dim text-center">⏰ 판단 기한 만료 (신선도 {(freshness * 100).toFixed(0)}%)</div>
      </div>
    )
  }

  // 판단 UI
  return (
    <div className="news-v2-modal-section" style={{ background: 'rgba(91,155,213,0.05)', border: '1px solid rgba(91,155,213,0.2)', borderRadius: 8, padding: 12 }}>
      <div className="text-[11px] font-bold text-bal-blue mb-2">📊 이 뉴스를 어떻게 보십니까?</div>

      {/* 슬라이더 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] text-bal-red">악재</span>
        <input
          type="range"
          min={-100}
          max={100}
          step={5}
          value={sliderValue}
          onChange={e => setSliderValue(Number(e.target.value))}
          className="flex-1 accent-bal-blue"
          style={{ height: 6 }}
        />
        <span className="text-[9px] text-bal-green">호재</span>
      </div>

      {/* 현재 값 표시 */}
      <div className="text-center text-[10px] mb-3" style={{ color: sliderValue > 0 ? '#5ec269' : sliderValue < 0 ? '#e8534a' : '#8888aa' }}>
        {sliderValue > 0 ? `호재 +${sliderValue}` : sliderValue < 0 ? `악재 ${sliderValue}` : '중립'}
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={handleFake}
          className="flex-1 py-1.5 text-[10px] font-bold rounded transition-all"
          style={{ background: 'rgba(232,83,74,0.15)', color: '#e8534a', border: '1px solid rgba(232,83,74,0.3)' }}
        >
          🚫 가짜뉴스
        </button>
        <button
          onClick={handleConfirm}
          disabled={sliderValue === 0}
          className="flex-1 py-1.5 text-[10px] font-bold rounded transition-all disabled:opacity-30"
          style={{ background: 'rgba(91,155,213,0.15)', color: '#5b9bd5', border: '1px solid rgba(91,155,213,0.3)' }}
        >
          ✅ 판단 확정
        </button>
        <button
          onClick={handleSkip}
          className="px-2 py-1.5 text-[10px] font-bold rounded transition-all"
          style={{ background: 'rgba(136,136,170,0.1)', color: '#8888aa', border: '1px solid rgba(136,136,170,0.2)' }}
        >
          ⏭️
        </button>
      </div>

      <div className="text-[8px] text-bal-text-dim text-center mt-1.5">
        정확한 판단 = RP 획득 (방향+1, 강도+2, 가짜감별+3)
      </div>
    </div>
  )
}

// ═══ 서브 컴포넌트 ═══

function BreakingCard({ card, freshness, onClick }: { card: NewsCard; freshness: number; onClick: () => void }) {
  const catColor = CATEGORY_COLORS[card.category]
  const srcInfo = SOURCE_ICONS[card.source]
  return (
    <button className="news-v2-breaking" onClick={onClick} style={{ borderColor: `${catColor}40` }}>
      <div className="news-v2-breaking-badge">🔥 속보</div>
      <div className="news-v2-breaking-meta">
        <span style={{ color: catColor }}>{CATEGORY_ICONS[card.category]} {CATEGORY_LABELS[card.category]}</span>
        <span style={{ color: srcInfo?.color }}>{srcInfo?.icon} {getSourceLabel(card.source)}</span>
        <span style={{ color: getReliabilityColor(card.reliability) }}>{getReliabilityStars(card.reliability)}</span>
      </div>
      <h3 className="news-v2-breaking-title">{card.headline}</h3>
      <p className="news-v2-breaking-summary">{card.content}</p>
    </button>
  )
}

function StandardCard({ card, onClick }: { card: NewsCard; onClick: () => void }) {
  const catColor = CATEGORY_COLORS[card.category]
  const srcInfo = SOURCE_ICONS[card.source]
  const isJudged = useGameStore(s => s.judgedNewsIds.has(card.id))
  return (
    <button className="news-v2-standard" onClick={onClick} style={{ borderLeftColor: catColor, opacity: isJudged ? 0.6 : 1 }}>
      <div className="news-v2-standard-meta">
        <span style={{ color: catColor }}>{CATEGORY_ICONS[card.category]}</span>
        <span className="news-v2-standard-source" style={{ color: srcInfo?.color }}>{srcInfo?.icon} {getSourceLabel(card.source)}</span>
        <span style={{ color: getReliabilityColor(card.reliability), fontSize: 9 }}>{getReliabilityStars(card.reliability)}</span>
        {isJudged && <span style={{ fontSize: 9, color: '#5ec269' }}>✓판단</span>}
      </div>
      <div className="news-v2-standard-title">{card.headline}</div>
    </button>
  )
}
