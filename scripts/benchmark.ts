/**
 * Sell The News - Economic Engine Benchmark
 *
 * 기존 엔진 코드를 수정하지 않고, 순수 함수만 import하여
 * N회 시뮬레이션 후 밸런스 통계를 출력합니다.
 *
 * Usage:
 *   npx tsx scripts/benchmark.ts
 *   npx tsx scripts/benchmark.ts --runs 200 --level 3
 *   npx tsx scripts/benchmark.ts --json > result.json
 *   npx tsx scripts/benchmark.ts --verbose --level 1 --runs 5
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
import type { MarketState, PriceChangeBreakdown } from '../src/engine/market'
import {
  createInitialMacro,
  advanceMacroWeek,
  calculateAllSectorMacroEffects,
} from '../src/engine/macroEconomy'
import type { MacroEconomyState } from '../src/engine/macroEconomy'
import { generateTurnNews } from '../src/engine/news'
import { rollWeeklyRule } from '../src/data/weeklyRules'

// ─── CLI Args ────────────────────────────────────────────

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
    verbose: args.includes('--verbose'),
  }
}

// ─── Types ───────────────────────────────────────────────

interface MacroRanges {
  interestRate: [number, number]
  inflation: [number, number]
  gdpGrowth: [number, number]
  unemployment: [number, number]
  exchangeRate: [number, number]
  oilPrice: [number, number]
}

interface RunResult {
  seed: number
  finalReturn: number
  maxDrawdown: number
  sectorReturns: Record<string, number>
  stockReturns: Record<string, number>
  stockMaxPrice: Record<string, number>
  stockMinPrice: Record<string, number>
  macroRanges: MacroRanges
  macroFinal: { interestRate: number; inflation: number; gdpGrowth: number; unemployment: number }
  totalNews: number
  fakeNews: number
  noiseNews: number
  positiveImpacts: number
  negativeImpacts: number
  bubblePopCount: number
  flashCrashCount: number
  weeklyRulesTriggered: string[]
  maxPanicLevel: number
  maxHerdSentiment: number
  minHerdSentiment: number
  peakPortfolioReturn: number
}

interface LevelStats {
  level: number
  name: string
  targetReturn: number
  volatilityMultiplier: number
  fakeNewsRatio: number
  runsCount: number
  portfolio: {
    avg: number; med: number; std: number; min: number; max: number
    p10: number; p90: number
    targetHitRate: number
  }
  drawdown: { avg: number; worst: number }
  sectors: Record<string, { avg: number; std: number }>
  macro: {
    interestRate: { avgMin: number; avgMax: number }
    inflation: { avgMin: number; avgMax: number }
    gdpGrowth: { avgMin: number; avgMax: number }
    oilPrice: { avgMin: number; avgMax: number }
  }
  news: { avgTotal: number; avgFake: number; avgNoise: number; positiveRatio: number }
  events: { avgBubblePops: number; avgFlashCrashes: number; ruleFrequency: Record<string, number> }
  panic: { avgMax: number; worstMax: number }
  herd: { avgMax: number; avgMin: number }
}

// ─── Stat Helpers ────────────────────────────────────────

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

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

// ─── Single Run Simulation ──────────────────────────────

const NON_ETF_STOCKS = STOCKS.filter(s => !s.isETF)
const SECTORS = ['tech', 'energy', 'finance', 'consumer', 'healthcare'] as const

function simulateOneRun(config: RunConfig, runSeed: number): RunResult {
  let macro = createInitialMacro(config)
  let market = createInitialMarketState(config)

  // 초기 포트폴리오 (동일비중 전종목 합산)
  const initialPrices = { ...market.prices }
  let peakValue = 1.0
  let maxDrawdown = 0
  let peakReturn = 0

  const usedEventIds = new Set<string>()
  let pendingChainEvents: ChainEvent[] = []
  const usedWeeklyRuleIds: string[] = []

  // 통계 수집
  let totalNews = 0
  let fakeNews = 0
  let noiseNews = 0
  let positiveImpacts = 0
  let negativeImpacts = 0
  let bubblePopCount = 0
  let flashCrashCount = 0
  const weeklyRulesTriggered: string[] = []
  let maxPanicLevel = 0
  let maxHerdSentiment = 0
  let minHerdSentiment = 0

  const macroRanges: MacroRanges = {
    interestRate: [macro.interestRate, macro.interestRate],
    inflation: [macro.inflation, macro.inflation],
    gdpGrowth: [macro.gdpGrowth, macro.gdpGrowth],
    unemployment: [macro.unemployment, macro.unemployment],
    exchangeRate: [macro.exchangeRate, macro.exchangeRate],
    oilPrice: [macro.oilPrice, macro.oilPrice],
  }

  const stockMaxPrice: Record<string, number> = {}
  const stockMinPrice: Record<string, number> = {}
  for (const stock of STOCKS) {
    stockMaxPrice[stock.id] = market.prices[stock.id]
    stockMinPrice[stock.id] = market.prices[stock.id]
  }

  for (let turn = 1; turn <= config.maxTurns; turn++) {
    const quarterNumber = Math.ceil(turn / 13)

    // 주간 규칙
    const weeklyRule = rollWeeklyRule(turn, quarterNumber, usedWeeklyRuleIds)
    if (weeklyRule) {
      usedWeeklyRuleIds.push(weeklyRule.id)
      weeklyRulesTriggered.push(weeklyRule.id)
    }

    // 뉴스 생성
    const { news, newChainEvents } = generateTurnNews(
      config, turn, pendingChainEvents, usedEventIds, weeklyRule, runSeed,
    )

    // 연쇄 이벤트 업데이트
    pendingChainEvents = [
      ...pendingChainEvents.filter(e => e.triggersAtTurn > turn),
      ...newChainEvents,
    ]

    // 뉴스 통계
    totalNews += news.length
    for (const n of news) {
      if (!n.isReal) fakeNews++
      if (n.isNoise) noiseNews++
      for (const imp of n.actualImpact) {
        if (imp.impact > 0) positiveImpacts++
        else if (imp.impact < 0) negativeImpacts++
      }
    }

    // 뉴스 효과 적용 (실질 영향이 있는 뉴스만)
    for (const n of news) {
      if (n.actualImpact.length > 0) {
        market = applyNewsEffect(market, n.id, n.actualImpact, turn, n.headline)
      }
    }

    // 거시경제 진행
    const prevMacro = macro
    macro = advanceMacroWeek(macro, runSeed + turn, turn)

    // 매크로 범위 업데이트
    macroRanges.interestRate[0] = Math.min(macroRanges.interestRate[0], macro.interestRate)
    macroRanges.interestRate[1] = Math.max(macroRanges.interestRate[1], macro.interestRate)
    macroRanges.inflation[0] = Math.min(macroRanges.inflation[0], macro.inflation)
    macroRanges.inflation[1] = Math.max(macroRanges.inflation[1], macro.inflation)
    macroRanges.gdpGrowth[0] = Math.min(macroRanges.gdpGrowth[0], macro.gdpGrowth)
    macroRanges.gdpGrowth[1] = Math.max(macroRanges.gdpGrowth[1], macro.gdpGrowth)
    macroRanges.unemployment[0] = Math.min(macroRanges.unemployment[0], macro.unemployment)
    macroRanges.unemployment[1] = Math.max(macroRanges.unemployment[1], macro.unemployment)
    macroRanges.exchangeRate[0] = Math.min(macroRanges.exchangeRate[0], macro.exchangeRate)
    macroRanges.exchangeRate[1] = Math.max(macroRanges.exchangeRate[1], macro.exchangeRate)
    macroRanges.oilPrice[0] = Math.min(macroRanges.oilPrice[0], macro.oilPrice)
    macroRanges.oilPrice[1] = Math.max(macroRanges.oilPrice[1], macro.oilPrice)

    // 섹터별 거시경제 효과
    const macroEffects = calculateAllSectorMacroEffects(macro, prevMacro)

    // 포트폴리오 수익률 (동일비중)
    let currentValue = 0
    let initialValue = 0
    for (const stock of NON_ETF_STOCKS) {
      currentValue += market.prices[stock.id] / initialPrices[stock.id]
      initialValue += 1
    }
    const portfolioReturn = currentValue / initialValue - 1
    const dangerLevel = calculateDangerLevel(portfolioReturn, quarterNumber)
    market = { ...market, dangerLevel }

    // 주간 시뮬레이션
    const { state, breakdowns } = simulateTurn(market, config, turn, weeklyRule, macroEffects)
    market = state

    // 브레이크다운에서 버블/크래시 카운트
    for (const bd of breakdowns) {
      if (bd.bubblePop < -0.01) bubblePopCount++
      if (bd.flashCrash < -0.01) flashCrashCount++
    }

    // 주가 범위 업데이트
    for (const stock of STOCKS) {
      const p = market.prices[stock.id]
      if (p > stockMaxPrice[stock.id]) stockMaxPrice[stock.id] = p
      if (p < stockMinPrice[stock.id]) stockMinPrice[stock.id] = p
    }

    // 패닉/군중심리 추적
    if (market.panicLevel > maxPanicLevel) maxPanicLevel = market.panicLevel
    if (market.herdSentiment > maxHerdSentiment) maxHerdSentiment = market.herdSentiment
    if (market.herdSentiment < minHerdSentiment) minHerdSentiment = market.herdSentiment

    // MDD 계산
    let currentReturn = 0
    let totalCurrent = 0
    let totalInit = 0
    for (const stock of NON_ETF_STOCKS) {
      totalCurrent += market.prices[stock.id] / initialPrices[stock.id]
      totalInit += 1
    }
    currentReturn = totalCurrent / totalInit - 1
    const valueRatio = 1 + currentReturn
    if (valueRatio > peakValue) peakValue = valueRatio
    const drawdown = (valueRatio - peakValue) / peakValue
    if (drawdown < maxDrawdown) maxDrawdown = drawdown
    if (currentReturn > peakReturn) peakReturn = currentReturn
  }

  // 최종 수익률 계산
  let finalCurrent = 0
  let finalInit = 0
  for (const stock of NON_ETF_STOCKS) {
    finalCurrent += market.prices[stock.id] / initialPrices[stock.id]
    finalInit += 1
  }
  const finalReturn = finalCurrent / finalInit - 1

  // 섹터별 수익률
  const sectorReturns: Record<string, number> = {}
  for (const sector of SECTORS) {
    const sectorStocks = NON_ETF_STOCKS.filter(s => s.sector === sector)
    let sectorReturn = 0
    for (const stock of sectorStocks) {
      sectorReturn += market.prices[stock.id] / initialPrices[stock.id] - 1
    }
    sectorReturns[sector] = sectorReturn / sectorStocks.length
  }

  // 종목별 수익률
  const stockReturns: Record<string, number> = {}
  for (const stock of NON_ETF_STOCKS) {
    stockReturns[stock.id] = market.prices[stock.id] / initialPrices[stock.id] - 1
  }

  return {
    seed: runSeed,
    finalReturn,
    maxDrawdown,
    sectorReturns,
    stockReturns,
    stockMaxPrice,
    stockMinPrice,
    macroRanges,
    macroFinal: {
      interestRate: macro.interestRate,
      inflation: macro.inflation,
      gdpGrowth: macro.gdpGrowth,
      unemployment: macro.unemployment,
    },
    totalNews,
    fakeNews,
    noiseNews,
    positiveImpacts,
    negativeImpacts,
    bubblePopCount,
    flashCrashCount,
    weeklyRulesTriggered,
    maxPanicLevel,
    maxHerdSentiment,
    minHerdSentiment,
    peakPortfolioReturn: peakReturn,
  }
}

// ─── Aggregation ─────────────────────────────────────────

function aggregateResults(config: RunConfig, results: RunResult[]): LevelStats {
  const returns = results.map(r => r.finalReturn)
  const drawdowns = results.map(r => r.maxDrawdown)
  const targetHits = results.filter(r => r.finalReturn >= config.targetReturn).length

  // 섹터 통계
  const sectors: Record<string, { avg: number; std: number }> = {}
  for (const sector of SECTORS) {
    const vals = results.map(r => r.sectorReturns[sector])
    sectors[sector] = { avg: mean(vals), std: stdev(vals) }
  }

  // 매크로 범위 통계
  const macroStats = {
    interestRate: {
      avgMin: mean(results.map(r => r.macroRanges.interestRate[0])),
      avgMax: mean(results.map(r => r.macroRanges.interestRate[1])),
    },
    inflation: {
      avgMin: mean(results.map(r => r.macroRanges.inflation[0])),
      avgMax: mean(results.map(r => r.macroRanges.inflation[1])),
    },
    gdpGrowth: {
      avgMin: mean(results.map(r => r.macroRanges.gdpGrowth[0])),
      avgMax: mean(results.map(r => r.macroRanges.gdpGrowth[1])),
    },
    oilPrice: {
      avgMin: mean(results.map(r => r.macroRanges.oilPrice[0])),
      avgMax: mean(results.map(r => r.macroRanges.oilPrice[1])),
    },
  }

  // 뉴스 통계
  const totalImpacts = results.map(r => r.positiveImpacts + r.negativeImpacts)
  const positiveRatio = mean(results.map((r, i) =>
    totalImpacts[i] > 0 ? r.positiveImpacts / totalImpacts[i] : 0.5
  ))

  // 이벤트 통계
  const ruleFrequency: Record<string, number> = {}
  for (const r of results) {
    for (const rule of r.weeklyRulesTriggered) {
      ruleFrequency[rule] = (ruleFrequency[rule] ?? 0) + 1
    }
  }
  for (const key of Object.keys(ruleFrequency)) {
    ruleFrequency[key] /= results.length
  }

  return {
    level: config.runNumber,
    name: config.name,
    targetReturn: config.targetReturn,
    volatilityMultiplier: config.volatilityMultiplier,
    fakeNewsRatio: config.fakeNewsRatio,
    runsCount: results.length,
    portfolio: {
      avg: mean(returns),
      med: median(returns),
      std: stdev(returns),
      min: Math.min(...returns),
      max: Math.max(...returns),
      p10: percentile(returns, 10),
      p90: percentile(returns, 90),
      targetHitRate: targetHits / results.length,
    },
    drawdown: {
      avg: mean(drawdowns),
      worst: Math.min(...drawdowns),
    },
    sectors,
    macro: macroStats,
    news: {
      avgTotal: mean(results.map(r => r.totalNews)),
      avgFake: mean(results.map(r => r.fakeNews)),
      avgNoise: mean(results.map(r => r.noiseNews)),
      positiveRatio,
    },
    events: {
      avgBubblePops: mean(results.map(r => r.bubblePopCount)),
      avgFlashCrashes: mean(results.map(r => r.flashCrashCount)),
      ruleFrequency,
    },
    panic: {
      avgMax: mean(results.map(r => r.maxPanicLevel)),
      worstMax: Math.max(...results.map(r => r.maxPanicLevel)),
    },
    herd: {
      avgMax: mean(results.map(r => r.maxHerdSentiment)),
      avgMin: mean(results.map(r => r.minHerdSentiment)),
    },
  }
}

// ─── Output Formatters ──────────────────────────────────

function pct(v: number): string {
  return `${(v * 100) >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
}

function f1(v: number): string {
  return v.toFixed(1)
}

function f0(v: number): string {
  return v.toFixed(0)
}

function printLevelStats(stats: LevelStats) {
  const p = stats.portfolio
  const d = stats.drawdown
  const m = stats.macro
  const n = stats.news
  const e = stats.events

  console.log('')
  console.log(`${'═'.repeat(70)}`)
  console.log(`  Level ${stats.level}: ${stats.name}  (target: ${pct(stats.targetReturn)}, vol: x${stats.volatilityMultiplier}, fake: ${(stats.fakeNewsRatio * 100).toFixed(0)}%)`)
  console.log(`${'═'.repeat(70)}`)

  console.log(`  [포트폴리오 수익률] (${stats.runsCount}회 시뮬레이션)`)
  console.log(`    평균=${pct(p.avg)}  중앙값=${pct(p.med)}  표준편차=${f1(p.std * 100)}%`)
  console.log(`    최소=${pct(p.min)}  최대=${pct(p.max)}`)
  console.log(`    P10=${pct(p.p10)}  P90=${pct(p.p90)}`)
  console.log(`    목표 달성률: ${(p.targetHitRate * 100).toFixed(0)}%`)
  console.log('')

  console.log(`  [최대 낙폭 (MDD)]`)
  console.log(`    평균=${pct(d.avg)}  최악=${pct(d.worst)}`)
  console.log('')

  console.log(`  [섹터별 수익률]`)
  for (const sector of SECTORS) {
    const s = stats.sectors[sector]
    console.log(`    ${sector.padEnd(12)} avg=${pct(s.avg)}  std=${f1(s.std * 100)}%`)
  }
  console.log('')

  console.log(`  [거시경제 범위]`)
  console.log(`    금리       [${f1(m.interestRate.avgMin)} ~ ${f1(m.interestRate.avgMax)}]%`)
  console.log(`    인플레     [${f1(m.inflation.avgMin)} ~ ${f1(m.inflation.avgMax)}]%`)
  console.log(`    GDP성장    [${f1(m.gdpGrowth.avgMin)} ~ ${f1(m.gdpGrowth.avgMax)}]%`)
  console.log(`    유가       [${f0(m.oilPrice.avgMin)} ~ ${f0(m.oilPrice.avgMax)}]$/bbl`)
  console.log('')

  console.log(`  [뉴스 밸런스]`)
  console.log(`    평균 뉴스=${f0(n.avgTotal)}/run  가짜=${f1(n.avgFake)}/run  노이즈=${f1(n.avgNoise)}/run`)
  console.log(`    양성 비율: ${(n.positiveRatio * 100).toFixed(0)}%  음성 비율: ${((1 - n.positiveRatio) * 100).toFixed(0)}%`)
  console.log('')

  console.log(`  [이벤트]`)
  console.log(`    버블 붕괴: ${f1(e.avgBubblePops)}회/run  플래시 크래시: ${f1(e.avgFlashCrashes)}회/run`)
  if (Object.keys(e.ruleFrequency).length > 0) {
    const rules = Object.entries(e.ruleFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}(${f1(v)})`)
      .join(', ')
    console.log(`    주간규칙: ${rules}`)
  }
  console.log('')

  console.log(`  [시장 심리]`)
  console.log(`    패닉 최대: avg=${f1(stats.panic.avgMax)}  worst=${f1(stats.panic.worstMax)}`)
  console.log(`    군중심리 범위: [${f1(stats.herd.avgMin)} ~ ${f1(stats.herd.avgMax)}]`)
}

function printVerboseRun(config: RunConfig, result: RunResult) {
  console.log(`  seed=${result.seed}  return=${pct(result.finalReturn)}  MDD=${pct(result.maxDrawdown)}  bubble=${result.bubblePopCount}  crash=${result.flashCrashCount}  panic=${f1(result.maxPanicLevel)}`)
}

function printSummaryTable(allStats: LevelStats[]) {
  console.log('')
  console.log(`${'═'.repeat(100)}`)
  console.log('  SUMMARY TABLE')
  console.log(`${'═'.repeat(100)}`)
  console.log('  Level  Name          Target   AvgReturn  MedReturn  HitRate  AvgMDD    BubblePop  FlashCrash')
  console.log(`${'─'.repeat(100)}`)
  for (const s of allStats) {
    console.log(
      `  ${String(s.level).padEnd(6)} ` +
      `${s.name.padEnd(14)}` +
      `${pct(s.targetReturn).padStart(7)}  ` +
      `${pct(s.portfolio.avg).padStart(9)}  ` +
      `${pct(s.portfolio.med).padStart(9)}  ` +
      `${(s.portfolio.targetHitRate * 100).toFixed(0).padStart(5)}%  ` +
      `${pct(s.drawdown.avg).padStart(7)}  ` +
      `${f1(s.events.avgBubblePops).padStart(9)}  ` +
      `${f1(s.events.avgFlashCrashes).padStart(10)}`
    )
  }
  console.log(`${'═'.repeat(100)}`)
}

function printStockDetail(allStats: LevelStats[], allResults: Map<number, RunResult[]>) {
  console.log('')
  console.log(`${'═'.repeat(80)}`)
  console.log('  STOCK DETAIL (avg return by level)')
  console.log(`${'═'.repeat(80)}`)

  const header = '  Stock        ' + allStats.map(s => `Lv${s.level}`.padStart(8)).join('')
  console.log(header)
  console.log(`${'─'.repeat(80)}`)

  for (const stock of NON_ETF_STOCKS) {
    let line = `  ${stock.ticker.padEnd(13)}`
    for (const stats of allStats) {
      const results = allResults.get(stats.level)!
      const avg = mean(results.map(r => r.stockReturns[stock.id]))
      line += pct(avg).padStart(8)
    }
    console.log(line)
  }
  console.log(`${'═'.repeat(80)}`)
}

// ─── Main ────────────────────────────────────────────────

function main() {
  const args = parseArgs()
  const configs = args.level
    ? RUN_CONFIGS.filter(c => c.runNumber === args.level)
    : RUN_CONFIGS

  if (configs.length === 0) {
    console.error(`Error: Level ${args.level} not found. Valid: 1-8`)
    process.exit(1)
  }

  if (!args.json) {
    console.log('')
    console.log('  ╔══════════════════════════════════════════════════════════════╗')
    console.log('  ║  SELL THE NEWS - Economic Engine Benchmark                  ║')
    console.log(`  ║  Runs: ${String(args.runs).padEnd(6)} Seed: ${String(args.seed).padEnd(8)} Levels: ${configs.map(c => c.runNumber).join(',')}${' '.repeat(Math.max(0, 14 - configs.map(c => c.runNumber).join(',').length))}║`)
    console.log('  ╚══════════════════════════════════════════════════════════════╝')
  }

  const allStats: LevelStats[] = []
  const allResults = new Map<number, RunResult[]>()

  for (const config of configs) {
    if (!args.json) {
      process.stdout.write(`  Running Level ${config.runNumber} (${config.name})... `)
    }

    const results: RunResult[] = []
    for (let i = 0; i < args.runs; i++) {
      const runSeed = args.seed + i * 997 + config.runNumber * 10007
      const result = simulateOneRun(config, runSeed)
      results.push(result)

      if (args.verbose && !args.json) {
        printVerboseRun(config, result)
      }
    }

    if (!args.json) {
      console.log('done')
    }

    const stats = aggregateResults(config, results)
    allStats.push(stats)
    allResults.set(config.runNumber, results)
  }

  if (args.json) {
    const jsonOutput = {
      meta: { runs: args.runs, seed: args.seed, timestamp: new Date().toISOString() },
      levels: allStats,
      rawResults: Object.fromEntries(
        Array.from(allResults.entries()).map(([k, v]) => [k, v])
      ),
    }
    console.log(JSON.stringify(jsonOutput, null, 2))
  } else {
    for (const stats of allStats) {
      printLevelStats(stats)
    }
    if (allStats.length > 1) {
      printSummaryTable(allStats)
      printStockDetail(allStats, allResults)
    }
  }
}

main()
