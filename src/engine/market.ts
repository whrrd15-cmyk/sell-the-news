import type { Stock, ActiveEffect, RunConfig, PriceHistory, WeeklyRule } from '../data/types'
import { STOCKS } from '../data/stocks'

/**
 * 주가 시뮬레이션 엔진
 * - 기본 트렌드 + 뉴스 영향 + 랜덤 노이즈
 * - 군중 심리 (herd sentiment) + 버블 + 패닉
 * - 성공→위험 (danger level) 시스템
 * - 주간 특수 규칙 연동
 */

// 시드 기반 랜덤 (재현 가능)
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// 정규분포 근사 (Box-Muller)
function gaussianRandom(rng: () => number): number {
  const u1 = rng()
  const u2 = rng()
  return Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2)
}

export interface PriceChangeBreakdown {
  stockId: string
  ticker: string
  eventEffect: number      // 뉴스/이벤트 영향
  herdEffect: number       // 군중 심리
  momentum: number          // 모멘텀 (관성)
  meanReversion: number     // 평균 회귀
  noise: number             // 랜덤 노이즈
  bubblePop: number         // 버블 붕괴
  flashCrash: number        // 플래시 크래시
  totalChange: number       // 최종 변동률
}

export interface EffectHistoryEntry {
  turnApplied: number
  headline: string
  sectorImpacts: { sector: string; impact: number }[]
}

export interface MarketState {
  prices: Record<string, number>
  priceHistories: PriceHistory[]
  activeEffects: ActiveEffect[]
  marketTrend: number
  sectorMomentum: Record<string, number>
  // 강화된 시장 시스템
  dangerLevel: number                     // 0~1, 플레이어 성과 기반 위험도
  herdSentiment: number                   // -1(패닉)~+1(광기), 군중 심리
  sectorBubble: Record<string, number>    // 0~1, 섹터별 버블 수준
  panicLevel: number                      // 0~1, 급락 시 패닉 정도
  effectHistory: EffectHistoryEntry[]     // 이벤트 히스토리 (차트 마커용)
}

const SECTORS = ['tech', 'energy', 'finance', 'consumer', 'healthcare'] as const

export function createInitialMarketState(config: RunConfig): MarketState {
  const prices: Record<string, number> = {}
  const priceHistories: PriceHistory[] = []
  const sectorMomentum: Record<string, number> = {}
  const sectorBubble: Record<string, number> = {}

  for (const stock of STOCKS) {
    const rng = seededRandom(stock.basePrice * 100 + config.runNumber)
    const variance = 1 + (rng() - 0.5) * 0.1
    prices[stock.id] = Math.round(stock.basePrice * variance * 100) / 100
    priceHistories.push({ stockId: stock.id, prices: [prices[stock.id]] })
  }

  for (const sector of SECTORS) {
    sectorMomentum[sector] = 0
    sectorBubble[sector] = 0
  }

  return {
    prices,
    priceHistories,
    activeEffects: [],
    marketTrend: 0.02,
    sectorMomentum,
    dangerLevel: 0,
    herdSentiment: 0,
    sectorBubble,
    panicLevel: 0,
    effectHistory: [],
  }
}

// ─── 성공→위험 시스템 ──────────────────────────────────────

export function calculateDangerLevel(
  portfolioReturn: number,
  quarterNumber: number,
): number {
  const baseThreshold = 0.05
  const sensitivity = 0.5 + quarterNumber * 0.1
  if (portfolioReturn <= baseThreshold) return 0
  const excess = portfolioReturn - baseThreshold
  return Math.min(1.0, excess * sensitivity)
}

// ─── 군중 심리 ─────────────────────────────────────────────

function updateHerdSentiment(
  current: number,
  avgMarketReturn: number,
  rng: () => number,
): number {
  const drift = avgMarketReturn * 2.0
  const noise = (rng() - 0.5) * 0.05
  const next = current * 0.9 + drift + noise
  return Math.max(-1, Math.min(1, next))
}

