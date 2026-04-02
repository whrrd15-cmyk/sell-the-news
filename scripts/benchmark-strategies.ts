/**
 * Sell The News - Strategy Agent Benchmark
 *
 * 4가지 투자 전략 에이전트로 시뮬레이션하여
 * "뉴스를 잘 읽는 유저가 실제로 이득을 보는가"를 검증합니다.
 *
 * Strategies:
 *   1. passive     — 동일비중 매수 후 홀드 (기존 벤치마크)
 *   2. news        — 뉴스 임팩트 기반 섹터 매매
 *   3. factcheck   — 가짜뉴스 필터링 + 역투자
 *   4. macro       — 거시경제 지표 기반 섹터 로테이션
 *
 * Usage:
 *   npx tsx scripts/benchmark-strategies.ts
 *   npx tsx scripts/benchmark-strategies.ts --runs 100 --level 1
 *   npx tsx scripts/benchmark-strategies.ts --json > strategies.json
 */

import { RUN_CONFIGS } from '../src/data/types'
import type { RunConfig, ChainEvent, WeeklyRule, NewsCard, SectorImpact } from '../src/data/types'
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
const INITIAL_CASH = 10000
const TRADE_FEE = 0.005 // 0.5%

// ─── Portfolio Engine ────────────────────────────────────

interface Portfolio {
  cash: number
  shares: Record<string, number> // stockId → shares held
}

function createPortfolio(): Portfolio {
  return { cash: INITIAL_CASH, shares: {} }
}

function getPortfolioValue(p: Portfolio, prices: Record<string, number>): number {
  let value = p.cash
  for (const [stockId, qty] of Object.entries(p.shares)) {
    value += qty * (prices[stockId] ?? 0)
  }
  return value
}

function buyStock(p: Portfolio, stockId: string, amount: number, price: number): Portfolio {
  if (amount <= 0 || price <= 0) return p
  const cost = amount * price
  const fee = cost * TRADE_FEE
  if (cost + fee > p.cash) {
    // 가용 자금으로 살 수 있는 만큼만
    const maxCost = p.cash / (1 + TRADE_FEE)
    const actualAmount = Math.floor(maxCost / price)
    if (actualAmount <= 0) return p
    return buyStock(p, stockId, actualAmount, price)
  }
  return {
    cash: p.cash - cost - fee,
    shares: { ...p.shares, [stockId]: (p.shares[stockId] ?? 0) + amount },
  }
}

function sellStock(p: Portfolio, stockId: string, amount: number, price: number): Portfolio {
  const held = p.shares[stockId] ?? 0
  const actual = Math.min(amount, held)
  if (actual <= 0) return p
  const revenue = actual * price
  const fee = revenue * TRADE_FEE
  const newShares = { ...p.shares }
  newShares[stockId] = held - actual
  if (newShares[stockId] <= 0) delete newShares[stockId]
  return {
    cash: p.cash + revenue - fee,
    shares: newShares,
  }
}

function sellAll(p: Portfolio, prices: Record<string, number>): Portfolio {
  let result = { ...p, shares: { ...p.shares } }
  for (const [stockId, qty] of Object.entries(result.shares)) {
    if (qty > 0) {
      result = sellStock(result, stockId, qty, prices[stockId] ?? 0)
    }
  }
  return result
}

// ─── Strategy Interface ──────────────────────────────────

interface StrategyContext {
  turn: number
  news: NewsCard[]
  macro: MacroEconomyState
  prevMacro: MacroEconomyState
  prices: Record<string, number>
  portfolio: Portfolio
  config: RunConfig
}

type StrategyFn = (ctx: StrategyContext) => Portfolio

// ─── Strategy 1: Passive (Buy & Hold) ────────────────────

