import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SFX } from '../../utils/sound'
import { PriceBreakdownBar } from '../ui/PriceBreakdownBar'
import type { PriceChangeBreakdown, EffectHistoryEntry } from '../../engine/market'
import type { AutoTradeResult } from '../../data/types'
import { CausalityAnnotation } from './CausalityAnnotation'
import { STOCKS } from '../../data/stocks'

interface CascadeData {
  portfolioValueBefore: number
  portfolioValueAfter: number
  stockChanges: { stockId: string; ticker: string; prevPrice: number; newPrice: number }[]
  rpEarned: number
  interestEarned: number
  dividendEarned: number
  insuranceCompensation: number
  rpDoubled: boolean
  breakdowns: PriceChangeBreakdown[]
  effectHistory: EffectHistoryEntry[]
  autoTradeResult?: AutoTradeResult
}

interface NewsFeedback {
  newsId: string
  note: string
  wasFake: boolean
}

interface ScoreCascadeProps {
  data: CascadeData
  feedback: NewsFeedback[]
  onComplete: () => void
}

type Phase = 'news' | 'stocks' | 'items' | 'autoTrades' | 'counter' | 'interest' | 'rp' | 'summary'

interface ItemEffect {
  icon: string
  label: string
  value: string
  color: string
}

export function ScoreCascade({ data, feedback, onComplete }: ScoreCascadeProps) {
  const [phase, setPhase] = useState<Phase>('news')
  const [newsIdx, setNewsIdx] = useState(0)
  const [stockIdx, setStockIdx] = useState(0)
  const [itemIdx, setItemIdx] = useState(0)
  const [autoTradeIdx, setAutoTradeIdx] = useState(0)
  const [counterValue, setCounterValue] = useState(data.portfolioValueBefore)
  const counterRef = useRef<number>(0)
  const autoTrades = data.autoTradeResult?.executedTrades ?? []

  // Build item effects list
  const itemEffects: ItemEffect[] = []
  if (data.insuranceCompensation > 0) {
    itemEffects.push({ icon: '/icons/fx-shield.png', label: '손실보험', value: `+$${Math.floor(data.insuranceCompensation).toLocaleString()}`, color: 'blue' })
  }
  if (data.rpDoubled) {
    itemEffects.push({ icon: '/icons/fx-bolt.png', label: 'RP 2배 적용', value: `${data.rpEarned}RP`, color: 'purple' })
  }
  if (data.dividendEarned > 0) {
    itemEffects.push({ icon: '/icons/fx-gem.png', label: '배당수익', value: `+$${Math.floor(data.dividendEarned).toLocaleString()}`, color: 'gold' })
  }

  const advancePhase = useCallback((next: Phase) => {
    setPhase(next)
  }, [])

  // News cascade
  useEffect(() => {
    if (phase !== 'news') return
    if (feedback.length === 0) { advancePhase('stocks'); return }
    if (newsIdx >= feedback.length) {
      const t = setTimeout(() => advancePhase('stocks'), 200)
      return () => clearTimeout(t)
    }
    SFX.cardFlick()
    const t = setTimeout(() => setNewsIdx(i => i + 1), 300)
    return () => clearTimeout(t)
  }, [phase, newsIdx, feedback.length, advancePhase])

  // Stock cascade
  useEffect(() => {
    if (phase !== 'stocks') return
    const nextAfterStocks = itemEffects.length > 0 ? 'items' : autoTrades.length > 0 ? 'autoTrades' : 'counter'
    if (data.stockChanges.length === 0) { advancePhase(nextAfterStocks); return }
    if (stockIdx >= data.stockChanges.length) {
      const t = setTimeout(() => advancePhase(nextAfterStocks), 200)
      return () => clearTimeout(t)
    }
    const change = data.stockChanges[stockIdx]
    if (change.newPrice >= change.prevPrice) SFX.priceUp()
    else SFX.priceDown()
    const t = setTimeout(() => setStockIdx(i => i + 1), 200)
    return () => clearTimeout(t)
  }, [phase, stockIdx, data.stockChanges, advancePhase, itemEffects.length])

  // Items cascade
  useEffect(() => {
    if (phase !== 'items') return
    if (itemIdx >= itemEffects.length) {
      const next = autoTrades.length > 0 ? 'autoTrades' : 'counter'
      const t = setTimeout(() => advancePhase(next), 300)
      return () => clearTimeout(t)
    }
    const effect = itemEffects[itemIdx]
    if (effect.color === 'purple') SFX.rpEarn()
    else SFX.chipCount()
    const t = setTimeout(() => setItemIdx(i => i + 1), 400)
    return () => clearTimeout(t)
  }, [phase, itemIdx, itemEffects, advancePhase, autoTrades.length])

  // Auto-trade cascade
  useEffect(() => {
    if (phase !== 'autoTrades') return
    if (autoTradeIdx >= autoTrades.length) {
      const t = setTimeout(() => advancePhase('counter'), 300)
      return () => clearTimeout(t)
    }
    SFX.chipCount()
    const t = setTimeout(() => setAutoTradeIdx(i => i + 1), 350)
    return () => clearTimeout(t)
  }, [phase, autoTradeIdx, autoTrades, advancePhase])

  // Counter animation
  useEffect(() => {
    if (phase !== 'counter') return
    const from = data.portfolioValueBefore
    const to = data.portfolioValueAfter
    const duration = 1500
    const startTime = Date.now()
    let tickCount = 0

    function tick() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const val = from + (to - from) * eased
      setCounterValue(val)

      if (Math.floor(elapsed / 80) > tickCount) {
        tickCount = Math.floor(elapsed / 80)
        SFX.cascadeTick(progress)
      }

      if (progress < 1) {
        counterRef.current = requestAnimationFrame(tick)
      } else {
        const next = data.interestEarned > 0 ? 'interest' : 'rp'
        setTimeout(() => advancePhase(next), 300)
      }
    }
    counterRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(counterRef.current)
  }, [phase, data, advancePhase])

  // Interest flash
  useEffect(() => {
    if (phase !== 'interest') return
    SFX.rpEarn()
    const t = setTimeout(() => advancePhase('rp'), 600)
    return () => clearTimeout(t)
  }, [phase, advancePhase])

  // RP flash
  useEffect(() => {
    if (phase !== 'rp') return
    SFX.rpEarn()
    const t = setTimeout(() => advancePhase('summary'), 600)
    return () => clearTimeout(t)
  }, [phase, advancePhase])

  // Summary — no auto-advance, user clicks "다음 주"

  const valueDiff = data.portfolioValueAfter - data.portfolioValueBefore
  const isGain = valueDiff >= 0
  const phaseGte = (target: Phase) => {
    const order: Phase[] = ['news', 'stocks', 'items', 'autoTrades', 'counter', 'interest', 'rp', 'summary']
    return order.indexOf(phase) >= order.indexOf(target)
  }

  return (
    <div className="score-cascade">
      {/* 뉴스 해소 */}
      <AnimatePresence>
        {phase === 'news' && feedback.slice(0, newsIdx).map((fb, i) => (
          <motion.div
            key={fb.newsId + i}
            initial={{ opacity: 0, x: -30, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="score-cascade-news"
          >
            <span className={`score-cascade-badge ${fb.wasFake ? 'score-cascade-badge--fake' : 'score-cascade-badge--real'}`}>
              {fb.wasFake ? '가짜' : '진짜'}
            </span>
            <span className="score-cascade-note">{fb.note}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 종목 가격 변동 + 원인 분해 */}
      <AnimatePresence>
        {phaseGte('stocks') && phase !== 'news' &&
          data.stockChanges.slice(0, stockIdx).map((sc, i) => {
            const pct = sc.prevPrice > 0 ? ((sc.newPrice - sc.prevPrice) / sc.prevPrice * 100) : 0
            const up = pct >= 0
            const bd = data.breakdowns.find(b => b.stockId === sc.stockId)
            return (
              <motion.div
                key={sc.stockId + i}
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="score-cascade-stock"
              >
                <div className="flex items-center gap-2 px-2">
                  <span className="score-cascade-ticker">{sc.ticker}</span>
                  <span className="score-cascade-price">${sc.newPrice.toFixed(0)}</span>
                  <span className={`score-cascade-pct ${up ? 'score-cascade-pct--up' : 'score-cascade-pct--down'}`}>
                    {up ? '+' : ''}{pct.toFixed(1)}%
                  </span>
                </div>
                {bd && <PriceBreakdownBar breakdown={bd} />}
                {bd && (
                  <CausalityAnnotation
                    breakdown={bd}
                    effectHistory={data.effectHistory}
                    stockSector={STOCKS.find(s => s.id === sc.stockId)?.sector ?? 'tech'}
                  />
                )}
              </motion.div>
            )
          })
        }
      </AnimatePresence>

      {/* 아이템 효과 */}
      <AnimatePresence>
        {phaseGte('items') && phase !== 'news' && phase !== 'stocks' &&
          itemEffects.slice(0, itemIdx).map((eff, i) => (
            <motion.div
              key={eff.label + i}
              initial={{ opacity: 0, scale: 1.3 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`score-cascade-item score-cascade-item--${eff.color}`}
            >
              <img src={eff.icon} alt="" style={{ width: 16, height: 16, imageRendering: 'pixelated' }} />
              <span className="score-cascade-item-label">{eff.label}</span>
              <span className="score-cascade-item-value">{eff.value}</span>
            </motion.div>
          ))
        }
      </AnimatePresence>

      {/* 자동 매매 결과 */}
      <AnimatePresence>
        {phaseGte('autoTrades') && !['news', 'stocks', 'items'].includes(phase) && autoTrades.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: 11, color: '#7799ff', fontWeight: 700, marginTop: 8, marginBottom: 4 }}
            >
              🤖 자동 매매 실행
            </motion.div>
            {autoTrades.slice(0, autoTradeIdx).map((trade, i) => (
              <motion.div
                key={`at-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  color: trade.action === 'buy' ? '#5ec269' : '#e8534a',
                  background: trade.action === 'buy' ? 'rgba(94,194,105,0.08)' : 'rgba(232,83,74,0.08)',
                  borderRadius: 4,
                  marginBottom: 2,
                }}
              >
                <span>{trade.action === 'buy' ? '📥' : '📤'}</span>
                <span style={{ fontWeight: 600 }}>{trade.rule}</span>
                <span style={{ color: '#8888aa' }}>×{trade.shares}주</span>
                <span style={{ color: '#8888aa' }}>${trade.price.toFixed(0)}</span>
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* 포트폴리오 카운터 */}
      {phaseGte('counter') && (
        <motion.div
          className="score-cascade-counter"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="score-cascade-counter-label">포트폴리오</div>
          <div className={`score-cascade-counter-value ${isGain ? 'text-bal-green' : 'text-bal-red'}`}>
            ${Math.floor(counterValue).toLocaleString()}
          </div>
          {phaseGte('interest') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`score-cascade-counter-diff ${isGain ? 'text-bal-green' : 'text-bal-red'}`}
            >
              {isGain ? '+' : '-'}${Math.floor(Math.abs(valueDiff)).toLocaleString()}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* 이자 수익 */}
      <AnimatePresence>
        {phaseGte('interest') && data.interestEarned > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="score-cascade-bonus"
          >
            <img src="/icons/tab-spot.png" alt="" style={{ width: 14, height: 14, imageRendering: 'pixelated', display: 'inline', verticalAlign: 'middle' }} /> 이자 수익 +${data.interestEarned}
          </motion.div>
        )}
      </AnimatePresence>

      {/* RP 획득 */}
      <AnimatePresence>
        {phaseGte('rp') && (
          <motion.div
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="score-cascade-bonus score-cascade-bonus--rp"
          >
            <img src="/icons/fx-star.png" alt="" style={{ width: 14, height: 14, imageRendering: 'pixelated', display: 'inline', verticalAlign: 'middle' }} /> +{data.rpEarned} RP
          </motion.div>
        )}
      </AnimatePresence>

      {/* 다음 주 버튼 */}
      <AnimatePresence>
        {phase === 'summary' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: 20 }}
          >
            <motion.button
              className="score-cascade-next-btn"
              onClick={onComplete}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98, y: 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              다음 주
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
