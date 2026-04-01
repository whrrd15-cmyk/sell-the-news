/**
 * 거시경제 시뮬레이션 엔진
 *
 * 실제 경제 흐름을 게임에 녹인 고차원 알고리즘:
 * - Taylor Rule 기반 금리 정책
 * - Phillips Curve (인플레↔실업 트레이드오프)
 * - Okun's Law (GDP↔실업 관계)
 * - 환율: 금리 차이 + 무역수지 + 자본 흐름
 * - 교차 섹터 전이 (금융 위기 → 전 섹터 전파)
 */

import type { Sector, RunConfig } from '../data/types'

// ═══════════════════════════════════════════
//  타입 정의
// ═══════════════════════════════════════════

export interface MacroSnapshot {
  week: number
  interestRate: number
  inflation: number
  gdpGrowth: number
  unemployment: number
  exchangeRate: number
  oilPrice: number
  pmi: number
  consumerConfidence: number
}

export interface MacroEconomyState {
  // 핵심 거시 변수
  interestRate: number        // 기준금리 (0~10%)
  inflation: number           // CPI 상승률 (-2~15%)
  gdpGrowth: number           // GDP 성장률 (-5~8%)
  unemployment: number        // 실업률 (2~15%)
  exchangeRate: number        // 원/달러 (900~1600)
  oilPrice: number            // 국제유가 (20~150 $/barrel)
  pmi: number                 // 제조업 PMI (30~70)
  consumerConfidence: number  // 소비자신뢰지수 (50~130)

  // 파생/추적
  interestRateTarget: number  // 중앙은행 목표금리
  tradeBalance: number        // 무역수지 (억$)

  // 히스토리 (최근 13주)
  history: MacroSnapshot[]
}

export interface MacroSensitivity {
  interestRate: number
  inflation: number
  gdp: number
  unemployment: number
  exchangeRate: number  // 양수 = 원 약세에 유리
  oilPrice: number
}

// ═══════════════════════════════════════════
//  섹터 민감도 매트릭스
// ═══════════════════════════════════════════

export const SECTOR_MACRO_SENSITIVITY: Record<Sector, MacroSensitivity> = {
  tech:       { interestRate: -0.30, inflation: -0.10, gdp: +0.40, unemployment: -0.10, exchangeRate: +0.30, oilPrice: -0.10 },
  energy:     { interestRate: -0.10, inflation: +0.20, gdp: +0.20, unemployment:  0.00, exchangeRate: -0.10, oilPrice: +0.80 },
  finance:    { interestRate: +0.50, inflation: -0.20, gdp: +0.30, unemployment: -0.20, exchangeRate: +0.10, oilPrice:  0.00 },
  consumer:   { interestRate: -0.20, inflation: -0.40, gdp: +0.50, unemployment: -0.50, exchangeRate: -0.20, oilPrice: -0.20 },
  healthcare: { interestRate: -0.10, inflation:  0.00, gdp: +0.20, unemployment:  0.00, exchangeRate: +0.10, oilPrice:  0.00 },
}

// 교차 섹터 전이 매트릭스 (하락 전파)
export const CONTAGION_MATRIX: Record<Sector, Partial<Record<Sector, number>>> = {
  finance:    { tech: 0.3, energy: 0.2, consumer: 0.4, healthcare: 0.1 },
  energy:     { tech: 0.1, consumer: 0.3, healthcare: 0.05 },
  tech:       { finance: 0.1, consumer: 0.1 },
  consumer:   { tech: 0.05 },
  healthcare: {},
}

// ═══════════════════════════════════════════
//  유틸리티
// ═══════════════════════════════════════════

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function gaussianRandom(rng: () => number): number {
  const u1 = rng()
  const u2 = rng()
  return Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2)
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

// ═══════════════════════════════════════════
//  초기화
// ═══════════════════════════════════════════

