import type { NewsCard as NewsCardType } from '../../data/types'
import { getSourceLabel } from '../../engine/news'
import {
  getSourceBadge, getOverallImpact, getAccentColor,
  getReliabilityGrade, ImpactTag, SkillAlert,
} from '../cards/NewsCard'

interface NewsCardCompactProps {
  news: NewsCardType
  unlockedSkills: string[]
}

export function NewsCardCompact({ news, unlockedSkills }: NewsCardCompactProps) {
  const overallImpact = getOverallImpact(news.perceivedImpact)
  const accentColor = getAccentColor(overallImpact)
  const sourceBadge = getSourceBadge(news.source)

  const hasFactCheck = unlockedSkills.includes('fact_check')
  const reliabilityGrade = hasFactCheck ? getReliabilityGrade(news.reliability) : null

  const isSuspicious = news.source === 'social' || news.source === 'anonymous'

  return (
    <div
      className="bal-card p-2.5"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: accentColor,
        borderColor: isSuspicious ? '#e8534a33' : undefined,
      }}
    >
      {/* 출처 + 신뢰도 */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`border px-1.5 py-0.5 text-[9px] font-bold rounded ${sourceBadge.border} ${sourceBadge.text}`}>
          {getSourceLabel(news.source)}
        </span>
        <div className="flex items-center gap-1.5">
          {reliabilityGrade && (
            <span className={`text-[9px] font-bold ${reliabilityGrade.color}`}>
              {reliabilityGrade.label}
            </span>
          )}
          {isSuspicious && (
            <span className="text-[9px] font-bold text-bal-red">의심</span>
          )}
        </div>
      </div>

      {/* 헤드라인 */}
      <h3 className="text-xs font-bold text-white leading-snug line-clamp-1 mb-1">{news.headline}</h3>

      {/* 본문 */}
      <p className="text-[10px] text-bal-text-dim line-clamp-1 mb-1.5">{news.content}</p>

      {/* 영향 태그 */}
      {news.perceivedImpact.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {news.perceivedImpact.slice(0, 3).map((impact, i) => (
            <ImpactTag key={`p-${impact.sector}-${i}`} impact={impact} />
          ))}
        </div>
      )}
    </div>
  )
}