// ─── 버블 시스템 ───────────────────────────────────────────

function updateSectorBubbles(
  current: Record<string, number>,
  prices: Record<string, number>,
): Record<string, number> {
  const next = { ...current }
  for (const sector of SECTORS) {
    const sectorStocks = STOCKS.filter((s) => s.sector === sector && !s.isETF)
    const avgDeviation =
      sectorStocks.reduce(
        (sum, s) => sum + (prices[s.id] - s.basePrice) / s.basePrice,
        0,
      ) / sectorStocks.length

    if (avgDeviation > 0.15) {
      next[sector] = Math.min(1.0, (current[sector] || 0) + 0.05)
    } else {
      next[sector] = Math.max(0, (current[sector] || 0) - 0.02)
    }
  }
  return next
}

// ─── 패닉 시스템 ───────────────────────────────────────────

function updatePanicLevel(
  current: number,
  priceChanges: Record<string, number>,
): number {
  const values = Object.values(priceChanges)
  const droppingCount = values.filter((v) => v < -0.03).length
  const risingCount = values.filter((v) => v > 0.03).length
  const avgChange = values.reduce((a, b) => a + b, 0) / (values.length || 1)

  let next = current
  if (droppingCount >= 3 || avgChange < -0.05) {
    next = current + 0.15
  } else {
    next = current - 0.10
  }
  // 반등 보너스: 상승 종목이 있으면 패닉 추가 감소
  if (risingCount > 0 && current > 0) {
    next -= 0.05
  }
  return Math.max(0, Math.min(0.7, next))
}

// ─── 메인 시뮬레이션 ──────────────────────────────────────

export interface SimulateTurnResult {
  state: MarketState
  breakdowns: PriceChangeBreakdown[]
}