/** 런 난이도별 거시경제 초기 상태 */
export function createInitialMacro(config: RunConfig): MacroEconomyState {
  const r = config.runNumber

  // 난이도별 시작 조건
  const presets: Record<number, Partial<MacroEconomyState>> = {
    1: { interestRate: 2.0, inflation: 2.0, gdpGrowth: 2.5, unemployment: 4.0, exchangeRate: 1200, oilPrice: 65, pmi: 53, consumerConfidence: 105 },
    2: { interestRate: 2.0, inflation: 2.2, gdpGrowth: 3.0, unemployment: 3.5, exchangeRate: 1180, oilPrice: 70, pmi: 55, consumerConfidence: 110 },
    3: { interestRate: 3.0, inflation: 3.0, gdpGrowth: 2.0, unemployment: 4.5, exchangeRate: 1250, oilPrice: 75, pmi: 50, consumerConfidence: 95 },
    4: { interestRate: 4.5, inflation: 4.0, gdpGrowth: 1.5, unemployment: 5.0, exchangeRate: 1300, oilPrice: 85, pmi: 48, consumerConfidence: 85 },
    5: { interestRate: 2.5, inflation: 5.0, gdpGrowth: 4.0, unemployment: 3.0, exchangeRate: 1150, oilPrice: 90, pmi: 58, consumerConfidence: 120 },
    6: { interestRate: 5.0, inflation: 3.5, gdpGrowth: -0.5, unemployment: 7.0, exchangeRate: 1350, oilPrice: 55, pmi: 44, consumerConfidence: 70 },
    7: { interestRate: 3.0, inflation: 6.0, gdpGrowth: 0.5, unemployment: 6.0, exchangeRate: 1400, oilPrice: 110, pmi: 42, consumerConfidence: 65 },
    8: { interestRate: 5.5, inflation: 7.0, gdpGrowth: -1.0, unemployment: 8.0, exchangeRate: 1450, oilPrice: 120, pmi: 38, consumerConfidence: 55 },
  }

  // 무한모드: 런 8 기반 + 추가 스트레스
  const base = presets[Math.min(r, 8)] ?? presets[8]!
  const wave = Math.max(0, r - 8)

  const state: MacroEconomyState = {
    interestRate: (base.interestRate ?? 3.0) + wave * 0.3,
    inflation: (base.inflation ?? 3.0) + wave * 0.5,
    gdpGrowth: (base.gdpGrowth ?? 1.0) - wave * 0.3,
    unemployment: (base.unemployment ?? 5.0) + wave * 0.5,
    exchangeRate: (base.exchangeRate ?? 1300) + wave * 20,
    oilPrice: (base.oilPrice ?? 80) + wave * 5,
    pmi: (base.pmi ?? 48) - wave * 1.5,
    consumerConfidence: (base.consumerConfidence ?? 80) - wave * 5,

    interestRateTarget: (base.interestRate ?? 3.0),
    tradeBalance: 0,
    history: [],
  }

  // 초기 무역수지 계산
  state.tradeBalance = computeTradeBalance(state.exchangeRate, state.oilPrice)

  // 초기 스냅샷
  state.history.push(takeSnapshot(state, 0))

  return state
}

function takeSnapshot(s: MacroEconomyState, week: number): MacroSnapshot {
  return {
    week,
    interestRate: s.interestRate,
    inflation: s.inflation,
    gdpGrowth: s.gdpGrowth,
    unemployment: s.unemployment,
    exchangeRate: s.exchangeRate,
    oilPrice: s.oilPrice,
    pmi: s.pmi,
    consumerConfidence: s.consumerConfidence,
  }
}

function computeTradeBalance(exchangeRate: number, oilPrice: number): number {
  // 원 약세 → 수출 ↑, 유가 ↑ → 수입 비용 ↑
  return 10 + 0.5 * (exchangeRate - 1200) / 100 - 0.3 * oilPrice / 70
}

// ═══════════════════════════════════════════
//  주간 업데이트 (핵심 알고리즘)
// ═══════════════════════════════════════════

