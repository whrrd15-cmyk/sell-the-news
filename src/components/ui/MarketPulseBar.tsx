import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { MarketCondition, ActiveEffect, Sector } from '../../data/types'
import { SECTOR_COLORS, SECTOR_LABELS } from '../../data/constants'

interface MarketPulseBarProps {
  // 시장 체제
  marketConditions: Record<string, MarketCondition>
  // 공포/탐욕
  herdSentiment: number
  panicLevel: number
  maxBubble: number
  // 위험도
  dangerLevel: number
  // 활성 효과
  activeEffects: ActiveEffect[]
  // 모달 열기
  onOpenConditionModal?: () => void
}

const REGIME_CONFIG: Record<MarketCondition, { icon: string; label: string; color: string }> = {
  bull_trend: { icon: '🐂', label: '상승장', color: '#5ec269' },
  bear_market: { icon: '🐻', label: '하락장', color: '#e8534a' },
  range_bound: { icon: '↔️', label: '박스권', color: '#e88c3a' },
  neutral: { icon: '➖', label: '중립', color: '#8888aa' },
}

function getDominantCondition(conditions: Record<string, MarketCondition>): MarketCondition {
  const counts: Record<MarketCondition, number> = { bull_trend: 0, bear_market: 0, range_bound: 0, neutral: 0 }
  for (const c of Object.values(conditions)) counts[c]++
  // 우선순위: 하락 > 상승 > 박스 > 중립
  if (counts.bear_market >= 2) return 'bear_market'
  if (counts.bull_trend >= 2) return 'bull_trend'
  if (counts.range_bound >= 2) return 'range_bound'
  return 'neutral'
}

function getMoodLabel(sentiment: number, panicLevel: number, maxBubble: number): string {
  if (sentiment < -0.5 && panicLevel > 0.3) return '극심한 공포'
  if (sentiment < -0.2) return '공포'
  if (sentiment > 0.5 && maxBubble > 0.6) return '버블 경고'
  if (sentiment > 0.2) return '탐욕'
  return '중립'
}

export function MarketPulseBar({
  marketConditions, herdSentiment, panicLevel, maxBubble,
  dangerLevel, activeEffects, onOpenConditionModal,
}: MarketPulseBarProps) {
  const [effectsOpen, setEffectsOpen] = useState(false)

  const dominant = getDominantCondition(marketConditions)
  const regime = REGIME_CONFIG[dominant]

  // 공포-탐욕 게이지
  const gaugePos = ((herdSentiment + 1) / 2) * 100
  const gaugeColor =
    herdSentiment < -0.3 ? '#e8534a' :
    herdSentiment < -0.1 ? '#e88c3a' :
    herdSentiment < 0.1 ? '#8888aa' :
    herdSentiment < 0.3 ? '#b8c94a' : '#5ec269'
  const moodLabel = getMoodLabel(herdSentiment, panicLevel, maxBubble)

  // 위험도
  const dangerPct = Math.round(dangerLevel * 100)
  const dangerColor = dangerLevel < 0.3 ? '#4ade80' : dangerLevel < 0.6 ? '#facc15' : '#ef4444'

  return (
    <div className="market-pulse-bar">
      {/* 시장 체제 */}
      <button
        className="market-pulse-regime"
        style={{ '--regime-color': regime.color } as React.CSSProperties}
        onClick={onOpenConditionModal}
        title="섹터별 시장 상황 보기"
      >
        <span className="market-pulse-regime-icon">{regime.icon}</span>
        <span className="market-pulse-regime-label" style={{ color: regime.color }}>{regime.label}</span>
      </button>

      <div className="market-pulse-divider" />

      {/* 공포-탐욕 */}
      <div className="market-pulse-mood">
        <span className="market-pulse-mood-label">{moodLabel}</span>
        <div className="market-pulse-gauge">
          <div className="market-pulse-gauge-bg" />
          <motion.div
            className="market-pulse-gauge-marker"
            animate={{ left: `${Math.max(2, Math.min(98, gaugePos))}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ background: gaugeColor, boxShadow: `0 0 6px ${gaugeColor}` }}
          />
        </div>
        {panicLevel > 0.1 && (
          <motion.span
            className="market-pulse-panic"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            💀{Math.round(panicLevel * 100)}%
          </motion.span>
        )}
      </div>

      <div className="market-pulse-divider" />

      {/* 위험도 */}
      {dangerLevel > 0 && (
        <>
          <div className="market-pulse-danger">
            <span className="market-pulse-danger-label" style={{ color: dangerColor }}>위험</span>
            <div className="market-pulse-danger-track">
              {[0, 1, 2, 3, 4].map(i => {
                const threshold = (i + 1) * 20
                const filled = dangerPct >= threshold
                const partial = !filled && dangerPct > i * 20
                return (
                  <div
                    key={i}
                    className="market-pulse-danger-seg"
                    style={{
                      background: filled ? dangerColor : partial ? `${dangerColor}66` : 'rgba(255,255,255,0.08)',
                      boxShadow: filled ? `0 0 3px ${dangerColor}44` : 'none',
                    }}
                  />
                )
              })}
            </div>
            <span className="market-pulse-danger-value" style={{ color: dangerColor }}>{dangerPct}%</span>
          </div>
          <div className="market-pulse-divider" />
        </>
      )}

      {/* 활성 효과 */}
      {activeEffects.length > 0 && (
        <div className="relative">
          <button
            className="market-pulse-effects-btn"
            onClick={() => setEffectsOpen(!effectsOpen)}
          >
            <span className="market-pulse-effects-dot" />
            효과 {activeEffects.length}
          </button>

          <AnimatePresence>
            {effectsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setEffectsOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="market-pulse-effects-dropdown"
                >
                  <div className="px-3 py-1.5 text-[9px] text-bal-text-dim font-bold border-b border-white/5">
                    활성 시장 효과
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {activeEffects.map((effect, i) => (
                      <div key={i} className="px-3 py-1 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {effect.sectorImpacts.slice(0, 3).map((si, j) => {
                              const color = si.sector === 'all' ? '#f0b429' : (SECTOR_COLORS as Record<string, string>)[si.sector] ?? '#888'
                              return (
                                <span
                                  key={j}
                                  className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{ background: color }}
                                  title={si.sector === 'all' ? '전체' : (SECTOR_LABELS as Record<string, string>)[si.sector as Sector] ?? si.sector}
                                />
                              )
                            })}
                          </div>
                          <span className="text-[9px]">
                            {effect.sectorImpacts[0]?.impact > 0
                              ? <span className="text-bal-green">▲</span>
                              : <span className="text-bal-red">▼</span>
                            }
                          </span>
                          <span className="text-[8px] text-bal-text-dim ml-auto">
                            {effect.remainingTurns}턴
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
