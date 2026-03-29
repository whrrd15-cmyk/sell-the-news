import type { PriceChangeBreakdown, EffectHistoryEntry } from '../../engine/market'

interface CausalityAnnotationProps {
  breakdown: PriceChangeBreakdown
  effectHistory: EffectHistoryEntry[]
  stockSector: string
}

export function CausalityAnnotation({ breakdown, effectHistory, stockSector }: CausalityAnnotationProps) {
  const annotations: string[] = []

  // 뉴스 영향이 큰 경우: effectHistory에서 해당 섹터 영향 이벤트 찾기
  if (Math.abs(breakdown.eventEffect) > 0.005) {
    const relevantEvents = effectHistory.filter(e =>
      e.sectorImpacts.some(si => si.sector === stockSector || si.sector === 'all')
    )
    if (relevantEvents.length > 0) {
      const latest = relevantEvents[relevantEvents.length - 1]
      const direction = breakdown.eventEffect > 0 ? '상승' : '하락'
      annotations.push(`"${latest.headline.slice(0, 20)}${latest.headline.length > 20 ? '...' : ''}" → ${stockSector} ${direction}`)
    }
  }

  // 군중 심리 영향
  if (Math.abs(breakdown.herdEffect) > 0.008) {
    const direction = breakdown.herdEffect > 0 ? '낙관' : '공포'
    annotations.push(`군중 심리 ${direction}으로 ${breakdown.herdEffect > 0 ? '추가 상승' : '추가 하락'}`)
  }

  // 버블 붕괴
  if (Math.abs(breakdown.bubblePop) > 0.01) {
    annotations.push('과열된 버블이 붕괴하며 급락')
  }

  // 플래시 크래시
  if (Math.abs(breakdown.flashCrash) > 0.01) {
    annotations.push('순간 급락(플래시 크래시) 발생')
  }

  // 평균 회귀
  if (Math.abs(breakdown.meanReversion) > 0.01) {
    annotations.push(`평균 가격으로의 회귀 ${breakdown.meanReversion > 0 ? '반등' : '조정'}`)
  }

  if (annotations.length === 0) return null

  return (
    <div style={{ padding: '2px 8px' }}>
      {annotations.slice(0, 2).map((text, i) => (
        <div
          key={i}
          style={{
            fontSize: 9,
            color: '#8888aa',
            lineHeight: 1.4,
          }}
        >
          ↳ {text}
        </div>
      ))}
    </div>
  )
}
