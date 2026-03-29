import type { MarketCondition, ActiveEffect, NewsCard } from '../../data/types'
import { MarketPulseBar } from '../ui/MarketPulseBar'
import { SectorHealthStrip } from '../ui/SectorHealthStrip'
import { SectorImpactSummary } from '../news/SectorImpactSummary'
import { BalPanel } from '../ui/BalPanel'
import { SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'
import type { Sector } from '../../data/types'

/**
 * 시장 분석 페이지
 *
 * "시장의 맥을 짚는 공간"
 * 가공된 지표를 한눈에 볼 수 있지만, 유저가 직접 찾아와야 한다.
 * 매매 화면에서는 이 정보가 보이지 않는다.
 */

interface AnalysisPageProps {
  marketConditions: Record<string, MarketCondition>
  herdSentiment: number
  panicLevel: number
  maxBubble: number
  dangerLevel: number
  activeEffects: ActiveEffect[]
  sectorMomentum: Record<string, number>
  sectorBubble: Record<string, number>
  news: NewsCard[]
}

const CONDITION_INFO: Record<MarketCondition, { label: string; icon: string; color: string; desc: string }> = {
  bull_trend: { label: '상승 추세', icon: '🐂', color: '#5ec269', desc: '매수세가 강하고 가격이 상승 중' },
  range_bound: { label: '횡보', icon: '↔️', color: '#e88c3a', desc: '뚜렷한 방향 없이 일정 범위에서 움직임' },
  bear_market: { label: '하락 추세', icon: '🐻', color: '#e8534a', desc: '매도세가 강하고 가격이 하락 중' },
  neutral: { label: '중립', icon: '➖', color: '#8888aa', desc: '아직 뚜렷한 추세가 형성되지 않음' },
}

const SECTORS: Sector[] = ['tech', 'energy', 'finance', 'consumer', 'healthcare']

export function AnalysisPage({
  marketConditions, herdSentiment, panicLevel, maxBubble,
  dangerLevel, activeEffects, sectorMomentum, sectorBubble, news,
}: AnalysisPageProps) {
  return (
    <div className="analysis-page">
      {/* 상단: 전체 시장 상태 */}
      <BalPanel label="시장 전체 상태" className="analysis-section">
        <div className="p-3">
          <MarketPulseBar
            marketConditions={marketConditions}
            herdSentiment={herdSentiment}
            panicLevel={panicLevel}
            maxBubble={maxBubble}
            dangerLevel={dangerLevel}
            activeEffects={activeEffects}
          />
        </div>
      </BalPanel>

      {/* 중단: 섹터별 상세 */}
      <BalPanel label="섹터별 분석" className="analysis-section">
        <div className="p-3 space-y-3">
          {SECTORS.map(sector => {
            const condition = (marketConditions[sector] ?? 'neutral') as MarketCondition
            const info = CONDITION_INFO[condition]
            const momentum = sectorMomentum[sector] ?? 0
            const bubble = sectorBubble[sector] ?? 0
            const color = SECTOR_COLORS[sector]

            return (
              <div key={sector} className="analysis-sector-card" style={{ borderColor: `${color}30` }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color }}>{SECTOR_LABELS[sector]}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ color: info.color, background: `${info.color}15` }}>
                      {info.icon} {info.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className={momentum >= 0 ? 'text-bal-green' : 'text-bal-red'}>
                      모멘텀 {momentum >= 0 ? '▲' : '▼'}{(Math.abs(momentum) * 100).toFixed(0)}
                    </span>
                    {bubble > 0.3 && (
                      <span className="text-bal-red">🫧 {(bubble * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
                <div className="text-[9px] text-bal-text-dim">{info.desc}</div>
              </div>
            )
          })}
        </div>
      </BalPanel>

      {/* 하단: 뉴스 영향 요약 */}
      <BalPanel label="뉴스 기반 섹터 영향" className="analysis-section">
        <div className="p-3">
          <SectorImpactSummary news={news} />
        </div>
      </BalPanel>

      {/* 활성 효과 */}
      {activeEffects.length > 0 && (
        <BalPanel label={`활성 시장 효과 (${activeEffects.length})`} className="analysis-section">
          <div className="p-3 space-y-1">
            {activeEffects.map((effect, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex gap-0.5">
                  {effect.sectorImpacts.slice(0, 3).map((si, j) => {
                    const c = si.sector === 'all' ? '#f0b429' : (SECTOR_COLORS as Record<string, string>)[si.sector] ?? '#888'
                    return <span key={j} className="w-2 h-2 rounded-full" style={{ background: c }} />
                  })}
                </div>
                <span className={effect.sectorImpacts[0]?.impact > 0 ? 'text-bal-green' : 'text-bal-red'}>
                  {effect.sectorImpacts[0]?.impact > 0 ? '▲' : '▼'}
                </span>
                <span className="text-bal-text-dim ml-auto">{effect.remainingTurns}턴 남음</span>
              </div>
            ))}
          </div>
        </BalPanel>
      )}

      {/* 교육 메시지 */}
      <div className="text-[9px] text-bal-text-dim text-center p-2 italic opacity-60">
        "지표는 과거를 보여줄 뿐, 미래를 보장하지 않는다. 스스로 판단하라."
      </div>
    </div>
  )
}