const passiveStrategy: StrategyFn = (ctx) => {
  if (ctx.turn === 1) {
    // 첫 턴에 동일비중 매수
    let p = ctx.portfolio
    const perStock = Math.floor(p.cash / NON_ETF_STOCKS.length / (1 + TRADE_FEE))
    for (const stock of NON_ETF_STOCKS) {
      const shares = Math.floor(perStock / ctx.prices[stock.id])
      if (shares > 0) p = buyStock(p, stock.id, shares, ctx.prices[stock.id])
    }
    return p
  }
  return ctx.portfolio // 이후 홀드
}

// ─── Strategy 2: News Reactive ───────────────────────────

const newsReactiveStrategy: StrategyFn = (ctx) => {
  let p = ctx.portfolio

  if (ctx.turn === 1) {
    // 첫 턴 동일비중
    const perStock = Math.floor(p.cash / NON_ETF_STOCKS.length / (1 + TRADE_FEE))
    for (const stock of NON_ETF_STOCKS) {
      const shares = Math.floor(perStock / ctx.prices[stock.id])
      if (shares > 0) p = buyStock(p, stock.id, shares, ctx.prices[stock.id])
    }
    return p
  }

  // 뉴스에서 섹터별 임팩트 합산 (노이즈 제외, 실제 임팩트 기준)
  const sectorSignal: Record<string, number> = {}
  for (const n of ctx.news) {
    if (n.isNoise) continue
    for (const imp of n.actualImpact) {
      const sectors = imp.sector === 'all' ? [...SECTORS] : [imp.sector]
      for (const s of sectors) {
        sectorSignal[s] = (sectorSignal[s] ?? 0) + imp.impact
      }
    }
  }

  // 강한 음성 섹터 매도 → 강한 양성 섹터 매수
  for (const sector of SECTORS) {
    const signal = sectorSignal[sector] ?? 0
    const sectorStocks = NON_ETF_STOCKS.filter(s => s.sector === sector)

    if (signal < -0.15) {
      // 음성 신호 → 해당 섹터 전량 매도
      for (const stock of sectorStocks) {
        const held = p.shares[stock.id] ?? 0
        if (held > 0) p = sellStock(p, stock.id, held, ctx.prices[stock.id])
      }
    }
  }

  for (const sector of SECTORS) {
    const signal = sectorSignal[sector] ?? 0
    const sectorStocks = NON_ETF_STOCKS.filter(s => s.sector === sector)

    if (signal > 0.10 && p.cash > 100) {
      // 양성 신호 → 현금의 일부로 매수
      const allocPerStock = Math.floor(p.cash * 0.3 / sectorStocks.length)
      for (const stock of sectorStocks) {
        const shares = Math.floor(allocPerStock / ctx.prices[stock.id])
        if (shares > 0) p = buyStock(p, stock.id, shares, ctx.prices[stock.id])
      }
    }
  }

  return p
}

// ─── Strategy 3: Fact-Check Contrarian ───────────────────

