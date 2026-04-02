import { useState, useCallback } from 'react'
import type { NewsCard, JudgmentType } from '../../data/types'
import { CATEGORY_LABELS, CATEGORY_COLORS, SECTOR_LABELS } from '../../data/constants'
import { useCardTilt } from '../../hooks/useCardTilt'
import { JudgmentSlider } from './JudgmentSlider'
import { JudgmentStamp } from './JudgmentStamp'
import { SFX } from '../../utils/sound'

interface NewsJudgmentCardProps {
  news: NewsCard
  unlockedSkills: string[]
  onJudge: (type: JudgmentType, sliderValue: number) => void
  onSkip: () => void
}

const SOURCE_LABELS: Record<string, string> = {
  official: '공영방송',
  financial: '경제전문지',
  analyst: '애널리스트',
  social: 'SNS',
  anonymous: '익명블로그',
  insider: '내부자',
}

function reliabilityStars(reliability: number): string {
  const full = Math.round(reliability * 5)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

export function NewsJudgmentCard({ news, unlockedSkills, onJudge, onSkip }: NewsJudgmentCardProps) {
  const [sliderValue, setSliderValue] = useState(0)
  const [judgedType, setJudgedType] = useState<JudgmentType | null>(null)
  const { ref, containerStyle, cardStyle, shineStyle, handlers } = useCardTilt({ maxTilt: 6, scale: 1.01 })

  const hasFakeDetection = unlockedSkills.includes('fake_detection')
  const hasSourceAnalysis = unlockedSkills.includes('source_analysis')
  const hasDeepNews = unlockedSkills.includes('deep_news')

  const handleConfirm = useCallback(() => {
    const type: JudgmentType = sliderValue > 0 ? 'bullish' : 'bearish'
    SFX.click()
    setJudgedType(type)
  }, [sliderValue])

  const handleFake = useCallback(() => {
    SFX.fakeReveal()
    setJudgedType('fake')
  }, [])

  const handleStampComplete = useCallback(() => {
    if (judgedType) {
      const normalized = sliderValue / 100 // -1.0 ~ +1.0
      setTimeout(() => onJudge(judgedType, normalized), 150)
    }
  }, [judgedType, sliderValue, onJudge])

  const handleSkip = useCallback(() => {
    SFX.click()
    onSkip()
  }, [onSkip])

  const catColor = CATEGORY_COLORS[news.category] || '#8888aa'
  const isJudged = judgedType !== null

  return (
    <div style={containerStyle}>
      <div
        ref={ref}
        className="analyst-card"
        data-guide="news-item"
        style={cardStyle}
        {...handlers}
      >
        {/* 글레어 효과 */}
        <div style={shineStyle} />

        {/* 스탬프 오버레이 */}
        {isJudged && (
          <JudgmentStamp
            type={judgedType}
            value={sliderValue}
            onAnimationComplete={handleStampComplete}
          />
        )}

        {/* 건너뛰기 */}
        <button className="analyst-card-skip" onClick={handleSkip} disabled={isJudged}>
          건너뛰기 →
        </button>

        {/* 카테고리 뱃지 */}
        <span
          className="analyst-card-category"
          style={{ background: catColor }}
        >
          {CATEGORY_LABELS[news.category]}
        </span>

        {/* 헤드라인 */}
        <h2 className="analyst-card-headline">{news.headline}</h2>

        {/* 출처 + 신뢰도 */}
        <div className="analyst-card-source">
          <span>{SOURCE_LABELS[news.source] || news.source}</span>
          {hasSourceAnalysis && (
            <span className="analyst-card-source-stars">
              {reliabilityStars(news.reliability)}
            </span>
          )}
        </div>

        {/* 본문 */}
        <p className="analyst-card-body">{news.content}</p>

        {/* 스킬 힌트: 영향 섹터 */}
        {hasDeepNews && news.perceivedImpact.length > 0 && (
          <div className="analyst-card-hint">
            <span style={{ color: '#5b9bd5', fontWeight: 700, marginRight: 6, fontSize: 9 }}>HINT</span>
            {news.perceivedImpact.map((si, i) => (
              <span key={i} style={{ marginRight: 8, fontSize: 11 }}>
                <span style={{ color: '#aaa' }}>{SECTOR_LABELS[si.sector]}</span>
                <span style={{ color: si.impact > 0 ? 'var(--color-bal-green)' : 'var(--color-bal-red)', fontWeight: 700 }}>
                  {si.impact > 0 ? '▲' : '▼'}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* 판단 UI (스탬프 표시 중이면 숨김) */}
        {!isJudged && (
          <>
            <JudgmentSlider
              value={sliderValue}
              onChange={setSliderValue}
              onConfirm={handleConfirm}
            />

            <button
              className={`fake-news-btn ${!hasFakeDetection ? 'fake-news-btn--locked' : ''}`}
              onClick={hasFakeDetection ? handleFake : undefined}
              title={!hasFakeDetection ? '가짜뉴스 탐지 스킬이 필요합니다' : '이 뉴스를 가짜뉴스로 판단'}
            >
              {!hasFakeDetection && <span>🔒</span>}
              <span>✕ 가짜뉴스</span>
              {!hasFakeDetection && <span style={{ fontSize: 9, color: '#8888aa' }}>스킬 필요</span>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
