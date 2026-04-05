import { useCallback, useRef } from 'react'
import type { NewsCard as NewsCardType } from '../../data/types'
import { getSourceLabel } from '../../engine/news'
import { CATEGORY_LABELS } from '../../data/constants'
import { useGameStore } from '../../stores/gameStore'
import { getMetaUpgradeCount } from '../../data/metaUpgrades'
import {
  getSourceBadge, getReliabilityGrade, getFakeProbability,
  ImpactTag, SkillAlert,
} from '../cards/NewsCard'

interface NewsArticleViewProps {
  news: NewsCardType
  unlockedSkills: string[]
  onBack: () => void
}

export function NewsArticleView({ news, unlockedSkills, onBack }: NewsArticleViewProps) {
  const articleRef = useRef<HTMLDivElement>(null)
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

  // 텍스트 하이라이팅
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !articleRef.current) return

    const range = selection.getRangeAt(0)
    if (!articleRef.current.contains(range.commonAncestorContainer)) return

    const selectedText = selection.toString().trim()
    if (selectedText.length < 2) return

    // 하이라이트 적용
    const span = document.createElement('mark')
    span.className = 'news-highlight'
    try {
      range.surroundContents(span)
      selection.removeAllRanges()
    } catch {
      // 선택 영역이 여러 노드에 걸치면 surroundContents 실패 가능
      // 이 경우 무시
    }
  }, [])

  // 하이라이트 클릭 시 취소
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'MARK' && target.classList.contains('news-highlight')) {
      const parent = target.parentNode
      if (parent) {
        // mark 태그를 텍스트 노드로 교체
        const text = document.createTextNode(target.textContent || '')
        parent.replaceChild(text, target)
        parent.normalize() // 인접 텍스트 노드 병합
      }
    }
  }, [])

  // 본문: body가 있으면 사용, 없으면 content 사용
  const bodyText = news.body || news.content
  const paragraphs = bodyText.split('\n').filter(p => p.trim())

  return (
    <div className="flex flex-col h-full">
      {/* 상단 내비게이션 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-bal-border-dim">
        <button
          className="text-bal-text-dim hover:text-white text-sm transition-colors"
          onClick={onBack}
        >
          ← 목록으로
        </button>
      </div>

      {/* 기사 본문 (스크롤 영역) */}
      <div
        ref={articleRef}
        className="flex-1 min-h-0 overflow-y-auto news-article-scroll"
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      >
        <div className="p-4 max-w-[720px]">
          {/* 출처 + 카테고리 */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`news-source-badge ${sourceBadge.text}`}>
              {getSourceLabel(news.source)}
            </span>
            <span className="news-category-badge">
              {CATEGORY_LABELS[news.category]}
            </span>
            {reliabilityGrade && (
              <span className={`text-[11px] font-bold ${reliabilityGrade.color}`}>
                신뢰도: {reliabilityGrade.label}
              </span>
            )}
          </div>

          {/* 헤드라인 */}
          <h2 className="text-lg font-bold text-white leading-snug mb-4 select-text">
            {news.headline}
          </h2>

          {/* 스킬 경고 배너 */}
          {(fakeProbability !== null || isStale || isBiasTrap || isConflict) && (
            <div className="mb-4 space-y-1.5">
              {fakeProbability !== null && (
                <SkillAlert
                  text={`가짜 뉴스 확률: ${(fakeProbability * 100).toFixed(0)}%`}
                  level={fakeProbability >= 0.5 ? 'danger' : fakeProbability >= 0.3 ? 'warn' : 'safe'}
                />
              )}
              {isStale && <SkillAlert text="⚠ 이미 선반영된 뉴스로 감지됨" level="warn" />}
              {isBiasTrap && <SkillAlert text="⚠ 확증 편향을 유도하는 뉴스로 감지됨" level="warn" />}
              {isConflict && <SkillAlert text="⚠ 이해충돌이 감지된 분석 보고서" level="danger" />}
            </div>
          )}

          {/* 본문 단락 */}
          <div className="news-article-body select-text">
            {paragraphs.map((p, i) => (
              <p key={i} className="mb-3 text-[13px] leading-relaxed text-bal-text">
                {p}
              </p>
            ))}
          </div>

          {/* 심층 분석 (스킬 보유 시에만) */}
          {hasDeepNews && news.actualImpact.length > 0 && (
            <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(91,155,213,0.1)', border: '1px solid rgba(91,155,213,0.2)' }}>
              <p className="text-[11px] text-bal-blue font-bold mb-2">📊 심층 분석 리포트</p>
              <div className="flex flex-wrap gap-1.5">
                {news.actualImpact.map((impact, i) => <ImpactTag key={`a-${impact.sector}-${i}`} impact={impact} />)}
              </div>
            </div>
          )}

          {/* 하이라이트 안내 */}
          <div className="mt-6 pt-3 border-t border-bal-border-dim">
            <p className="text-[10px] text-bal-text-dim">
              💡 텍스트를 드래그하여 하이라이트 · 클릭하여 취소
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