export function simulateTurn(
  state: MarketState,
  config: RunConfig,
  turn: number,
  weeklyRule?: WeeklyRule | null,
): SimulateTurnResult {
  const rng = seededRandom(turn * 7919 + config.runNumber * 31)
  const newPrices: Record<string, number> = { ...state.prices }
  const newHistories = [...state.priceHistories]
  const newMomentum = { ...state.sectorMomentum }
  const priceChanges: Record<string, number> = {}
  const breakdowns: PriceChangeBreakdown[] = []

  // 1. 활성 이벤트 효과 → 섹터별 누적 영향
  const sectorBonus: Record<string, number> = {}
  const newEffects = state.activeEffects
    .map((e) => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
    .filter((e) => e.remainingTurns > 0)

  for (const effect of state.activeEffects) {
    for (const si of effect.sectorImpacts) {
      const key = si.sector
      if (key === 'all') {
        for (const s of SECTORS) {
          sectorBonus[s] = (sectorBonus[s] || 0) + si.impact * 0.3
        }
      } else {
        sectorBonus[key] = (sectorBonus[key] || 0) + si.impact * 0.3
      }
    }
  }

  // 팬데믹 주간: 패닉 즉시 주입
  if (weeklyRule?.effect.type === 'pandemic_week') {
    state = {
      ...state,
      panicLevel: Math.min(1.0, state.panicLevel + weeklyRule.effect.panicBoost),
    }
  }

  // 주간 규칙 수치들
  const weeklyVolMult =
    weeklyRule?.effect.type === 'volatile_week' ? weeklyRule.effect.multiplier
    : weeklyRule?.effect.type === 'pandemic_week' ? weeklyRule.effect.volatilityMultiplier
    : 1
  const weeklyMomentumMult =
    weeklyRule?.effect.type === 'fomo_week' ? weeklyRule.effect.bonusMomentum : 1
  const weeklyDoubleRate =
    weeklyRule?.effect.type === 'double_or_nothing'

  // 플래시 크래시 체크 (1~3개 랜덤 종목에만 적용)
  const flashCrashTargets = new Set<string>()
  if (weeklyRule?.effect.type === 'flash_crash_risk') {
    if (rng() < 0.15) {
      const nonETF = STOCKS.filter(s => !s.isETF)
      const count = 1 + Math.floor(rng() * 3) // 1~3개
      const shuffled = [...nonETF].sort(() => rng() - 0.5)
      for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        flashCrashTargets.add(shuffled[i].id)
      }
    }
  }

  // 2. 각 주식 가격 업데이트
  for (const stock of STOCKS) {
    if (stock.isETF) continue // ETF는 별도 처리
    const currentPrice = state.prices[stock.id]

    // 기본 트렌드
    const trendEffect = state.marketTrend * 0.005

    // 섹터 이벤트 영향
    const eventEffect = (sectorBonus[stock.sector] || 0) * stock.newsSensitivity

    // 모멘텀 (관성) + 주간 규칙 증폭
    const rawMomentum = (newMomentum[stock.sector] || 0) * 0.3 * weeklyMomentumMult

    // 군중 심리: 모멘텀을 증폭
    const herdEffect =
      state.herdSentiment * 0.01 * (1 + Math.abs(rawMomentum))

    // 패닉 시 하락 모멘텀 가속
    const panicMult = 1 + state.panicLevel * 0.3
    const momentum = rawMomentum < 0 ? rawMomentum * panicMult : rawMomentum

    // 평균 회귀 (위험도 높으면 강화, 패닉 시 약화)
    const meanRevStr = (0.02 + state.dangerLevel * 0.015) * (1 - state.panicLevel * 0.5)
    const meanReversion = ((stock.basePrice - currentPrice) / stock.basePrice) * meanRevStr

    // 랜덤 노이즈 (위험도 + 주간 규칙 반영)
    const dangerBoost = 1 + state.dangerLevel * 0.8
    const noise =
      gaussianRandom(rng) *
      stock.volatility *
      config.volatilityMultiplier *
      dangerBoost *
      weeklyVolMult *
      0.03

    let changeRate = trendEffect + eventEffect + momentum + herdEffect + meanReversion + noise

    // 주간 규칙: 더블 오어 낫싱
    if (weeklyDoubleRate) changeRate *= 2

    // 플래시 크래시 (해당 종목만, 최대 -10%)
    let flashCrashVal = 0
    if (flashCrashTargets.has(stock.id)) {
      flashCrashVal = -0.1
      changeRate -= 0.1
    }

    // 버블 팝 체크
    let bubblePopVal = 0
    const bubbleLevel = state.sectorBubble[stock.sector] || 0
    if (bubbleLevel > 0.8 && rng() < (bubbleLevel - 0.8) * 0.5) {
      bubblePopVal = -(0.08 + rng() * 0.07)
      changeRate += bubblePopVal // 최대 -15%
    }

    const newPrice = Math.max(0.01, currentPrice * (1 + changeRate))

    breakdowns.push({
      stockId: stock.id,
      ticker: stock.ticker,
      eventEffect,
      herdEffect,
      momentum,
      meanReversion,
      noise,
      bubblePop: bubblePopVal,
      flashCrash: flashCrashVal,
      totalChange: changeRate,
    })
    const roundedPrice = Math.round(newPrice * 100) / 100
    newPrices[stock.id] = roundedPrice

    // 히스토리 업데이트
    const historyIndex = newHistories.findIndex((h) => h.stockId === stock.id)
    if (historyIndex >= 0) {
      newHistories[historyIndex] = {
        ...newHistories[historyIndex],
        prices: [...newHistories[historyIndex].prices, roundedPrice],
      }
    }

    // 모멘텀 업데이트
    const priceChange = (roundedPrice - currentPrice) / currentPrice
    newMomentum[stock.sector] = priceChange * 0.5 + (newMomentum[stock.sector] || 0) * 0.5
    priceChanges[stock.id] = priceChange
  }

  // ETF 가격 조정
  for (const stock of STOCKS.filter((s) => s.isETF)) {
    const sectorStocks = STOCKS.filter(
      (s) => s.sector === stock.sector && !s.isETF,
    )
    if (sectorStocks.length > 0) {
      const avgChange =
        sectorStocks.reduce((sum, s) => {
          const prev = state.prices[s.id]
          const curr = newPrices[s.id]
          return sum + (curr - prev) / prev
        }, 0) / sectorStocks.length

      const etfPrice = state.prices[stock.id] * (1 + avgChange * 0.9)
      newPrices[stock.id] = Math.round(Math.max(0.01, etfPrice) * 100) / 100

      const historyIndex = newHistories.findIndex((h) => h.stockId === stock.id)
      if (historyIndex >= 0) {
        const h = newHistories[historyIndex]
        h.prices[h.prices.length - 1] = newPrices[stock.id]
      }
    }
  }

  // 시장 트렌드 랜덤 워크
  const newMarketTrend = state.marketTrend + gaussianRandom(rng) * 0.01
  const clampedTrend = Math.max(-0.5, Math.min(0.5, newMarketTrend))

  // 군중 심리 업데이트
  const allChanges = Object.values(priceChanges)
  const avgReturn = allChanges.length > 0
    ? allChanges.reduce((a, b) => a + b, 0) / allChanges.length
    : 0
  const newHerdSentiment = updateHerdSentiment(state.herdSentiment, avgReturn, rng)

  // 버블 업데이트
  const newSectorBubble = updateSectorBubbles(state.sectorBubble, newPrices)

  // 패닉 업데이트
  const newPanicLevel = updatePanicLevel(state.panicLevel, priceChanges)

  return {
    state: {
      prices: newPrices,
      priceHistories: newHistories,
      activeEffects: newEffects,
      marketTrend: clampedTrend,
      sectorMomentum: newMomentum,
      dangerLevel: state.dangerLevel,
      herdSentiment: newHerdSentiment,
      sectorBubble: newSectorBubble,
      panicLevel: newPanicLevel,
      effectHistory: state.effectHistory,
    },
    breakdowns,
  }
}