const factCheckStrategy: StrategyFn = (ctx) => {
  let p = ctx.portfolio

  if (ctx.turn === 1) {
    const perStock = Math.floor(p.cash / NON_ETF_STOCKS.length / (1 + TRADE_FEE))
    for (const stock of NON_ETF_STOCKS) {
      const shares = Math.floor(perStock / ctx.prices[stock.id])
      if (shares > 0) p = buyStock(p, stock.id, shares, ctx.prices[stock.id])
    }
    return p
  }

  // 가짜뉴스 판별: isReal=false인 뉴스의 perceivedImpact 역투자
  // 진짜뉴스: actualImpact 순방향 투자
  const sectorSignal: Record<string, number> = {}

  for (const n of ctx.news) {
    if (n.isNoise) continue

    if (!n.isReal) {
      // 가짜뉴스 → perceived의 반대로 투자 (역투자)
      for (const imp of n.perceivedImpact) {
        const sectors = imp.sector === 'all' ? [...SECTORS] : [imp.sector]
        for (const s of sectors) {
          sectorSignal[s] = (sectorSignal[s] ?? 0) - imp.impact * 0.5 // 역방향
        }
      }
    } else {
      // 진짜뉴스 → actual 순방향
      for (const imp of n.actualImpact) {
        const sectors = imp.sector === 'all' ? [...SECTORS] : [imp.sector]
        for (const s of sectors) {
          sectorSignal[s] = (sectorSignal[s] ?? 0) + imp.impact
        }
      }
    }
  }

  // 매도 먼저 (현금 확보)
  for (const sector of SECTORS) {
    const signal = sectorSignal[sector] ?? 0
    if (signal < -0.10) {
      const sectorStocks = NON_ETF_STOCKS.filter(s => s.sector === sector)
      for (const stock of sectorStocks) {
        const held = p.shares[stock.id] ?? 0
        if (held > 0) p = sellStock(p, stock.id, held, ctx.prices[stock.id])
      }
    }
  }

  // 매수
  for (const sector of SECTORS) {
    const signal = sectorSignal[sector] ?? 0
    if (signal > 0.10 && p.cash > 100) {
      const sectorStocks = NON_ETF_STOCKS.filter(s => s.sector === sector)
      const allocPerStock = Math.floor(p.cash * 0.3 / sectorStocks.length)
      for (const stock of sectorStocks) {
        const shares = Math.floor(allocPerStock / ctx.prices[stock.id])
        if (shares > 0) p = buyStock(p, stock.id, shares, ctx.prices[stock.id])
      }
    }
  }

  return p
}

// ─── Strategy 4: Macro Rotation ──────────────────────────

const macroStrategy: StrategyFn = (ctx) => {
  let p = ctx.portfolio

  if (ctx.turn === 1) {
    const perStock = Math.floor(p.cash / NON_ETF_STOCKS.length / (1 + TRADE_FEE))
    for (const stock of NON_ETF_STOCKS) {
      const shares = Math.floor(perStock / ctx.prices[stock.id])
      if (shares > 0) p = buyStock(p, stock.id, shares, ctx.prices[stock.id])
    }
    return p
  }

  // 4주마다 리밸런싱 (너무 잦으면 수수료 비용)
  if (ctx.turn % 4 !== 0) return p

  // 거시경제 지표로 섹터 점수 계산
  const sectorScore: Record<string, number> = {}
  const macro = ctx.macro

  for (const sector of SECTORS) {
    const sens = SECTOR_MACRO_SENSITIVITY[sector]
    let score = 0

    // 금리 방향: 금리 하락 중이면 금리 민감 섹터에 유리
    const rateTrend = macro.interestRate - ctx.prevMacro.interestRate
    score += -rateTrend * sens.interestRate * 5

    // 인플레 수준: 높으면 인플레에 강한 섹터
    if (macro.inflation > 3.0) score += sens.inflation * 2
    else score -= sens.inflation

    // GDP 방향
    const gdpTrend = macro.gdpGrowth - ctx.prevMacro.gdpGrowth
    score += gdpTrend * sens.gdp * 3

    // PMI 신호: 50 이상이면 확장
    score += (macro.pmi - 50) / 20 * sens.gdp

    // 유가: 유가 상승 중이면 에너지 유리
    const oilTrend = (macro.oilPrice - ctx.prevMacro.oilPrice) / ctx.prevMacro.oilPrice
    score += oilTrend * sens.oilPrice * 10

    // 실업률 하락 → 소비재 유리
    const unempTrend = macro.unemployment - ctx.prevMacro.unemployment
    score += -unempTrend * Math.abs(sens.unemployment) * 3

    sectorScore[sector] = score
  }

  // 전량 매도 후 점수 비례 재배분
  p = sellAll(p, ctx.prices)

  // 양수 점수 섹터에만 투자 (비중 = score / totalScore)
  const positiveSectors = SECTORS.filter(s => (sectorScore[s] ?? 0) > 0)
  const totalScore = positiveSectors.reduce((sum, s) => sum + (sectorScore[s] ?? 0), 0)

  if (totalScore > 0 && p.cash > 100) {
    for (const sector of positiveSectors) {
      const weight = (sectorScore[sector] ?? 0) / totalScore
      const sectorStocks = NON_ETF_STOCKS.filter(s => s.sector === sector)
      const allocPerStock = Math.floor(p.cash * weight * 0.95 / sectorStocks.length)
      for (const stock of sectorStocks) {
        const shares = Math.floor(allocPerStock / ctx.prices[stock.id])
        if (shares > 0) p = buyStock(p, stock.id, shares, ctx.prices[stock.id])
      }
    }
  } else {
    // 양수 없으면 전 섹터 동일비중
    const perStock = Math.floor(p.cash * 0.95 / NON_ETF_STOCKS.length)
    for (const stock of NON_ETF_STOCKS) {
      const shares = Math.floor(perStock / ctx.prices[stock.id])
      if (shares > 0) p = buyStock(p, stock.id, shares, ctx.prices[stock.id])
    }
  }

  return p
}

