import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { generateSocialPosts, type SocialPost } from '../../engine/social'
import { generateIndicators, type EconomicIndicator } from '../../engine/indicators'

/**
 * 사회정보 페이지 — SNS 여론 + 경제 지표
 *
 * 뉴스 페이지와 같은 원리: 계층 구조 + 읽고 해석하기 쉬운 플로우
 *
 * 여론: 인기글(대형) → 일반글(소형) → 분위기 요약 바
 * 경제지표: 카드 형태 + 변화 강조 + 중요도 시각화
 */

interface SocialPageProps {
  herdSentiment: number
  panicLevel: number
  tickCount: number
  runNumber: number
  week: number
  marketTrend: number
}

type SocialTab = 'feed' | 'indicators'

export function SocialPage({ herdSentiment, panicLevel, tickCount, runNumber, week, marketTrend }: SocialPageProps) {
  const [activeTab, setActiveTab] = useState<SocialTab>('feed')

  const posts = useMemo(() =>
    generateSocialPosts(herdSentiment, panicLevel, Math.floor(tickCount / 10) * 10, 12),
  [herdSentiment, panicLevel, Math.floor(tickCount / 10)])

  const indicators = useMemo(() =>
    generateIndicators(runNumber, week, marketTrend),
  [runNumber, week, marketTrend])

  return (
    <div className="social-v2">
      {/* 탭 */}
      <div className="social-v2-tabs">
        <button className={`social-v2-tab ${activeTab === 'feed' ? 'social-v2-tab--active' : ''}`}
          style={{ '--tab-color': '#5b9bd5' } as React.CSSProperties}
          onClick={() => setActiveTab('feed')}>
          💬 여론
        </button>
        <button className={`social-v2-tab ${activeTab === 'indicators' ? 'social-v2-tab--active' : ''}`}
          style={{ '--tab-color': '#f0b429' } as React.CSSProperties}
          onClick={() => setActiveTab('indicators')}>
          📊 경제지표
        </button>
      </div>

      <div className="social-v2-body">
        {activeTab === 'feed' ? (
          <SocialFeedV2 posts={posts} />
        ) : (
          <IndicatorsV2 indicators={indicators} />
        )}
      </div>

      <div className="social-v2-footer">
        {activeTab === 'feed'
          ? '💡 여론은 시장의 거울이지만, 거울에 비친 모습이 항상 진실은 아니다.'
          : '💡 숫자는 거짓말하지 않지만, 해석은 사람마다 다르다.'
        }
      </div>
    </div>
  )
}

// ═══ 여론 피드 v2 ═══

