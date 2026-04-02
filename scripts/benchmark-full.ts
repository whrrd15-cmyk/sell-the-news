/**
 * Sell The News - Full Strategy Benchmark (with Skills, Items, Auto-Trade, RP Economy)
 *
 * 6가지 유저 프로필로 시뮬레이션하여 게임 전체 밸런스를 검증합니다.
 *
 * Agents:
 *   passive   — 매수 후 홀드 (기준선)
 *   beginner  — 50% 정확도 뉴스 판단, 기본 매매
 *   skilled   — 60% 정확도, stop-loss, 기본 RP 경제
 *   expert    — 80% 정확도, DCA + trailing_stop + 배당 + 거시분석
 *   whale     — 레버리지 2x + 공매도 + 전 스킬
 *   meta      — 메타 업그레이드 적용 expert
 *
 * Usage:
 *   npx tsx scripts/benchmark-full.ts
 *   npx tsx scripts/benchmark-full.ts --runs 100 --level 1
 */

import { RUN_CONFIGS } from '../src/data/types'
import type { RunConfig, ChainEvent, WeeklyRule, NewsCard } from '../src/data/types'
import { STOCKS } from '../src/data/stocks'
import {
  createInitialMarketState,
  simulateTurn,
  applyNewsEffect,
  calculateDangerLevel,
} from '../src/engine/market'
import type { MarketState } from '../src/engine/market'
import {
  createInitialMacro,
  advanceMacroWeek,
  calculateAllSectorMacroEffects,
  SECTOR_MACRO_SENSITIVITY,
} from '../src/engine/macroEconomy'
import type { MacroEconomyState } from '../src/engine/macroEconomy'
import { generateTurnNews } from '../src/engine/news'
import { rollWeeklyRule } from '../src/data/weeklyRules'

// ─── CLI ─────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag)
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined
  }
  return {
    runs: parseInt(get('--runs') ?? '100', 10),
    level: get('--level') ? parseInt(get('--level')!, 10) : undefined,
    seed: parseInt(get('--seed') ?? '42', 10),
    json: args.includes('--json'),
  }
}

// ─── Constants ───────────────────────────────────────────

const NON_ETF_STOCKS = STOCKS.filter(s => !s.isETF)
const SECTORS = ['tech', 'energy', 'finance', 'consumer', 'healthcare'] as const
type Sector = typeof SECTORS[number]
const BASE_FEE = 0.005
const REDUCED_FEE = 0.002

// ─── Seeded RNG ──────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// ─── Portfolio ───────────────────────────────────────────

interface Portfolio {
  cash: number
  shares: Record<string, number>
  rp: number
}

function getPortfolioValue(p: Portfolio, prices: Record<string, number>): number {
  let v = p.cash
  for (const [id, qty] of Object.entries(p.shares)) v += qty * (prices[id] ?? 0)
  return v
}

function buyStock(p: Portfolio, stockId: string, amount: number, price: number, fee: number): Portfolio {
  if (amount <= 0 || price <= 0) return p
  const cost = amount * price
  const totalCost = cost * (1 + fee)
  if (totalCost > p.cash) {
    const maxAmount = Math.floor(p.cash / (price * (1 + fee)))
    if (maxAmount <= 0) return p
    return buyStock(p, stockId, maxAmount, price, fee)
  }
  return {
    ...p,
    cash: p.cash - totalCost,
    shares: { ...p.shares, [stockId]: (p.shares[stockId] ?? 0) + amount },
  }
}

function sellStock(p: Portfolio, stockId: string, amount: number, price: number, fee: number): Portfolio {
  const held = p.shares[stockId] ?? 0
  const actual = Math.min(amount, held)
  if (actual <= 0) return p
  const revenue = actual * price * (1 - fee)
  const newShares = { ...p.shares }
  newShares[stockId] = held - actual
  if (newShares[stockId] <= 0) delete newShares[stockId]
  return { ...p, cash: p.cash + revenue, shares: newShares }
}

function sellAll(p: Portfolio, prices: Record<string, number>, fee: number): Portfolio {
  let result = { ...p, shares: { ...p.shares } }
  for (const [id, qty] of Object.entries(result.shares)) {
    if (qty > 0) result = sellStock(result, id, qty, prices[id] ?? 0, fee)
  }
  return result
}

// ─── Auto-Trade Rules ────────────────────────────────────