/**
 * 전 분기(13턴) 가격 히스토리 자동 생성
 */
export function generatePreviousQuarter(
  initialState: MarketState,
  config: RunConfig,
  turns: number = 13,
): MarketState {
  let state = initialState
  for (let t = -turns; t < 0; t++) {
    const result = simulateTurn(state, config, t + 1000)
    state = result.state
  }
  return state
}

/**
 * 뉴스 이벤트 효과를 시장에 추가
 */
export function applyNewsEffect(
  state: MarketState,
  newsId: string,
  impacts: { sector: string; impact: number; duration: number }[],
  turn?: number,
  headline?: string,
): MarketState {
  const newEffect: ActiveEffect = {
    sectorImpacts: impacts.map((i) => ({
      sector: i.sector as Stock['sector'] | 'all',
      impact: i.impact,
      duration: i.duration,
    })),
    remainingTurns: Math.max(...impacts.map((i) => i.duration)),
    sourceNewsId: newsId,
  }

  const newHistory = headline && turn != null ? [
    ...state.effectHistory,
    {
      turnApplied: turn,
      headline,
      sectorImpacts: impacts.map(i => ({ sector: i.sector, impact: i.impact })),
    },
  ] : state.effectHistory

  return {
    ...state,
    activeEffects: [...state.activeEffects, newEffect],
    effectHistory: newHistory,
  }
}

/**
 * 주식의 현재 수익률 계산
 */
export function getStockReturn(history: PriceHistory): number {
  if (history.prices.length < 2) return 0
  const first = history.prices[0]
  const last = history.prices[history.prices.length - 1]
  return (last - first) / first
}

/**
 * 가격 변동률 (최근 턴 대비)
 */
export function getPriceChange(history: PriceHistory): number {
  if (history.prices.length < 2) return 0
  const prev = history.prices[history.prices.length - 2]
  const curr = history.prices[history.prices.length - 1]
  return (curr - prev) / prev
}
