import type { NewsCard as NewsCardType } from '../../data/types'
import { getSourceLabel } from '../../engine/news'
import { CATEGORY_LABELS } from '../../data/constants'
import {
  getSourceBadge, getReliabilityGrade, getFakeProbability,
  SkillAlert,
} from '../cards/NewsCard'
import { useCardTilt } from '../../hooks/useCardTilt'

interface NewsListItemProps {
  news: NewsCardType
  unlockedSkills: string[]
  onClick: () => void
}

export function NewsListItem({ news, unlockedSkills, onClick }: NewsListItemProps) {
  const sourceBadge = getSourceBadge(news.source)
  const hasFactCheck = unlockedSkills.includes('fact_check')
  const hasSourceTracking = unlockedSkills.includes('source_tracking')
  const reliabilityGrade = hasFactCheck ? getReliabilityGrade(news.reliability) : null
  const fakeProbability = hasSourceTracking ? getFakeProbability(news) : null
  const isSuspicious = news.source === 'social' || news.source === 'anonymous'
  const tilt = useCardTilt({ maxTilt: 6, scale: 1.01 })

  return (
    <div style={tilt.containerStyle}>
    <button
      ref={tilt.ref as React.RefObject<HTMLButtonElement>}
      className="news-list-item relative overflow-hidden"
      onClick={onClick}
      style={{
        ...tilt.cardStyle,
        borderLeftColor: isSuspicious ? '#e8534a55' : 'transparent',
      }}
      {...tilt.handlers}
    >
      <div style={tilt.shineStyle} />
      {/* 상단: 출처 + 카테고리 + 신뢰도 */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`news-source-badge ${sourceBadge.text}`}>
          {getSourceLabel(news.source)}
        </span>
        <span className="news-category-badge">
          {CATEGORY_LABELS[news.category]}
        </span>
        {reliabilityGrade && (
          <span className={`text-[10px] font-bold ${reliabilityGrade.color}`}>
            {reliabilityGrade.label}
          </span>
        )}
        {isSuspicious && !hasFactCheck && (
          <span className="text-[10px] text-bal-red font-bold">⚠</span>
        )}
      </div>

      {/* 헤드라인 */}
      <h3 className="news-headline">{news.headline}</h3>

      {/* 요약 */}
      <p className="news-summary">{news.content}</p>

      {/* 스킬 경고 */}
      {fakeProbability !== null && fakeProbability >= 0.3 && (
        <div className="mt-1">
          <SkillAlert
            text={`가짜 확률: ${(fakeProbability * 100).toFixed(0)}%`}
            level={fakeProbability >= 0.5 ? 'danger' : 'warn'}
          />
        </div>
      )}
    </button>
    </div>
  )
}