function applyStopLoss(p: Portfolio, prices: Record<string, number>, buyPrices: Record<string, number>, threshold: number, fee: number): Portfolio {
  let result = { ...p, shares: { ...p.shares } }
  for (const [id, qty] of Object.entries(result.shares)) {
    if (qty <= 0) continue
    const buyPrice = buyPrices[id]
    if (!buyPrice) continue
    const returnPct = (prices[id] - buyPrice) / buyPrice
    if (returnPct <= threshold) {
      result = sellStock(result, id, qty, prices[id], fee)
    }
  }
  return result
}

function applyTrailingStop(p: Portfolio, prices: Record<string, number>, buyPrices: Record<string, number>, target: number, fee: number): Portfolio {
  let result = { ...p, shares: { ...p.shares } }
  for (const [id, qty] of Object.entries(result.shares)) {
    if (qty <= 0) continue
    const buyPrice = buyPrices[id]
    if (!buyPrice) continue
    const returnPct = (prices[id] - buyPrice) / buyPrice
    if (returnPct >= target) {
      result = sellStock(result, id, qty, prices[id], fee)
    }
  }
  return result
}

function applyDividend(p: Portfolio, prices: Record<string, number>, rate: number): Portfolio {
  let dividend = 0
  for (const [id, qty] of Object.entries(p.shares)) {
    dividend += qty * (prices[id] ?? 0) * rate
  }
  return { ...p, cash: p.cash + dividend }
}

function applyInterest(p: Portfolio, cap: number): Portfolio {
  const interest = Math.min(Math.floor(p.cash / 2000), cap)
  return { ...p, cash: p.cash + interest }
}

// ─── News Judgment (imperfect info) ──────────────────────

function judgeNews(news: NewsCard[], accuracy: number, rng: () => number): {
  sectorSignal: Record<string, number>
  rpEarned: number
} {
  const signal: Record<string, number> = {}
  let rpEarned = 0

  for (const n of news) {
    if (n.isNoise) continue

    // 유저가 뉴스 방향을 accuracy% 확률로 맞춤
    const correct = rng() < accuracy

    if (!n.isReal) {
      // 가짜뉴스: correct면 간파하고 역투자, 틀리면 perceived 따라감
      if (correct) {
        rpEarned += 3 // 가짜뉴스 적발 보상
        for (const imp of n.perceivedImpact) {
          const sectors = imp.sector === 'all' ? [...SECTORS] : [imp.sector]
          for (const s of sectors) signal[s] = (signal[s] ?? 0) - imp.impact * 0.3
        }
      } else {
        // 가짜를 진짜로 믿고 perceived 방향 매매
        for (const imp of n.perceivedImpact) {
          const sectors = imp.sector === 'all' ? [...SECTORS] : [imp.sector]
          for (const s of sectors) signal[s] = (signal[s] ?? 0) + imp.impact * 0.5
        }
      }
    } else {
      // 진짜 뉴스: correct면 actual 방향, 틀리면 반대로
      if (correct) {
        rpEarned += 1
        for (const imp of n.actualImpact) {
          const sectors = imp.sector === 'all' ? [...SECTORS] : [imp.sector]
          for (const s of sectors) signal[s] = (signal[s] ?? 0) + imp.impact
        }
      } else {
        for (const imp of n.actualImpact) {
          const sectors = imp.sector === 'all' ? [...SECTORS] : [imp.sector]
          for (const s of sectors) signal[s] = (signal[s] ?? 0) - imp.impact * 0.3
        }
      }
    }
  }

  return { sectorSignal: signal, rpEarned }
}

// ─── Macro Scoring ───────────────────────────────────────

function scoreSectorsByMacro(macro: MacroEconomyState, prevMacro: MacroEconomyState): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const sector of SECTORS) {
    const sens = SECTOR_MACRO_SENSITIVITY[sector]
    let score = 0
    score += -(macro.interestRate - prevMacro.interestRate) * sens.interestRate * 5
    if (macro.inflation > 3.0) score += sens.inflation * 2
    score += (macro.gdpGrowth - prevMacro.gdpGrowth) * sens.gdp * 3
    score += (macro.pmi - 50) / 20 * sens.gdp
    score += ((macro.oilPrice - prevMacro.oilPrice) / prevMacro.oilPrice) * sens.oilPrice * 10
    scores[sector] = score
  }
  return scores
}

