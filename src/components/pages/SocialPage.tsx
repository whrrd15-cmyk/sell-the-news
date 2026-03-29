import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BalPanel } from '../ui/BalPanel'
import { generateSocialPosts, type SocialPost } from '../../engine/social'
import { generateIndicators, type EconomicIndicator } from '../../engine/indicators'

/**
 * 사회정보 페이지 — SNS 여론 + 경제 지표 원문
 *
 * "정보는 주어지지만, 해석은 당신의 몫이다."
 *
 * 가공된 지표(공포탐욕, 시장체제) 대신 원문 데이터를 제공.
 * SNS 게시글에서 사람들의 감정을 읽고,
 * 경제 지표 숫자에서 시장 방향을 추론해야 한다.
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

  // SNS 게시글 (틱 기반으로 갱신, 10틱마다)
  const posts = useMemo(() =>
    generateSocialPosts(herdSentiment, panicLevel, Math.floor(tickCount / 10) * 10, 10),
  [herdSentiment, panicLevel, Math.floor(tickCount / 10)])

  // 경제 지표 (주별 갱신)
  const indicators = useMemo(() =>
    generateIndicators(runNumber, week, marketTrend),
  [runNumber, week, marketTrend])

  return (
    <div className="social-page">
      {/* 탭 */}
      <div className="social-tab-bar">
        <button
          className={`social-tab ${activeTab === 'feed' ? 'social-tab--active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          💬 여론
        </button>
        <button
          className={`social-tab ${activeTab === 'indicators' ? 'social-tab--active' : ''}`}
          onClick={() => setActiveTab('indicators')}
        >
          📊 경제지표
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="social-content">
        {activeTab === 'feed' ? (
          <SocialFeedView posts={posts} />
        ) : (
          <IndicatorsView indicators={indicators} />
        )}
      </div>

      {/* 교육 메시지 */}
      <div className="social-footer">
        {activeTab === 'feed'
          ? '여론은 시장의 거울이지만, 거울에 비친 모습이 항상 진실은 아니다.'
          : '숫자는 거짓말하지 않지만, 해석은 사람마다 다르다.'
        }
      </div>
    </div>
  )
}

// ═══ SNS 피드 뷰 ═══

function SocialFeedView({ posts }: { posts: SocialPost[] }) {
  return (
    <div className="social-feed">
      <AnimatePresence initial={false}>
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="social-post"
          >
            <div className="social-post-header">
              <span className="social-post-avatar">{post.avatar}</span>
              <span className="social-post-author">{post.author}</span>
              <span className="social-post-time">{post.minutesAgo}분 전</span>
            </div>
            <div className="social-post-content">{post.content}</div>
            <div className="social-post-actions">
              <span className="social-post-action">❤️ {formatCount(post.likes)}</span>
              <span className="social-post-action">💬 {formatCount(post.comments)}</span>
              <span className="social-post-action">🔄 {formatCount(post.shares)}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

// ═══ 경제 지표 뷰 ═══

function IndicatorsView({ indicators }: { indicators: EconomicIndicator[] }) {
  return (
    <div className="indicators-view">
      <table className="indicators-table">
        <thead>
          <tr>
            <th>지표</th>
            <th>현재</th>
            <th>전분기</th>
            <th>변화</th>
          </tr>
        </thead>
        <tbody>
          {indicators.map(ind => {
            const diff = ind.current - ind.previous
            const isPositive = diff > 0
            // 실업률/물가는 증가가 부정적
            const isNegativeMetric = ['unemployment', 'cpi'].includes(ind.id)
            const color = diff === 0 ? '#8888aa'
              : (isPositive && !isNegativeMetric) || (!isPositive && isNegativeMetric)
                ? '#5ec269' : '#e8534a'

            return (
              <tr key={ind.id}>
                <td className="indicators-name">{ind.name}</td>
                <td className="indicators-value">{ind.current}{ind.unit}</td>
                <td className="indicators-prev">{ind.previous}{ind.unit}</td>
                <td style={{ color }} className="indicators-diff">
                  {isPositive ? '▲' : diff < 0 ? '▼' : '─'}
                  {Math.abs(diff).toFixed(1)}{ind.unit}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="indicators-note">
        📊 이 수치들이 의미하는 것은? 스스로 판단하세요.
      </div>
    </div>
  )
}
