import type { NewsCard as NewsCardType } from '../../data/types'
import { getSourceLabel } from '../../engine/news'
import {
  getSourceBadge, getOverallImpact, getAccentColor,
  getReliabilityGrade, getFakeProbability,
  ImpactTag, SkillAlert,
} from '../cards/NewsCard'

interface NewsCardMainProps {
  news: NewsCardType
  unlockedSkills: string[]
}

export function NewsCardMain({ news, unlockedSkills }: NewsCardMainProps) {
  const overallImpact = getOverallImpact(news.perceivedImpact)
  const accentColor = getAccentColor(overallImpact)
  const sourceBadge = getSourceBadge(news.source)

  const hasFactCheck = unlockedSkills.includes('fact_check')
  const hasSourceTracking = unlockedSkills.includes('source_tracking')
  const hasDeepNews = unlockedSkills.includes('deep_news')
  const hasStaleDetection = unlockedSkills.includes('stale_detection')
  const hasBiasWarning = unlockedSkills.includes('bias_warning')
  const hasConflictDetection = unlockedSkills.includes('conflict_detection')
  const hasSocialAnalysis = unlockedSkills.includes('social_analysis')

  const reliabilityGrade = hasFactCheck ? getReliabilityGrade(news.reliability) : null
  const fakeProbability = hasSourceTracking ? getFakeProbability(news) : null
  const isStale = hasStaleDetection && news.fakeType === 'stale_news'
  const isBiasTrap = hasBiasWarning && news.fakeType === 'bias_trap'
  const isConflict = hasConflictDetection && news.fakeType === 'conflict'

  return (
    <div
      className="bal-card p-4 h-full flex flex-col"
      style={{ borderLeftWidth: '3px', borderLeftColor: accentColor }}
    >
      {/* 출처 + 신뢰도 */}
      <div className="mb-3 flex items-center justify-between">
        <span className={`border px-2 py-1 text-[10px] font-bold rounded ${sourceBadge.border} ${sourceBadge.text}`}>
          {getSourceLabel(news.source)}
        </span>
        {reliabilityGrade && (
          <span className={`text-[10px] font-bold ${reliabilityGrade.color}`}>
            신뢰도: {reliabilityGrade.label}
          </span>
        )}
      </div>

      {/* 헤드라인 */}
      <h3 className="mb-2 text-sm font-bold leading-snug text-white">{news.headline}</h3>

      {/* 본문 */}
      <p className="mb-3 text-xs leading-relaxed text-bal-text-dim">{news.content}</p>

      {/* 스킬 경고 */}
      {(fakeProbability !== null || isStale || isBiasTrap || isConflict || (hasSocialAnalysis && news.source === 'social')) && (
        <div className="mb-3 space-y-1">
          {fakeProbability !== null && (
            <SkillAlert
              text={`가짜 확률: ${(fakeProbability * 100).toFixed(0)}%`}
              level={fakeProbability >= 0.5 ? 'danger' : fakeProbability >= 0.3 ? 'warn' : 'safe'}
            />
          )}
          {isStale && <SkillAlert text="선반영 감지" level="warn" />}
          {isBiasTrap && <SkillAlert text="편향 경고" level="warn" />}
          {isConflict && <SkillAlert text="이해충돌 감지" level="danger" />}
          {hasSocialAnalysis && news.source === 'social' && (
            <SkillAlert
              text={`SNS 신뢰도: ${(news.reliability * 100).toFixed(0)}%`}
              level={news.reliability < 0.4 ? 'danger' : news.reliability < 0.6 ? 'warn' : 'safe'}
            />
          )}
        </div>
      )}

      {/* 심층 분석 */}
      {hasDeepNews && news.actualImpact.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] text-bal-blue font-bold mb-1">심층 분석</p>
          <div className="flex flex-wrap gap-1">
            {news.actualImpact.map((impact, i) => <ImpactTag key={`a-${impact.sector}-${i}`} impact={impact} />)}
          </div>
        </div>
      )}

      {/* 예상 영향 */}
      {news.perceivedImpact.length > 0 && (
        <div className="mt-auto">
          <p className="text-[10px] text-bal-text-dim mb-1">{hasDeepNews ? '겉보기' : '예상 영향'}</p>
          <div className="flex flex-wrap gap-1">
            {news.perceivedImpact.map((impact, i) => <ImpactTag key={`p-${impact.sector}-${i}`} impact={impact} />)}
          </div>
        </div>
      )}
    </div>
  )
}