// ─── Strategy Profiles ───────────────────────────────────

interface StrategyProfile {
  name: string
  desc: string
  startingCash: number
  startingRP: number
  newsAccuracy: number
  hasStopLoss: boolean
  hasTrailingStop: boolean
  hasDCA: boolean
  hasDividend: boolean
  hasInterest: boolean
  hasFeeReduction: boolean
  hasLeverage: boolean
  useMacro: boolean
  interestCap: number
}

const PROFILES: StrategyProfile[] = [
  {
    name: 'passive', desc: '매수 후 홀드',
    startingCash: 10000, startingRP: 0, newsAccuracy: 0,
    hasStopLoss: false, hasTrailingStop: false, hasDCA: false,
    hasDividend: false, hasInterest: false, hasFeeReduction: false,
    hasLeverage: false, useMacro: false, interestCap: 10,
  },
  {
    name: 'beginner', desc: '50% 정확도 뉴스 매매',
    startingCash: 10000, startingRP: 0, newsAccuracy: 0.50,
    hasStopLoss: false, hasTrailingStop: false, hasDCA: false,
    hasDividend: false, hasInterest: false, hasFeeReduction: false,
    hasLeverage: false, useMacro: false, interestCap: 10,
  },
  {
    name: 'skilled', desc: '60% 정확도 + stop-loss',
    startingCash: 10000, startingRP: 50, newsAccuracy: 0.60,
    hasStopLoss: true, hasTrailingStop: false, hasDCA: false,
    hasDividend: false, hasInterest: false, hasFeeReduction: true,
    hasLeverage: false, useMacro: false, interestCap: 10,
  },
  {
    name: 'expert', desc: '80% 정확도 + DCA + 배당 + 거시',
    startingCash: 10000, startingRP: 80, newsAccuracy: 0.80,
    hasStopLoss: true, hasTrailingStop: true, hasDCA: true,
    hasDividend: true, hasInterest: true, hasFeeReduction: true,
    hasLeverage: false, useMacro: true, interestCap: 25,
  },
  {
    name: 'whale', desc: '레버리지 2x + 전 스킬',
    startingCash: 10000, startingRP: 120, newsAccuracy: 0.80,
    hasStopLoss: true, hasTrailingStop: true, hasDCA: true,
    hasDividend: true, hasInterest: true, hasFeeReduction: true,
    hasLeverage: true, useMacro: true, interestCap: 25,
  },
  {
    name: 'meta', desc: '메타 업그레이드 expert',
    startingCash: 13000, startingRP: 90, newsAccuracy: 0.80,
    hasStopLoss: true, hasTrailingStop: true, hasDCA: true,
    hasDividend: true, hasInterest: true, hasFeeReduction: true,
    hasLeverage: false, useMacro: true, interestCap: 25,
  },
]

// ─── Single Run ──────────────────────────────────────────

interface StrategyResult {
  finalReturn: number
  maxDrawdown: number
  rpEarned: number
  tradeCount: number
}

