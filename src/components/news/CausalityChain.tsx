import type { NewsCard, SectorImpact, Sector } from '../../data/types'
import { SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'

interface CausalityChainProps {
  news: NewsCard
  hasDeepNews: boolean
}

function getSourceReliabilityLabel(reliability: number): { text: string; color: string } {
  if (reliability >= 0.8) return { text: '높음', color: '#5ec269' }
  if (reliability >= 0.5) return { text: '보통', color: '#e88c3a' }
  return { text: '낮음', color: '#e8534a' }
}

export function CausalityChain({ news, hasDeepNews }: CausalityChainProps) {
  const impacts = hasDeepNews ? news.actualImpact : news.perceivedImpact
  const reliabilityInfo = getSourceReliabilityLabel(news.reliability)

  // 예상 효과 합산
  const totalImpact = impacts.reduce((sum, si) => sum + si.impact, 0)
  const effectLabel = totalImpact > 0.3 ? '강한 상승' :
    totalImpact > 0 ? '소폭 상승' :
    totalImpact < -0.3 ? '강한 하락' :
    totalImpact < 0 ? '소폭 하락' : '영향 없음'
  const effectColor = totalImpact > 0 ? '#5ec269' : totalImpact < 0 ? '#e8534a' : '#8888aa'

  return (
    <div className="causality-chain">
      <div className="causality-chain-title">인과관계 분석</div>
      <div className="causality-chain-flow">
        {/* Step 1: 뉴스 출처 */}
        <div className="causality-step">
          <div className="causality-step-label">출처 신뢰도</div>
          <div className="causality-step-value" style={{ color: reliabilityInfo.color }}>
            {reliabilityInfo.text}
          </div>
        </div>

        <span className="causality-arrow">→</span>

        {/* Step 2: 섹터 영향 */}
        <div className="causality-step causality-step--wide">
          <div className="causality-step-label">섹터 영향</div>
          <div className="flex gap-1 flex-wrap">
            {impacts.map((si, i) => {
              const sectorKey = si.sector as Sector
              const color = si.sector === 'all' ? '#f0b429' : (SECTOR_COLORS[sectorKey] ?? '#888')
              const label = si.sector === 'all' ? '전체' : (SECTOR_LABELS[sectorKey] ?? si.sector)
              const arrow = si.impact > 0 ? '▲' : '▼'
              return (
                <span key={i} style={{ color, fontSize: 10, fontWeight: 700 }}>
                  {label}{arrow}
                </span>
              )
            })}
          </div>
        </div>

        <span className="causality-arrow">→</span>

        {/* Step 3: 예상 효과 */}
        <div className="causality-step">
          <div className="causality-step-label">예상 효과</div>
          <div className="causality-step-value" style={{ color: effectColor }}>
            {effectLabel}
          </div>
        </div>
      </div>

      {hasDeepNews && news.perceivedImpact !== news.actualImpact && (
        <div className="text-[9px] text-bal-purple mt-1">
          💡 심층 분석: 실제 영향을 표시하고 있습니다
        </div>
      )}
    </div>
  )
}