// ─── All Strategies ──────────────────────────────────────

const STRATEGIES: { name: string; fn: StrategyFn; desc: string }[] = [
  { name: 'passive',   fn: passiveStrategy,      desc: '동일비중 매수 후 홀드' },
  { name: 'news',      fn: newsReactiveStrategy,  desc: '뉴스 임팩트 반응 매매' },
  { name: 'factcheck', fn: factCheckStrategy,     desc: '가짜뉴스 필터 + 역투자' },
  { name: 'macro',     fn: macroStrategy,          desc: '거시경제 섹터 로테이션' },
]

// ─── Simulation ──────────────────────────────────────────

interface StrategyResult {
  finalReturn: number
  maxDrawdown: number
  tradeCount: number
  finalCash: number
}

interface RunResults {
  seed: number
  strategies: Record<string, StrategyResult>
}

function simulateOneRun(config: RunConfig, runSeed: number): RunResults {
  let macro = createInitialMacro(config)
  let market = createInitialMarketState(config)

  const usedEventIds = new Set<string>()
  let pendingChainEvents: ChainEvent[] = []
  const usedWeeklyRuleIds: string[] = []

  // 전략별 포트폴리오
  const portfolios: Record<string, Portfolio> = {}
  const peaks: Record<string, number> = {}
  const mdds: Record<string, number> = {}
  const trades: Record<string, number> = {}

  for (const s of STRATEGIES) {
    portfolios[s.name] = createPortfolio()
    peaks[s.name] = INITIAL_CASH
    mdds[s.name] = 0
    trades[s.name] = 0
  }

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

    // 뉴스 효과 적용
    for (const n of news) {
      if (n.actualImpact.length > 0) {
        market = applyNewsEffect(market, n.id, n.actualImpact, turn, n.headline)
      }
    }

    // 거시경제 진행
    const prevMacro = macro
    macro = advanceMacroWeek(macro, runSeed + turn, turn)
    const macroEffects = calculateAllSectorMacroEffects(macro, prevMacro)

    // 전략 실행 (뉴스 분석 후, 가격 변동 전에 매매)
    for (const s of STRATEGIES) {
      const prevShares = JSON.stringify(portfolios[s.name].shares)
      portfolios[s.name] = s.fn({
        turn,
        news,
        macro,
        prevMacro,
        prices: market.prices,
        portfolio: portfolios[s.name],
        config,
      })
      if (JSON.stringify(portfolios[s.name].shares) !== prevShares) {
        trades[s.name]++
      }
    }

    // 포트폴리오 수익률 → dangerLevel (패시브 기준)
    const passiveValue = getPortfolioValue(portfolios['passive'], market.prices)
    const portfolioReturn = passiveValue / INITIAL_CASH - 1
    const dangerLevel = calculateDangerLevel(portfolioReturn, quarterNumber)
    market = { ...market, dangerLevel }

    // 주간 시뮬레이션 (가격 변동)
    const { state } = simulateTurn(market, config, turn, weeklyRule, macroEffects)
    market = state

    // MDD 추적
    for (const s of STRATEGIES) {
      const value = getPortfolioValue(portfolios[s.name], market.prices)
      if (value > peaks[s.name]) peaks[s.name] = value
      const dd = (value - peaks[s.name]) / peaks[s.name]
      if (dd < mdds[s.name]) mdds[s.name] = dd
    }
  }

  // 최종 결과
  const results: Record<string, StrategyResult> = {}
  for (const s of STRATEGIES) {
    const finalValue = getPortfolioValue(portfolios[s.name], market.prices)
    results[s.name] = {
      finalReturn: finalValue / INITIAL_CASH - 1,
      maxDrawdown: mdds[s.name],
      tradeCount: trades[s.name],
      finalCash: portfolios[s.name].cash,
    }
  }

  return { seed: runSeed, strategies: results }
}