function simulateOneRun(config: RunConfig, runSeed: number): Record<string, StrategyResult> {
  let macro = createInitialMacro(config)
  let market = createInitialMarketState(config)

  const usedEventIds = new Set<string>()
  let pendingChainEvents: ChainEvent[] = []
  const usedWeeklyRuleIds: string[] = []

  // Per-strategy state
  const portfolios: Record<string, Portfolio> = {}
  const buyPrices: Record<string, Record<string, number>> = {} // avg buy prices per stock
  const peaks: Record<string, number> = {}
  const mdds: Record<string, number> = {}
  const trades: Record<string, number> = {}
  const totalRP: Record<string, number> = {}

  for (const p of PROFILES) {
    portfolios[p.name] = { cash: p.startingCash, shares: {}, rp: p.startingRP }
    buyPrices[p.name] = {}
    peaks[p.name] = p.startingCash
    mdds[p.name] = 0
    trades[p.name] = 0
    totalRP[p.name] = 0
  }

  const rng = seededRandom(runSeed)

  for (let turn = 1; turn <= config.maxTurns; turn++) {
    const quarterNumber = Math.ceil(turn / 13)

    const weeklyRule = rollWeeklyRule(turn, quarterNumber, usedWeeklyRuleIds)
    if (weeklyRule) usedWeeklyRuleIds.push(weeklyRule.id)

    const { news, newChainEvents } = generateTurnNews(
      config, turn, pendingChainEvents, usedEventIds, weeklyRule, runSeed,
    )
    pendingChainEvents = [
      ...pendingChainEvents.filter(e => e.triggersAtTurn > turn),
      ...newChainEvents,
    ]

    // Apply news effects to market
    for (const n of news) {
      if (n.actualImpact.length > 0) {
        market = applyNewsEffect(market, n.id, n.actualImpact, turn, n.headline)
      }
    }

    // Macro
    const prevMacro = macro
    macro = advanceMacroWeek(macro, runSeed + turn, turn)
    const macroEffects = calculateAllSectorMacroEffects(macro, prevMacro)
    const macroScores = scoreSectorsByMacro(macro, prevMacro)

    // ── Execute each strategy ──
    for (const profile of PROFILES) {
      let p = portfolios[profile.name]
      const fee = profile.hasFeeReduction ? REDUCED_FEE : BASE_FEE
      const prevShares = JSON.stringify(p.shares)

      if (profile.name === 'passive') {
        // First turn buy only
        if (turn === 1) {
          const perStock = Math.floor(p.cash / NON_ETF_STOCKS.length / (1 + fee))
          for (const stock of NON_ETF_STOCKS) {
            const shares = Math.floor(perStock / market.prices[stock.id])
            if (shares > 0) {
              p = buyStock(p, stock.id, shares, market.prices[stock.id], fee)
              buyPrices[profile.name][stock.id] = market.prices[stock.id]
            }
          }
        }
      } else {
        // News-based strategies
        if (turn === 1) {
          // Initial buy
          const perStock = Math.floor(p.cash / NON_ETF_STOCKS.length / (1 + fee))
          for (const stock of NON_ETF_STOCKS) {
            const shares = Math.floor(perStock / market.prices[stock.id])
            if (shares > 0) {
              p = buyStock(p, stock.id, shares, market.prices[stock.id], fee)
              buyPrices[profile.name][stock.id] = market.prices[stock.id]
            }
          }
        } else if (profile.newsAccuracy > 0) {
          // Judge news with accuracy
          const { sectorSignal, rpEarned } = judgeNews(news, profile.newsAccuracy, rng)
          p = { ...p, rp: p.rp + rpEarned }
          totalRP[profile.name] += rpEarned

          // Combine with macro scores if enabled
          const combinedSignal: Record<string, number> = { ...sectorSignal }
          if (profile.useMacro && turn % 4 === 0) {
            for (const sector of SECTORS) {
              combinedSignal[sector] = (combinedSignal[sector] ?? 0) + (macroScores[sector] ?? 0) * 0.5
            }
          }

          // Sell negative sectors
          for (const sector of SECTORS) {
            const sig = combinedSignal[sector] ?? 0
            if (sig < -0.10) {
              const sectorStocks = NON_ETF_STOCKS.filter(s => s.sector === sector)
              for (const stock of sectorStocks) {
                const held = p.shares[stock.id] ?? 0
                if (held > 0) p = sellStock(p, stock.id, held, market.prices[stock.id], fee)
              }
            }
          }

          // Buy positive sectors
          for (const sector of SECTORS) {
            const sig = combinedSignal[sector] ?? 0
            if (sig > 0.10 && p.cash > 100) {
              const sectorStocks = NON_ETF_STOCKS.filter(s => s.sector === sector)
              const leverage = profile.hasLeverage ? 2 : 1
              const allocPerStock = Math.floor(p.cash * 0.25 * leverage / sectorStocks.length)
              for (const stock of sectorStocks) {
                const shares = Math.floor(allocPerStock / market.prices[stock.id])
                if (shares > 0) {
                  p = buyStock(p, stock.id, shares, market.prices[stock.id], fee)
                  buyPrices[profile.name][stock.id] = market.prices[stock.id]
                }
              }
            }
          }

          // DCA: 현금이 많으면 전 종목 분할 매수
          if (profile.hasDCA && p.cash > getPortfolioValue(p, market.prices) * 0.3) {
            const dcaPerStock = Math.floor(p.cash * 0.1 / NON_ETF_STOCKS.length)
            for (const stock of NON_ETF_STOCKS) {
              const shares = Math.floor(dcaPerStock / market.prices[stock.id])
              if (shares > 0) {
                p = buyStock(p, stock.id, shares, market.prices[stock.id], fee)
                buyPrices[profile.name][stock.id] = market.prices[stock.id]
              }
            }
          }
        }

        // Auto-trade rules (after manual trades, before simulation)
        if (profile.hasStopLoss) {
          p = applyStopLoss(p, market.prices, buyPrices[profile.name], -0.10, fee)
        }
        if (profile.hasTrailingStop) {
          p = applyTrailingStop(p, market.prices, buyPrices[profile.name], 0.15, fee)
        }
      }

      if (JSON.stringify(p.shares) !== prevShares) trades[profile.name]++
      portfolios[profile.name] = p
    }

    // Danger level (passive 기준)
    const passiveVal = getPortfolioValue(portfolios['passive'], market.prices)
    const dangerLevel = calculateDangerLevel(passiveVal / 10000 - 1, quarterNumber)
    market = { ...market, dangerLevel }

    // Simulate turn
    const { state } = simulateTurn(market, config, turn, weeklyRule, macroEffects)
    market = state

    // Post-simulation: passive skills
    for (const profile of PROFILES) {
      let p = portfolios[profile.name]
      if (profile.hasDividend) p = applyDividend(p, market.prices, 0.005)
      if (profile.hasInterest) p = applyInterest(p, profile.interestCap)
      portfolios[profile.name] = p
    }

    // MDD tracking
    for (const profile of PROFILES) {
      const value = getPortfolioValue(portfolios[profile.name], market.prices)
      if (value > peaks[profile.name]) peaks[profile.name] = value
      const dd = (value - peaks[profile.name]) / peaks[profile.name]
      if (dd < mdds[profile.name]) mdds[profile.name] = dd
    }
  }

  // Results
  const results: Record<string, StrategyResult> = {}
  for (const profile of PROFILES) {
    const finalVal = getPortfolioValue(portfolios[profile.name], market.prices)
    results[profile.name] = {
      finalReturn: finalVal / profile.startingCash - 1,
      maxDrawdown: mdds[profile.name],
      rpEarned: totalRP[profile.name],
      tradeCount: trades[profile.name],
    }
  }
  return results
}

