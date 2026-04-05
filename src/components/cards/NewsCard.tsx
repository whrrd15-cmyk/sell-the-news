import type { NewsCard as NewsCardType, SectorImpact, NewsSource } from '../../data/types'
import { getSourceLabel } from '../../engine/news'
import { SECTOR_LABELS } from '../../data/constants'
import { useGameStore } from '../../stores/gameStore'
import { getMetaUpgradeCount } from '../../data/metaUpgrades'

const SECTOR_LABELS_ALL = { ...SECTOR_LABELS, all: '전체' } as const

interface NewsCardProps {
  news: NewsCardType
  index?: number
  unlockedSkills?: string[]
}

export function getSourceBadge(source: NewsSource): { border: string; text: string } {
  switch (source) {
    case 'official':
    case 'financial':
      return { border: 'border-bal-green/40', text: 'text-bal-green' }
    case 'analyst':
      return { border: 'border-bal-gold/40', text: 'text-bal-gold' }
    case 'social':
    case 'anonymous':
    case 'insider':
      return { border: 'border-bal-red/40', text: 'text-bal-red' }
  }
}

export function getOverallImpact(impacts: SectorImpact[]): 'positive' | 'negative' | 'mixed' {
  if (impacts.length === 0) return 'mixed'
  const avg = impacts.reduce((sum, i) => sum + i.impact, 0) / impacts.length
  if (avg > 0.1) return 'positive'
  if (avg < -0.1) return 'negative'
  return 'mixed'
}

export function getAccentColor(type: 'positive' | 'negative' | 'mixed'): string {
  switch (type) {
    case 'positive': return '#5ec269'
    case 'negative': return '#e8534a'
    case 'mixed': return '#5b9bd5'
  }
}

export function getReliabilityGrade(reliability: number): { label: string; color: string } {
  if (reliability >= 0.7) return { label: '높음', color: 'text-bal-green' }
  if (reliability >= 0.4) return { label: '보통', color: 'text-bal-gold' }
  return { label: '의심', color: 'text-bal-red' }
}

export function getFakeProbability(news: NewsCardType): number {
  const weights: Record<NewsSource, number> = {
    official: 0.05, financial: 0.1, analyst: 0.25, social: 0.5, anonymous: 0.7, insider: 0.4,
  }
  const base = weights[news.source] ?? 0.3
  if (!news.isReal) return Math.min(base + 0.2 + Math.random() * 0.1, 0.95)
  return Math.max(base - 0.1 + Math.random() * 0.1, 0.05)
}

export function ImpactTag({ impact }: { impact: SectorImpact }) {
  const label = SECTOR_LABELS_ALL[impact.sector]
  const arrow = impact.impact > 0 ? '↑' : impact.impact < 0 ? '↓' : '→'
  const color = impact.impact > 0 ? 'text-bal-green' : impact.impact < 0 ? 'text-bal-red' : 'text-bal-text-dim'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${color}`}>
      [{label} {arrow}]
    </span>
  )
}

export default function NewsCard({ news, index = 0, unlockedSkills = [] }: NewsCardProps) {
  const overallImpact = getOverallImpact(news.perceivedImpact)
  const accentColor = getAccentColor(overallImpact)
  const sourceBadge = getSourceBadge(news.source)

  const hasFactCheck = unlockedSkills.includes('fact_check')
  const hasSourceTracking = unlockedSkills.includes('source_tracking')
  const hasDeepNews = unlockedSkills.includes('deep_news')
  const hasStaleDetection = unlockedSkills.includes('stale_detection')
  const hasBiasWarning = unlockedSkills.includes('bias_warning')
  const hasConflictDetection = unlockedSkills.includes('conflict_detection')

  const meta = useGameStore(s => s.meta)
  const accuracyBonus = getMetaUpgradeCount(meta, 'news_accuracy_1') * 0.1
  const reliabilityGrade = hasFactCheck ? getReliabilityGrade(Math.min(1, news.reliability + accuracyBonus)) : null
  const fakeProbability = hasSourceTracking ? getFakeProbability(news) : null
  const isStale = hasStaleDetection && news.fakeType === 'stale_news'
  const isBiasTrap = hasBiasWarning && news.fakeType === 'bias_trap'
  const isConflict = hasConflictDetection && news.fakeType === 'conflict'

  return (
    <div
      className="bal-card p-3 cursor-default h-full"
      style={{ borderLeftWidth: '3px', borderLeftColor: accentColor }}
    >
      {/* 출처 배지 + 신뢰도 */}
      <div className="mb-2 flex items-center justify-between">
        <span className={`border px-1.5 py-0.5 text-[9px] font-bold rounded ${sourceBadge.border} ${sourceBadge.text}`}>
          {getSourceLabel(news.source)}
        </span>
        {reliabilityGrade && (
          <span className={`text-[9px] font-bold ${reliabilityGrade.color}`}>
            신뢰도: {reliabilityGrade.label}
          </span>
        )}
      </div>

      {/* 헤드라인 */}
      <h3 className="mb-1.5 text-xs font-bold leading-snug text-white">{news.headline}</h3>

      {/* 본문 */}
      <p className="mb-2 text-[10px] leading-relaxed text-bal-text-dim line-clamp-2">{news.content}</p>

      {/* 스킬 기반 경고 */}
      {(fakeProbability !== null || isStale || isBiasTrap || isConflict) && (
        <div className="mb-2 space-y-1">
          {fakeProbability !== null && (
            <SkillAlert
              text={`가짜 확률: ${(fakeProbability * 100).toFixed(0)}%`}
              level={fakeProbability >= 0.5 ? 'danger' : fakeProbability >= 0.3 ? 'warn' : 'safe'}
            />
          )}
          {isStale && <SkillAlert text="선반영 감지" level="warn" />}
          {isBiasTrap && <SkillAlert text="편향 경고" level="warn" />}
          {isConflict && <SkillAlert text="이해충돌 감지" level="danger" />}
        </div>
      )}

      {/* 심층 뉴스 */}
      {hasDeepNews && news.actualImpact.length > 0 && (
        <div className="mb-1.5">
          <p className="text-[9px] text-bal-blue font-bold mb-0.5">심층 분석</p>
          <div className="flex flex-wrap gap-1">
            {news.actualImpact.map((impact, i) => <ImpactTag key={`a-${impact.sector}-${i}`} impact={impact} />)}
          </div>
        </div>
      )}

      {/* 예상 영향 */}
      {news.perceivedImpact.length > 0 && (
        <div>
          <p className="text-[9px] text-bal-text-dim mb-0.5">{hasDeepNews ? '겉보기' : '예상 영향'}</p>
          <div className="flex flex-wrap gap-1">
            {news.perceivedImpact.map((impact, i) => <ImpactTag key={`p-${impact.sector}-${i}`} impact={impact} />)}
          </div>
        </div>
      )}
    </div>
  )
}

export function SkillAlert({ text, level }: { text: string; level: 'danger' | 'warn' | 'safe' }) {
  const colors = {
    danger: 'text-bal-red border-bal-red/30',
    warn: 'text-bal-gold border-bal-gold/30',
    safe: 'text-bal-green border-bal-green/30',
  }
  return (
    <div className={`text-[9px] font-bold border px-1.5 py-0.5 rounded ${colors[level]}`}>
      {text}
    </div>
  )
}