// ─── Stats ───────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function stdev(arr: number[]): number {
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)
}

function pct(v: number): string {
  return `${(v * 100) >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
}

function f1(v: number): string { return v.toFixed(1) }

// ─── Output ──────────────────────────────────────────────

interface LevelSummary {
  level: number
  name: string
  target: number
  strategies: Record<string, {
    avgReturn: number
    medReturn: number
    stdReturn: number
    minReturn: number
    maxReturn: number
    targetHitRate: number
    avgMDD: number
    avgTrades: number
  }>
}

function aggregateLevel(config: RunConfig, runs: RunResults[]): LevelSummary {
  const strategies: LevelSummary['strategies'] = {}

  for (const s of STRATEGIES) {
    const returns = runs.map(r => r.strategies[s.name].finalReturn)
    const mdds = runs.map(r => r.strategies[s.name].maxDrawdown)
    const tradeCounts = runs.map(r => r.strategies[s.name].tradeCount)
    const hits = returns.filter(r => r >= config.targetReturn).length

    strategies[s.name] = {
      avgReturn: mean(returns),
      medReturn: median(returns),
      stdReturn: stdev(returns),
      minReturn: Math.min(...returns),
      maxReturn: Math.max(...returns),
      targetHitRate: hits / runs.length,
      avgMDD: mean(mdds),
      avgTrades: mean(tradeCounts),
    }
  }

  return { level: config.runNumber, name: config.name, target: config.targetReturn, strategies }
}

function printLevelComparison(summary: LevelSummary) {
  console.log('')
  console.log(`${'═'.repeat(100)}`)
  console.log(`  Level ${summary.level}: ${summary.name}  (target: ${pct(summary.target)})`)
  console.log(`${'═'.repeat(100)}`)
  console.log('')
  console.log('  Strategy       AvgReturn  MedReturn  Std     Min       Max       HitRate  AvgMDD   Trades')
  console.log(`  ${'─'.repeat(94)}`)

  for (const s of STRATEGIES) {
    const d = summary.strategies[s.name]
    console.log(
      `  ${s.name.padEnd(15)}` +
      `${pct(d.avgReturn).padStart(9)}  ` +
      `${pct(d.medReturn).padStart(9)}  ` +
      `${f1(d.stdReturn * 100).padStart(5)}% ` +
      `${pct(d.minReturn).padStart(8)}  ` +
      `${pct(d.maxReturn).padStart(8)}  ` +
      `${(d.targetHitRate * 100).toFixed(0).padStart(5)}%  ` +
      `${pct(d.avgMDD).padStart(7)}  ` +
      `${f1(d.avgTrades).padStart(5)}`
    )
  }
}

function printGrandSummary(summaries: LevelSummary[]) {
  console.log('')
  console.log(`${'═'.repeat(110)}`)
  console.log('  GRAND SUMMARY — Average Return by Strategy x Level')
  console.log(`${'═'.repeat(110)}`)
  console.log('')

  const header = '  Strategy       ' + summaries.map(s => `Lv${s.level}`.padStart(9)).join('') + '     Avg'.padStart(9)
  console.log(header)
  console.log(`  ${'─'.repeat(105)}`)

  for (const s of STRATEGIES) {
    let line = `  ${s.name.padEnd(15)}`
    let totalReturn = 0
    for (const summary of summaries) {
      const r = summary.strategies[s.name].avgReturn
      totalReturn += r
      line += pct(r).padStart(9)
    }
    line += pct(totalReturn / summaries.length).padStart(9)
    console.log(line)
  }

  console.log('')
  console.log(`  ${'─'.repeat(105)}`)

  // Target hit rate comparison
  console.log('')
  const header2 = '  Target Hit%    ' + summaries.map(s => `Lv${s.level}`.padStart(9)).join('') + '     Avg'.padStart(9)
  console.log(header2)
  console.log(`  ${'─'.repeat(105)}`)

  for (const s of STRATEGIES) {
    let line = `  ${s.name.padEnd(15)}`
    let totalHit = 0
    for (const summary of summaries) {
      const h = summary.strategies[s.name].targetHitRate
      totalHit += h
      line += `${(h * 100).toFixed(0).padStart(7)}% `
    }
    line += `${(totalHit / summaries.length * 100).toFixed(0).padStart(7)}% `
    console.log(line)
  }

  console.log(`${'═'.repeat(110)}`)

  // Alpha over passive
  console.log('')
  console.log('  ALPHA vs PASSIVE (avgReturn difference)')
  console.log(`  ${'─'.repeat(105)}`)
  const passiveName = 'passive'
  for (const s of STRATEGIES) {
    if (s.name === passiveName) continue
    let line = `  ${s.name.padEnd(15)}`
    let totalAlpha = 0
    for (const summary of summaries) {
      const alpha = summary.strategies[s.name].avgReturn - summary.strategies[passiveName].avgReturn
      totalAlpha += alpha
      line += pct(alpha).padStart(9)
    }
    line += pct(totalAlpha / summaries.length).padStart(9)
    console.log(line)
  }
  console.log(`${'═'.repeat(110)}`)
}

// ─── Main ────────────────────────────────────────────────

function main() {
  const args = parseArgs()
  const configs = args.level
    ? RUN_CONFIGS.filter(c => c.runNumber === args.level)
    : RUN_CONFIGS

  if (configs.length === 0) {
    console.error(`Error: Level ${args.level} not found.`)
    process.exit(1)
  }

  if (!args.json) {
    console.log('')
    console.log('  ╔══════════════════════════════════════════════════════════════╗')
    console.log('  ║  SELL THE NEWS - Strategy Agent Benchmark                   ║')
    console.log(`  ║  Runs: ${String(args.runs).padEnd(6)} Seed: ${String(args.seed).padEnd(8)} Levels: ${configs.map(c => c.runNumber).join(',')}${' '.repeat(Math.max(0, 14 - configs.map(c => c.runNumber).join(',').length))}║`)
    console.log('  ║  Strategies: passive / news / factcheck / macro             ║')
    console.log('  ╚══════════════════════════════════════════════════════════════╝')
  }

  const allSummaries: LevelSummary[] = []

  for (const config of configs) {
    if (!args.json) {
      process.stdout.write(`  Running Level ${config.runNumber} (${config.name})... `)
    }

    const runs: RunResults[] = []
    for (let i = 0; i < args.runs; i++) {
      const runSeed = args.seed + i * 997 + config.runNumber * 10007
      runs.push(simulateOneRun(config, runSeed))
    }

    if (!args.json) console.log('done')

    allSummaries.push(aggregateLevel(config, runs))
  }

  if (args.json) {
    console.log(JSON.stringify({ meta: { runs: args.runs, seed: args.seed }, levels: allSummaries }, null, 2))
  } else {
    for (const summary of allSummaries) {
      printLevelComparison(summary)
    }
    if (allSummaries.length > 1) {
      printGrandSummary(allSummaries)
    }
  }
}

main()