// ─── Stats ───────────────────────────────────────────────

function mean(a: number[]): number { return a.reduce((s, v) => s + v, 0) / a.length }
function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function stdev(a: number[]): number { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) }
function pct(v: number): string { return `${(v * 100) >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%` }
function f1(v: number): string { return v.toFixed(1) }

// ─── Output ──────────────────────────────────────────────

interface LevelSummary {
  level: number; name: string; target: number
  strategies: Record<string, {
    avgReturn: number; medReturn: number; stdReturn: number
    minReturn: number; maxReturn: number; targetHitRate: number
    avgMDD: number; avgRP: number; avgTrades: number
  }>
}

function aggregate(config: RunConfig, runs: Record<string, StrategyResult>[]): LevelSummary {
  const strategies: LevelSummary['strategies'] = {}
  for (const p of PROFILES) {
    const returns = runs.map(r => r[p.name].finalReturn)
    const mdds = runs.map(r => r[p.name].maxDrawdown)
    const rps = runs.map(r => r[p.name].rpEarned)
    const trs = runs.map(r => r[p.name].tradeCount)
    const hits = returns.filter(r => r >= config.targetReturn).length
    strategies[p.name] = {
      avgReturn: mean(returns), medReturn: median(returns), stdReturn: stdev(returns),
      minReturn: Math.min(...returns), maxReturn: Math.max(...returns),
      targetHitRate: hits / runs.length,
      avgMDD: mean(mdds), avgRP: mean(rps), avgTrades: mean(trs),
    }
  }
  return { level: config.runNumber, name: config.name, target: config.targetReturn, strategies }
}