/** 매주 1회 호출 — 모든 거시 변수를 한 스텝 전진 */
export function advanceMacroWeek(
  state: MacroEconomyState,
  seed: number,
  week: number,
): MacroEconomyState {
  const rng = seededRandom(seed * 31 + week * 997)
  const g = () => gaussianRandom(rng)
  const s = { ...state }

  // ── 1. 유가 (외생 충격 + 평균 회귀) ──
  s.oilPrice += g() * 5
  s.oilPrice += (70 - s.oilPrice) * 0.05  // mean reversion
  s.oilPrice = clamp(s.oilPrice, 20, 150)

  // ── 2. 인플레이션 (유가 전가 + 금리 억제) ──
  const oilInflation = 0.1 * (s.oilPrice - 70) / 70
  const rateSuppress = -0.05 * (s.interestRate - 2.5)
  s.inflation += oilInflation + rateSuppress + g() * 0.2
  s.inflation = clamp(s.inflation, -2, 15)

  // ── 3. Taylor Rule → 목표금리 ──
  // target = 중립금리(2%) + 1.5×(인플레-목표2%) + 0.5×GDP갭
  s.interestRateTarget = 2.0 + 1.5 * (s.inflation - 2.0) + 0.5 * s.gdpGrowth
  s.interestRateTarget = clamp(s.interestRateTarget, 0, 10)

  // ── 4. 실제 금리 → 목표로 수렴 (주당 최대 ±0.25) ──
  const rateDiff = s.interestRateTarget - s.interestRate
  const rateStep = clamp(rateDiff, -0.25, 0.25)
  s.interestRate += rateStep
  s.interestRate = clamp(s.interestRate, 0, 10)

  // ── 5. GDP 성장률 ──
  // 고금리 → 경기 둔화, PMI 선행지표 반영
  const rateImpact = -0.1 * Math.max(0, s.interestRate - 3.0)
  const pmiSignal = 0.05 * (s.pmi - 50) / 10
  const confSignal = 0.02 * (s.consumerConfidence - 100) / 20
  const gdpMeanRev = (2.0 - s.gdpGrowth) * 0.05
  s.gdpGrowth += rateImpact + pmiSignal + confSignal + gdpMeanRev + g() * 0.15
  s.gdpGrowth = clamp(s.gdpGrowth, -5, 8)

  // ── 6. 실업률 (Okun's Law — GDP 후행) ──
  const okunEffect = -0.03 * s.gdpGrowth
  const unemployMeanRev = (5.0 - s.unemployment) * 0.02
  s.unemployment += okunEffect + unemployMeanRev + g() * 0.1
  s.unemployment = clamp(s.unemployment, 2, 15)

  // ── 7. PMI (GDP 선행지표) ──
  const pmiTarget = s.gdpGrowth * 2 + 50
  s.pmi += (pmiTarget - s.pmi) * 0.15 + g() * 2
  s.pmi = clamp(s.pmi, 30, 70)

  // ── 8. 소비자신뢰 (GDP + 실업 반영) ──
  const confTarget = 100 + s.gdpGrowth * 5 - s.unemployment * 2
  s.consumerConfidence += (confTarget - s.consumerConfidence) * 0.1 + g() * 3
  s.consumerConfidence = clamp(s.consumerConfidence, 50, 130)

  // ── 9. 환율 (금리 차이 + 무역수지 + 노이즈) ──
  // 금리 높으면 자본 유입 → 원 강세(수치 ↓)
  const ratePull = 5 * (2.5 - s.interestRate) / 2.5
  const tradePull = -2 * s.tradeBalance / 100
  s.exchangeRate += ratePull + tradePull + g() * 15
  s.exchangeRate = clamp(s.exchangeRate, 900, 1600)

  // ── 10. 무역수지 ──
  s.tradeBalance = computeTradeBalance(s.exchangeRate, s.oilPrice)

  // ── 히스토리 갱신 (최대 13주 보관) ──
  s.history = [...state.history, takeSnapshot(s, week)].slice(-13)

  return s
}

// ═══════════════════════════════════════════
//  섹터 효과 계산 (delta 기반)
// ═══════════════════════════════════════════

/** 거시 변수 변화량 → 섹터별 주가 영향 계산 */
export function calculateMacroEffect(
  macro: MacroEconomyState,
  prevMacro: MacroEconomyState,
  sector: Sector,
): number {
  const sens = SECTOR_MACRO_SENSITIVITY[sector]

  // 변화량 정규화
  const dRate = (macro.interestRate - prevMacro.interestRate) / 1.0
  const dInflation = (macro.inflation - prevMacro.inflation) / 1.0
  const dGdp = (macro.gdpGrowth - prevMacro.gdpGrowth) / 1.0
  const dUnemploy = (macro.unemployment - prevMacro.unemployment) / 1.0
  const dFx = (macro.exchangeRate - prevMacro.exchangeRate) / 100   // 100원 단위
  const dOil = (macro.oilPrice - prevMacro.oilPrice) / 10           // 10달러 단위

  const raw =
    dRate * sens.interestRate +
    dInflation * sens.inflation +
    dGdp * sens.gdp +
    dUnemploy * sens.unemployment +
    dFx * sens.exchangeRate +
    dOil * sens.oilPrice

  // 스케일 팩터: 전체 가격 변동의 ~10-20% 기여
  const MACRO_SCALE = 0.01
  return raw * MACRO_SCALE
}

/** 모든 섹터의 거시 효과를 사전 계산 */
export function calculateAllSectorMacroEffects(
  macro: MacroEconomyState,
  prevMacro: MacroEconomyState,
): Record<string, number> {
  const sectors: Sector[] = ['tech', 'energy', 'finance', 'consumer', 'healthcare']
  const effects: Record<string, number> = {}
  for (const s of sectors) {
    effects[s] = calculateMacroEffect(macro, prevMacro, s)
  }
  return effects
}

// ═══════════════════════════════════════════
//  교차 섹터 전이 (Contagion)
// ═══════════════════════════════════════════

/** 특정 섹터 급락 시 다른 섹터로 전이되는 효과 계산 */
export function calculateContagion(
  sectorMomentum: Record<string, number>,
  threshold: number = -0.05,
): Record<string, number> {
  const contagion: Record<string, number> = {}
  const sectors = Object.keys(CONTAGION_MATRIX) as Sector[]

  for (const source of sectors) {
    const momentum = sectorMomentum[source] ?? 0
    if (momentum > threshold) continue  // 하락 섹터만 전이
    const targets = CONTAGION_MATRIX[source]
    if (!targets) continue

    for (const [target, weight] of Object.entries(targets)) {
      contagion[target] = (contagion[target] ?? 0) + momentum * (weight ?? 0)
    }
  }

  return contagion
}
