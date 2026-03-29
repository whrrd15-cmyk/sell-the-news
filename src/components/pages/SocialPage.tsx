import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { generateSocialPosts, type SocialPost } from '../../engine/social'
import { generateIndicators, type EconomicIndicator } from '../../engine/indicators'
import { AvatarIcon, HeartIcon, CommentIcon, ShareIcon, ChatBubbleIcon, ChartBarIcon, BoltIcon, PinIcon, LightbulbIcon } from '../icons/SocialIcons'

/**
 * 사회정보 페이지 — SNS 여론 + 경제 지표
 *
 * 여론: 게시글 피드 (시간순, 플랫)
 * 경제지표: 카드 그리드 + 변화 강조
 * 이모지 사용 금지 — SVG 아이콘만 사용
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
          <ChatBubbleIcon size={12} color={activeTab === 'feed' ? '#5b9bd5' : '#8888aa'} />
          <span>여론</span>
        </button>
        <button className={`social-v2-tab ${activeTab === 'indicators' ? 'social-v2-tab--active' : ''}`}
          style={{ '--tab-color': '#f0b429' } as React.CSSProperties}
          onClick={() => setActiveTab('indicators')}>
          <ChartBarIcon size={12} color={activeTab === 'indicators' ? '#f0b429' : '#8888aa'} />
          <span>경제지표</span>
        </button>
      </div>

      <div className="social-v2-body">
        {activeTab === 'feed' ? (
          <SocialFeedFlat posts={posts} />
        ) : (
          <IndicatorsV2 indicators={indicators} />
        )}
      </div>

      <div className="social-v2-footer">
        <LightbulbIcon size={10} color="#8888aa" />
        <span>
          {activeTab === 'feed'
            ? '여론은 시장의 거울이지만, 거울에 비친 모습이 항상 진실은 아니다.'
            : '숫자는 거짓말하지 않지만, 해석은 사람마다 다르다.'
          }
        </span>
      </div>
    </div>
  )
}

// ═══ 여론 피드 (플랫, 시간순) ═══

function SocialFeedFlat({ posts }: { posts: SocialPost[] }) {
  // 시간순 (이미 minutesAgo 기준 정렬됨)
  return (
    <div className="social-feed-flat">
      <AnimatePresence initial={false}>
        {posts.map((post, i) => (
          <motion.div key={post.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
            className="social-flat-post">
            <div className="social-flat-avatar">
              <AvatarIcon size={24} color={post.avatar} />
            </div>
            <div className="social-flat-body">
              <div className="social-flat-header">
                <span className="social-flat-author">{post.author}</span>
                <span className="social-flat-time">{post.minutesAgo}분 전</span>
              </div>
              <div className="social-flat-content">{post.content}</div>
              <div className="social-flat-stats">
                <span className="social-flat-stat">
                  <HeartIcon size={10} color="#e8534a" />
                  <span>{fmtCount(post.likes)}</span>
                </span>
                <span className="social-flat-stat">
                  <CommentIcon size={10} />
                  <span>{fmtCount(post.comments)}</span>
                </span>
                <span className="social-flat-stat">
                  <ShareIcon size={10} />
                  <span>{fmtCount(post.shares)}</span>
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
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
                <div className="indicator-card-alert" style={{ color, display: 'flex', alignItems: 'center', gap: 3 }}>
                  {absDiff > 1
                    ? <><BoltIcon size={9} color={color} /> <span>큰 변동</span></>
                    : <><PinIcon size={9} color={color} /> <span>주목</span></>
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="indicators-v2-note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <ChartBarIcon size={10} color="#8888aa" />
        <span>이 수치들이 의미하는 것은? 스스로 판단하세요.</span>
      </div>
    </div>
  )
}