function printLevel(s: LevelSummary) {
  console.log('')
  console.log(`${'═'.repeat(115)}`)
  console.log(`  Level ${s.level}: ${s.name}  (target: ${pct(s.target)})`)
  console.log(`${'═'.repeat(115)}`)
  console.log('')
  console.log('  Agent          AvgReturn  MedReturn  Std     Min       Max       HitRate  AvgMDD    RP/run  Trades')
  console.log(`  ${'─'.repeat(109)}`)
  for (const p of PROFILES) {
    const d = s.strategies[p.name]
    console.log(
      `  ${p.name.padEnd(15)}` +
      `${pct(d.avgReturn).padStart(9)}  ` +
      `${pct(d.medReturn).padStart(9)}  ` +
      `${f1(d.stdReturn * 100).padStart(5)}% ` +
      `${pct(d.minReturn).padStart(8)}  ` +
      `${pct(d.maxReturn).padStart(8)}  ` +
      `${(d.targetHitRate * 100).toFixed(0).padStart(5)}%  ` +
      `${pct(d.avgMDD).padStart(7)}  ` +
      `${f1(d.avgRP).padStart(6)}  ` +
      `${f1(d.avgTrades).padStart(5)}`
    )
  }
}

function printGrand(summaries: LevelSummary[]) {
  console.log('')
  console.log(`${'═'.repeat(120)}`)
  console.log('  GRAND SUMMARY — Average Return by Agent x Level')
  console.log(`${'═'.repeat(120)}`)
  const header = '  Agent          ' + summaries.map(s => `Lv${s.level}`.padStart(9)).join('') + '      Avg'
  console.log(header)
  console.log(`  ${'─'.repeat(115)}`)

  for (const p of PROFILES) {
    let line = `  ${p.name.padEnd(15)}`
    let total = 0
    for (const s of summaries) {
      const r = s.strategies[p.name].avgReturn; total += r
      line += pct(r).padStart(9)
    }
    line += pct(total / summaries.length).padStart(9)
    console.log(line)
  }

  console.log('')
  console.log('  Target Hit Rate')
  console.log(`  ${'─'.repeat(115)}`)
  for (const p of PROFILES) {
    let line = `  ${p.name.padEnd(15)}`
    let total = 0
    for (const s of summaries) {
      const h = s.strategies[p.name].targetHitRate; total += h
      line += `${(h * 100).toFixed(0).padStart(7)}% `
    }
    line += `${(total / summaries.length * 100).toFixed(0).padStart(7)}% `
    console.log(line)
  }

  console.log('')
  console.log('  ALPHA vs PASSIVE')
  console.log(`  ${'─'.repeat(115)}`)
  for (const p of PROFILES) {
    if (p.name === 'passive') continue
    let line = `  ${p.name.padEnd(15)}`
    let total = 0
    for (const s of summaries) {
      const alpha = s.strategies[p.name].avgReturn - s.strategies['passive'].avgReturn
      total += alpha
      line += pct(alpha).padStart(9)
    }
    line += pct(total / summaries.length).padStart(9)
    console.log(line)
  }
  console.log(`${'═'.repeat(120)}`)
}

// ─── Main ────────────────────────────────────────────────

function main() {
  const args = parseArgs()
  const configs = args.level ? RUN_CONFIGS.filter(c => c.runNumber === args.level) : RUN_CONFIGS

  if (configs.length === 0) { console.error(`Level ${args.level} not found.`); process.exit(1) }

  if (!args.json) {
    console.log('')
    console.log('  ╔══════════════════════════════════════════════════════════════════╗')
    console.log('  ║  SELL THE NEWS — Full Strategy Benchmark                        ║')
    console.log(`  ║  Runs: ${String(args.runs).padEnd(6)} Seed: ${String(args.seed).padEnd(8)} Levels: ${configs.map(c => c.runNumber).join(',')}${' '.repeat(Math.max(0, 16 - configs.map(c => c.runNumber).join(',').length))}║`)
    console.log('  ║  Agents: passive / beginner / skilled / expert / whale / meta    ║')
    console.log('  ╚══════════════════════════════════════════════════════════════════╝')
  }

  const allSummaries: LevelSummary[] = []

  for (const config of configs) {
    if (!args.json) process.stdout.write(`  Running Level ${config.runNumber} (${config.name})... `)
    const runs: Record<string, StrategyResult>[] = []
    for (let i = 0; i < args.runs; i++) {
      const runSeed = args.seed + i * 997 + config.runNumber * 10007
      runs.push(simulateOneRun(config, runSeed))
    }
    if (!args.json) console.log('done')
    allSummaries.push(aggregate(config, runs))
  }

  if (args.json) {
    console.log(JSON.stringify({ meta: { runs: args.runs, seed: args.seed }, levels: allSummaries }, null, 2))
  } else {
    for (const s of allSummaries) printLevel(s)
    if (allSummaries.length > 1) printGrand(allSummaries)
  }
}

main()