function SocialFeedV2({ posts }: { posts: SocialPost[] }) {
  // 인기글 (좋아요 상위 2개) vs 일반글
  const sorted = useMemo(() => [...posts].sort((a, b) => b.likes - a.likes), [posts])
  const hot = sorted.slice(0, 2)
  const rest = sorted.slice(2)

  // 분위기 집계 (게시글 감정 분석 — 간접적)
  const sentimentSummary = useMemo(() => {
    let bullish = 0, bearish = 0, neutral = 0
    for (const p of posts) {
      const text = p.content
      if (text.includes('올') || text.includes('좋') || text.includes('사') || text.includes('기분') || text.includes('크게')) bullish++
      else if (text.includes('팔') || text.includes('불안') || text.includes('떨어') || text.includes('무서') || text.includes('손절')) bearish++
      else neutral++
    }
    const total = posts.length || 1
    return {
      bullish: Math.round(bullish / total * 100),
      bearish: Math.round(bearish / total * 100),
      neutral: Math.round(neutral / total * 100),
    }
  }, [posts])

  return (
    <div className="social-feed-v2">
      {/* 분위기 바 */}
      <div className="sentiment-bar">
        <div className="sentiment-bar-label">여론 분위기</div>
        <div className="sentiment-bar-track">
          <div className="sentiment-bar-seg sentiment-bar-seg--bull" style={{ width: `${sentimentSummary.bullish}%` }}>
            {sentimentSummary.bullish > 15 && `${sentimentSummary.bullish}%`}
          </div>
          <div className="sentiment-bar-seg sentiment-bar-seg--neutral" style={{ width: `${sentimentSummary.neutral}%` }}>
            {sentimentSummary.neutral > 15 && `${sentimentSummary.neutral}%`}
          </div>
          <div className="sentiment-bar-seg sentiment-bar-seg--bear" style={{ width: `${sentimentSummary.bearish}%` }}>
            {sentimentSummary.bearish > 15 && `${sentimentSummary.bearish}%`}
          </div>
        </div>
        <div className="sentiment-bar-legend">
          <span className="text-[#5ec269]">😊 낙관 {sentimentSummary.bullish}%</span>
          <span className="text-[#8888aa]">😐 중립 {sentimentSummary.neutral}%</span>
          <span className="text-[#e8534a]">😰 비관 {sentimentSummary.bearish}%</span>
        </div>
      </div>

      {/* 🔥 인기 게시글 (대형) */}
      {hot.length > 0 && (
        <div className="social-hot-section">
          <div className="social-section-label">🔥 인기 게시글</div>
          {hot.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="social-hot-post">
              <div className="social-hot-header">
                <span className="social-hot-avatar">{post.avatar}</span>
                <span className="social-hot-author">{post.author}</span>
                <span className="social-hot-time">{post.minutesAgo}분 전</span>
                {post.likes >= 500 && <span className="social-hot-badge">HOT</span>}
              </div>
              <div className="social-hot-content">{post.content}</div>
              <div className="social-hot-actions">
                <span className="social-hot-action social-hot-action--likes">❤️ {fmtCount(post.likes)}</span>
                <span className="social-hot-action">💬 {fmtCount(post.comments)}</span>
                <span className="social-hot-action">🔄 {fmtCount(post.shares)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 일반 게시글 (소형 리스트) */}
      {rest.length > 0 && (
        <div className="social-rest-section">
          <div className="social-section-label">최근 게시글</div>
          <AnimatePresence initial={false}>
            {rest.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className="social-rest-post">
                <div className="social-rest-left">
                  <span className="social-rest-avatar">{post.avatar}</span>
                </div>
                <div className="social-rest-body">
                  <div className="social-rest-header">
                    <span className="social-rest-author">{post.author}</span>
                    <span className="social-rest-time">{post.minutesAgo}분 전</span>
                  </div>
                  <div className="social-rest-content">{post.content}</div>
                  <div className="social-rest-stats">
                    <span>❤️ {fmtCount(post.likes)}</span>
                    <span>💬 {fmtCount(post.comments)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function fmtCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

// ═══ 경제 지표 v2 (카드형) ═══

function IndicatorsV2({ indicators }: { indicators: EconomicIndicator[] }) {
  return (
    <div className="indicators-v2">
      <div className="indicators-v2-grid">
        {indicators.map(ind => {
          const diff = ind.current - ind.previous
          const isNegativeMetric = ['unemployment', 'cpi'].includes(ind.id)
          const isGood = diff === 0 ? null
            : (diff > 0 && !isNegativeMetric) || (diff < 0 && isNegativeMetric)
          const color = isGood === null ? '#8888aa' : isGood ? '#5ec269' : '#e8534a'
          const absDiff = Math.abs(diff)
          const isSignificant = absDiff > 0.5

          return (
            <div key={ind.id} className={`indicator-card ${isSignificant ? 'indicator-card--significant' : ''}`}
              style={{ borderColor: isSignificant ? `${color}40` : 'rgba(255,255,255,0.06)' }}>
              <div className="indicator-card-name">{ind.name}</div>
              <div className="indicator-card-value">
                <span className="indicator-card-current">{ind.current}{ind.unit}</span>
                <span className="indicator-card-arrow" style={{ color }}>
                  {diff > 0 ? '▲' : diff < 0 ? '▼' : '─'}
                </span>
              </div>
              <div className="indicator-card-compare">
                <span className="indicator-card-prev">전분기 {ind.previous}{ind.unit}</span>
                <span className="indicator-card-diff" style={{ color }}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)}{ind.unit}
                </span>
              </div>
              {isSignificant && (
                <div className="indicator-card-alert" style={{ color }}>
                  {absDiff > 1 ? '⚡ 큰 변동' : '📌 주목'}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="indicators-v2-note">
        📊 이 수치들이 의미하는 것은? 스스로 판단하세요.
      </div>
    </div>
  )
}
