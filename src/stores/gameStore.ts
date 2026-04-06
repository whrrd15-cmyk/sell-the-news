import { create } from 'zustand'
import type {
  Screen,
  GamePhase,
  Portfolio,
  NewsCard,
  RunConfig,
  RunStats,
  ChainEvent,
  SpecialEvent,
  ChoiceEffect,
  MetaProgress,
  BreakingNewsData,
  WeeklyRule,
  Item,
  MarketCondition,
  AutoTradeRule,
  AutoTradeResult,
  NewsJudgment,
  JudgmentType,
  TradeRecord,
} from '../data/types'
import { RUN_CONFIGS } from '../data/types'
import { createInitialMarketState, generatePreviousQuarter, simulateTurn, applyNewsEffect, calculateDangerLevel, type MarketState, type PriceChangeBreakdown, type EffectHistoryEntry } from '../engine/market'
import { createInitialPortfolio, buyStock, sellStock, awardReputation, getPortfolioValue } from '../engine/portfolio'
import { generateTurnNews } from '../engine/news'
import { rollSpecialEvent, QUIZ_EVENTS } from '../data/specialEvents'
import { rollBreakingNews } from '../data/breakingNews'
import { rollWeeklyRule } from '../data/weeklyRules'
import { loadMetaProgress, saveMetaProgress, getStartingCashBonus, getStartingRPBonus, getMetaUpgradeCount } from '../data/metaUpgrades'
import { writeSaveData, deleteSaveData, type SaveData } from '../utils/save'
import { generateShopItems } from '../data/items'
import { STOCKS } from '../data/stocks'
import { useMacroStore } from './macroStore'
import { useMarketStore } from './marketStore'
import { useTimeStore } from './timeStore'
import { formatWeekDay } from '../engine/clock'
import { detectSectorConditions } from '../engine/marketCondition'
import { processAutoTrades } from '../engine/autoTrade'

interface GameState {
  // 화면 상태
  screen: Screen
  phase: GamePhase

  // 런 정보
  runConfig: RunConfig
  turn: number
  maxTurns: number

  // 게임 데이터
  market: MarketState
  portfolio: Portfolio
  currentNews: NewsCard[]
  selectedStockId: string | null

  // 연쇄 이벤트
  pendingChainEvents: ChainEvent[]
  usedEventIds: Set<string>

  // 특수 이벤트
  currentSpecialEvent: SpecialEvent | null
  usedSpecialEventIds: Set<string>
  lastEventFeedback: string | null

  // 통계
  stats: RunStats

  // 스킬
  unlockedSkills: string[]

  // 아이템/인벤토리
  inventory: Item[]
  shopItems: Item[]
  shopSource: 'auto' | 'manual'
  shopRerollCount: number
  activeEffects: string[]
  revealedNewsIds: string[]
  revealedBestStockId: string | null
  highlightedNewsId: string | null  // market_intuition 스킬
  predictions: Record<string, 'up' | 'down'> | null
  lastTrade: { stockId: string; type: 'buy' | 'sell'; amount: number; price: number; prevPosition: { shares: number; avgBuyPrice: number } | null } | null
  lastTradeError: string | null
  tradeHistory: TradeRecord[]
  portfolioValueHistory: number[]
  totalFees: number
  realizedPnL: number
  tradesThisTurn: number
  visitedShopThisTurn: boolean

  // 퀴즈 대출 (상점용)
  usedQuizIds: Set<string>
  quizLoanUsedThisShop: boolean

  // 속보 시스템
  breakingNews: BreakingNewsData | null
  breakingNewsDismissed: boolean
  usedBreakingNewsIds: Set<string>

  // 가이드 (튜토리얼 통합)
  guideMode: 'auto' | 'manual' | null
  guideStep: number

  // 학습 피드백
  lastFeedback: { newsId: string; note: string; wasFake: boolean }[]
  lastInterestEarned: number
  resultCascadeData: {
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
  } | null

  // 메타 진행
  meta: MetaProgress

  // 액션
  startNewRun: (runNumber?: number) => void
  setScreen: (screen: Screen) => void
  setPhase: (phase: GamePhase) => void
  selectStock: (stockId: string | null) => void
  advanceToNewsPhase: () => void
  advanceToInvestmentPhase: () => void
  executeBuy: (stockId: string, amount: number) => void
  executeSell: (stockId: string, shares: number) => void
  advanceToResultPhase: () => void
  nextTurn: () => void
  addReputation: (points: number) => void
  unlockSkill: (skillId: string, cost: number) => void
  hasSkill: (skillId: string) => boolean
  resolveChoiceEvent: (choiceIndex: number) => void
  resolveQuizEvent: (answerIndex: number) => void
  dismissSpecialEvent: () => void
  buyMetaUpgrade: (upgradeId: string, cost: number) => void
  buyItem: (item: Item) => void
  useItem: (itemId: string) => void
  openShop: () => void
  attemptQuizLoan: (quizId: string, answerIndex: number, shortfall: number) => boolean
  rerollShopItems: () => void
  dismissBreakingNews: () => void
  setGuideMode: (mode: 'auto' | 'manual' | null) => void
  advanceGuide: () => void
  dismissGuide: () => void
  startInfiniteMode: () => void
  refreshMeta: () => void
  loadDebugResult: () => void
  loadDebugResultSuccess: () => void

  // 실시간 모드 주간 정산
  advanceWeek: () => void

  // 저주 아이템
  equippedCursedItems: Item[]

  // 주간 특수 규칙
  currentWeeklyRule: WeeklyRule | null
  usedWeeklyRuleIds: string[]

  // 시장 상황 감지
  marketConditions: Record<string, MarketCondition>

  // 자동 매매
  autoTradeRules: AutoTradeRule[]
  addAutoTradeRule: (rule: AutoTradeRule) => void
  removeAutoTradeRule: (id: string) => void

  // 종목 선택 (1개) / 무한 모드
  pickedStockId: string | null
  isInfiniteMode: boolean
  setPickedStock: (stockId: string) => void

  // 뉴스 참고 드로어
  isNewsDrawerOpen: boolean
  toggleNewsDrawer: () => void

  // 뉴스 분석관 (판단 시스템)
  newsJudgments: NewsJudgment[]
  currentNewsIndex: number
  allNewsJudged: boolean
  judgeNews: (newsId: string, type: JudgmentType, sliderValue: number) => void
  skipNews: (newsId: string) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  // 초기 상태
  screen: 'title',
  phase: 'news',
  runConfig: RUN_CONFIGS[0],
  turn: 1,
  maxTurns: 52,
  market: createInitialMarketState(RUN_CONFIGS[0]),
  portfolio: createInitialPortfolio(),
  currentNews: [],
  selectedStockId: null,
  pendingChainEvents: [],
  usedEventIds: new Set(),
  currentSpecialEvent: null,
  usedSpecialEventIds: new Set(),
  lastEventFeedback: null,
  stats: createInitialStats(),
  unlockedSkills: [],
  inventory: [],
  shopItems: [],
  shopSource: 'auto' as const,
  shopRerollCount: 0,
  activeEffects: [],
  revealedNewsIds: [],
  revealedBestStockId: null,
  highlightedNewsId: null,
  predictions: null,
  lastTrade: null,
  lastTradeError: null,
  tradeHistory: [],
  portfolioValueHistory: [],
  totalFees: 0,
  realizedPnL: 0,
  tradesThisTurn: 0,
  visitedShopThisTurn: false,
  usedQuizIds: new Set<string>(),
  quizLoanUsedThisShop: false,
  breakingNews: null,
  breakingNewsDismissed: false,
  usedBreakingNewsIds: new Set<string>(),
  guideMode: null,
  guideStep: 0,
  lastFeedback: [],
  lastInterestEarned: 0,
  resultCascadeData: null,
  meta: loadMetaProgress(),
  equippedCursedItems: [],
  currentWeeklyRule: null,
  usedWeeklyRuleIds: [],
  pickedStockId: null,
  isInfiniteMode: false,
  isNewsDrawerOpen: false,
  marketConditions: {},
  autoTradeRules: [],
  newsJudgments: [],
  currentNewsIndex: 0,
  allNewsJudged: false,

  addAutoTradeRule: (rule) => set(s => ({
    autoTradeRules: [...s.autoTradeRules.filter(r => r.id !== rule.id), rule]
  })),
  removeAutoTradeRule: (id) => set(s => ({
    autoTradeRules: s.autoTradeRules.filter(r => r.id !== id)
  })),
  setPickedStock: (stockId) => set({ pickedStockId: stockId, selectedStockId: stockId, screen: 'game' }),
  toggleNewsDrawer: () => set(s => ({ isNewsDrawerOpen: !s.isNewsDrawerOpen })),

  judgeNews: (newsId, type, sliderValue) => {
    const { currentNews, currentNewsIndex } = get()
    const judgment: NewsJudgment = {
      newsId,
      type,
      sliderValue,
      rpEarned: 0,
      accuracy: null,
    }
    const newJudgments = [...get().newsJudgments, judgment]
    const nextIndex = currentNewsIndex + 1
    set({
      newsJudgments: newJudgments,
      currentNewsIndex: nextIndex,
      allNewsJudged: nextIndex >= currentNews.length,
    })
  },

  skipNews: (newsId) => {
    get().judgeNews(newsId, 'skip', 0)
  },

  startNewRun: (runNumber = 1) => {
    // 무한 모드 (runNumber > 8): 동적 난이도 생성
    const config = runNumber <= RUN_CONFIGS.length
      ? RUN_CONFIGS[runNumber - 1]
      : generateInfiniteConfig(runNumber)
    const initialMarket = createInitialMarketState(config)
    // 전 분기 데이터 생성 (차트가 비어있지 않도록)
    const market = generatePreviousQuarter(initialMarket, config, 13)
    const usedEventIds = new Set<string>()

    // 메타 보너스 적용
    const meta = get().meta
    const cashBonus = getStartingCashBonus(meta)
    const rpBonus = getStartingRPBonus(meta)
    const initialPortfolio = createInitialPortfolio()
    initialPortfolio.cash += cashBonus
    initialPortfolio.reputationPoints += rpBonus

    // 첫 턴 뉴스 생성
    const { news, newChainEvents } = generateTurnNews(config, 1, [], usedEventIds, get().currentWeeklyRule)

    // 이전 세이브 삭제
    deleteSaveData()

    const isFirstEverRun = runNumber === 1 && meta.totalRuns === 0
    const isInfinite = runNumber > RUN_CONFIGS.length

    set({
      screen: isInfinite ? 'game' : isFirstEverRun ? 'onboarding' : 'stockpicker',
      pickedStockId: isInfinite ? null : null, // stockpicker에서 설정됨
      isInfiniteMode: isInfinite,
      phase: 'news',
      runConfig: config,
      turn: 1,
      maxTurns: config.maxTurns,
      market,
      portfolio: initialPortfolio,
      currentNews: news,
      selectedStockId: null,
      pendingChainEvents: newChainEvents,
      usedEventIds,
      currentSpecialEvent: null,
      usedSpecialEventIds: new Set(),
      lastEventFeedback: null,
      stats: createInitialStats(),
      inventory: [],
      shopItems: [],
      shopSource: 'auto' as const,
      activeEffects: [],
      revealedNewsIds: [],
      revealedBestStockId: null,
      predictions: null,
      lastTrade: null,
      lastTradeError: null,
      tradesThisTurn: 0,
      visitedShopThisTurn: false,
      usedQuizIds: new Set(),
      quizLoanUsedThisShop: false,
      breakingNews: null,
      breakingNewsDismissed: false,
      usedBreakingNewsIds: new Set(),
      guideMode: isFirstEverRun ? 'auto' : null,
      guideStep: 0,
      lastFeedback: [],
      equippedCursedItems: [],
      currentWeeklyRule: null,
      usedWeeklyRuleIds: [],
      marketConditions: detectSectorConditions(market),
      autoTradeRules: [],
      newsJudgments: [],
      currentNewsIndex: 0,
      allNewsJudged: false,
    })
  },

  setScreen: (screen) => set({ screen }),
  setPhase: (phase) => set({ phase }),
  selectStock: (stockId) => set({ selectedStockId: stockId }),

  advanceToNewsPhase: () => {
    const { unlockedSkills, market } = get()
    let bestStockHint: string | null = null

    // 스킬: 내부자 정보 — 모멘텀 기반 최고 종목 힌트
    if (unlockedSkills.includes('insider_info')) {
      let bestMomentum = -Infinity
      for (const hist of market.priceHistories) {
        const prices = hist.prices
        if (prices.length < 5) continue
        const momentum = (prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5]
        if (momentum > bestMomentum) { bestMomentum = momentum; bestStockHint = hist.stockId }
      }
    }

    set({ phase: 'news', revealedBestStockId: bestStockHint })
  },

  advanceToInvestmentPhase: () => {
    const { turn, runConfig, usedBreakingNewsIds, market, currentNews } = get()

    // 속보 롤링
    const bn = rollBreakingNews(turn, runConfig.runNumber, usedBreakingNewsIds)
    if (bn) {
      // 시장 효과 즉시 적용
      const updatedMarket = applyNewsEffect({ ...market }, `bn_${bn.id}`, bn.sectorImpacts)

      // 뉴스 패널에 속보 NewsCard 추가
      const breakingNewsCard: NewsCard = {
        id: `bn_${bn.id}`,
        headline: bn.headline,
        content: bn.body.slice(0, 80) + '…',
        body: bn.body,
        source: bn.source,
        category: bn.category,
        reliability: 1.0,
        isReal: true,
        actualImpact: bn.sectorImpacts,
        perceivedImpact: bn.sectorImpacts,
        educationalNote: '속보: 실시간으로 발생한 뉴스입니다. 투자 결정에 즉시 반영해야 합니다.',
      }

      const newUsedIds = new Set(usedBreakingNewsIds)
      newUsedIds.add(bn.id)

      set({
        phase: 'investment',
        breakingNews: bn,
        breakingNewsDismissed: false,
        usedBreakingNewsIds: newUsedIds,
        market: updatedMarket,
        currentNews: [breakingNewsCard, ...currentNews],
      })
    } else {
      set({ phase: 'investment' })
    }
  },

  executeBuy: (stockId, amount) => {
    const { portfolio, market, unlockedSkills, tradeHistory, totalFees } = get()
    // 실시간 가격 우선 사용 (marketStore가 있으면 live 가격, 없으면 gameStore.market fallback)
    const rtMarket = useMarketStore.getState().market
    const price = rtMarket?.prices[stockId] ?? market.prices[stockId]
    if (price == null || price <= 0) return
    const prevPosition = portfolio.positions.find(p => p.stockId === stockId)
    const feeReduction = unlockedSkills.includes('forex_hedge') ? 0.003 : 0
    const newPortfolio = buyStock(portfolio, stockId, price, amount, feeReduction)
    // 매매 실패 감지: buyStock은 잔액 부족/수량 0일 때 원본 반환
    if (newPortfolio === portfolio) {
      set({ lastTradeError: '잔액이 부족하거나 매수 수량이 없습니다.' })
      return
    }
    // 체결 수량·수수료 계산 (buyStock 내부 로직과 동일)
    const TRADE_FEE = Math.max(0.001, 0.005 - feeReduction)
    const executedShares = Math.floor(amount / (price * (1 + TRADE_FEE)))
    const feePaid = executedShares * price * TRADE_FEE
    const ticker = STOCKS.find(s => s.id === stockId)?.ticker ?? stockId
    const gameTime = useTimeStore.getState().gameTime
    const record: TradeRecord = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: formatWeekDay(gameTime),
      stockId, ticker, side: 'buy',
      quantity: executedShares, price, fee: feePaid,
    }
    set({
      portfolio: newPortfolio,
      lastTradeError: null,
      tradeHistory: [record, ...tradeHistory].slice(0, 200),
      totalFees: totalFees + feePaid,
      lastTrade: {
        stockId, type: 'buy', amount, price,
        prevPosition: prevPosition ? { shares: prevPosition.shares, avgBuyPrice: prevPosition.avgBuyPrice } : null,
      },
    })
  },

  executeSell: (stockId, shares) => {
    const { portfolio, market, currentWeeklyRule, unlockedSkills, tradeHistory, totalFees, realizedPnL } = get()
    // 주간 규칙: 매도 금지
    if (currentWeeklyRule?.effect.type === 'no_selling') return
    // 실시간 가격 우선 사용
    const rtMarket = useMarketStore.getState().market
    const price = rtMarket?.prices[stockId] ?? market.prices[stockId]
    if (price == null || price <= 0) return
    const prevPosition = portfolio.positions.find(p => p.stockId === stockId)
    const feeReduction = unlockedSkills.includes('forex_hedge') ? 0.003 : 0
    const newPortfolio = sellStock(portfolio, stockId, price, shares, feeReduction)
    // 매매 실패 감지: sellStock은 미보유/수량 0일 때 원본 반환
    if (newPortfolio === portfolio) {
      set({ lastTradeError: '보유 수량이 부족합니다.' })
      return
    }
    // 체결 수량·수수료·실현손익 계산
    const TRADE_FEE = Math.max(0.001, 0.005 - feeReduction)
    const executedShares = Math.min(shares, prevPosition?.shares ?? 0)
    const feePaid = executedShares * price * TRADE_FEE
    const avgBuyPrice = prevPosition?.avgBuyPrice ?? 0
    const pnl = executedShares * (price - avgBuyPrice) - feePaid
    const ticker = STOCKS.find(s => s.id === stockId)?.ticker ?? stockId
    const gameTime = useTimeStore.getState().gameTime
    const record: TradeRecord = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: formatWeekDay(gameTime),
      stockId, ticker, side: 'sell',
      quantity: executedShares, price, fee: feePaid,
      realizedPnL: pnl,
    }
    set({
      portfolio: newPortfolio,
      lastTradeError: null,
      tradeHistory: [record, ...tradeHistory].slice(0, 200),
      totalFees: totalFees + feePaid,
      realizedPnL: realizedPnL + pnl,
      lastTrade: {
        stockId, type: 'sell', amount: shares, price,
        prevPosition: prevPosition ? { shares: prevPosition.shares, avgBuyPrice: prevPosition.avgBuyPrice } : null,
      },
    })
  },

  advanceToResultPhase: () => {
    const { market, currentNews, stats } = get()

    // 뉴스 효과 적용
    let updatedMarket = { ...market }
    const feedback: { newsId: string; note: string; wasFake: boolean }[] = []

    const { turn: currentTurn } = get()
    for (const news of currentNews) {
      const impacts = news.isReal ? news.actualImpact : news.actualImpact
      updatedMarket = applyNewsEffect(updatedMarket, news.id, impacts, currentTurn, news.headline)

      feedback.push({
        newsId: news.id,
        note: news.educationalNote,
        wasFake: !news.isReal,
      })

      if (!news.isReal) {
        stats.fakeNewsTotal += 1
        if (news.fakeType === 'pump_and_dump') stats.pumpDumpTotal += 1
        if (news.fakeType === 'fud') stats.fudTotal += 1
      }
    }

    // 주가 시뮬레이션
    const { turn, runConfig, portfolio, currentWeeklyRule, equippedCursedItems } = get()

    // 캐스케이드: 시뮬 전 포트폴리오 가치 스냅샷
    const prevPrices = { ...updatedMarket.prices }
    const valueBefore = portfolio.cash + portfolio.positions.reduce((s, p) => s + (prevPrices[p.stockId] || 0) * p.shares, 0)

    // 위험도 계산 (성공→위험)
    const totalReturnSoFar = (valueBefore - 10000) / 10000
    const dangerLevel = calculateDangerLevel(totalReturnSoFar, runConfig.runNumber)

    // 저주 아이템: 변동성 자석 → 위험 가속
    const hasCursedVolatility = equippedCursedItems.some(i => i.cursedEffect?.downside === 'accelerate_danger')
    const adjustedDanger = hasCursedVolatility ? Math.min(1.0, dangerLevel * 1.5) : dangerLevel

    updatedMarket = { ...updatedMarket, dangerLevel: adjustedDanger }

    // 공포 방어막: 패닉 레벨 무효화
    const { activeEffects: currentActiveEffects } = get()
    if (currentActiveEffects.includes('nullify_panic')) {
      updatedMarket = { ...updatedMarket, panicLevel: 0 }
    }

    // 저주 아이템 업사이드: 변동성 자석 → 가격 변동폭 확대
    const hasPriceSwings = equippedCursedItems.some(i => i.cursedEffect?.upside === 'increase_price_swings')
    const simConfig = hasPriceSwings
      ? { ...runConfig, volatilityMultiplier: runConfig.volatilityMultiplier * 1.5 }
      : runConfig

    const macroEffects = useMacroStore.getState().sectorMacroEffects
    const simResult = simulateTurn(updatedMarket, simConfig, turn, currentWeeklyRule, macroEffects)
    const newMarket = simResult.state

    // 캐스케이드: 종목별 가격 변화
    const stockChanges = portfolio.positions
      .filter(p => p.shares > 0)
      .map(p => ({
        stockId: p.stockId,
        ticker: STOCKS.find(s => s.id === p.stockId)?.ticker ?? p.stockId,
        prevPrice: prevPrices[p.stockId] || 0,
        newPrice: newMarket.prices[p.stockId] || 0,
      }))

    // 패시브 스킬 효과 적용
    const { unlockedSkills } = get()
    let updatedPortfolio = { ...portfolio }

    let dividendEarned = 0
    if (unlockedSkills.includes('dividend')) {
      for (const pos of updatedPortfolio.positions) {
        const price = newMarket.prices[pos.stockId] || 0
        dividendEarned += price * pos.shares * 0.005
      }
      updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + dividendEarned }
    }

    // 저주 아이템 업사이드: 이자 3배
    const hasCursedGreed = equippedCursedItems.some(i => i.cursedEffect?.upside === 'triple_interest')

    // 기본 이자: $1 per $2,000 현금, max $10/턴 (interest 스킬 시 max $25)
    let interestCap = 10
    if (unlockedSkills.includes('interest')) interestCap = 25
    let interestEarned = Math.min(Math.floor(updatedPortfolio.cash / 2000), interestCap)
    if (hasCursedGreed) interestEarned *= 3 // 저주: 탐욕의 반지
    if (interestEarned > 0) {
      updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + interestEarned }
    }

    // 스킬: 복리 효과 — 이자를 최대 포지션에 자동 재투자
    if (unlockedSkills.includes('compound_interest') && interestEarned > 0 && updatedPortfolio.positions.length > 0) {
      const largestPos = updatedPortfolio.positions.reduce((max, p) => {
        const maxVal = max.shares * (newMarket.prices[max.stockId] || 0)
        const pVal = p.shares * (newMarket.prices[p.stockId] || 0)
        return pVal > maxVal ? p : max
      })
      const price = newMarket.prices[largestPos.stockId] || 0
      if (price > 0) {
        const extraShares = interestEarned / price
        updatedPortfolio = {
          ...updatedPortfolio,
          cash: updatedPortfolio.cash - interestEarned,
          positions: updatedPortfolio.positions.map(p =>
            p.stockId === largestPos.stockId
              ? {
                  ...p,
                  shares: p.shares + extraShares,
                  avgBuyPrice: ((p.avgBuyPrice * p.shares) + (price * extraShares)) / (p.shares + extraShares),
                }
              : p
          ),
        }
      }
    }

    // 손실 보험 효과 적용
    const { activeEffects } = get()
    let insuranceCompensation = 0
    if (activeEffects.includes('loss_insurance_50')) {
      for (const pos of updatedPortfolio.positions) {
        const prevPrice = market.prices[pos.stockId] || 0
        const newPrice = newMarket.prices[pos.stockId] || 0
        if (newPrice < prevPrice) {
          const lossPerShare = prevPrice - newPrice
          insuranceCompensation += lossPerShare * pos.shares * 0.5
        }
      }
      if (insuranceCompensation > 0) {
        updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + insuranceCompensation }
      }
    }

    // VIX 헤지: 최대 손실 -5% 캡
    if (activeEffects.includes('volatility_cap')) {
      const valueAfterVol = updatedPortfolio.cash + updatedPortfolio.positions.reduce(
        (s, p) => s + (newMarket.prices[p.stockId] || 0) * p.shares, 0
      )
      const maxLoss = valueBefore * 0.05
      if (valueBefore - valueAfterVol > maxLoss) {
        const compensation = (valueBefore - valueAfterVol) - maxLoss
        updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + compensation }
      }
    }

    // 저주 아이템 다운사이드 처리
    for (const cursed of equippedCursedItems) {
      switch (cursed.cursedEffect?.downside) {
        case 'drain_rp_per_turn': {
          const drainAmount = cursed.cursedEffect?.drainAmount ?? 1
          updatedPortfolio = { ...updatedPortfolio, reputationPoints: Math.max(0, updatedPortfolio.reputationPoints - drainAmount) }
          break
        }
        case 'cash_decay_1_percent':
          updatedPortfolio = { ...updatedPortfolio, cash: Math.floor(updatedPortfolio.cash * 0.99) }
          break
        case 'amplify_losses_1.5x':
          // 손실 증폭: 이번 턴 손실분의 50%를 추가 차감
          for (const pos of updatedPortfolio.positions) {
            const prev = prevPrices[pos.stockId] || 0
            const curr = newMarket.prices[pos.stockId] || 0
            if (curr < prev) {
              const extraLoss = (prev - curr) * pos.shares * 0.5
              updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash - extraLoss }
            }
          }
          break
      }
    }

    // 저주 아이템 업사이드: 수익 증폭
    if (equippedCursedItems.some(i => i.cursedEffect?.upside === 'amplify_gains_1.8x' || i.cursedEffect?.upside === 'amplify_gains_1.5x')) {
      const gainMult = equippedCursedItems.some(i => i.cursedEffect?.upside === 'amplify_gains_1.8x') ? 0.8 : 0.5
      for (const pos of updatedPortfolio.positions) {
        const prev = prevPrices[pos.stockId] || 0
        const curr = newMarket.prices[pos.stockId] || 0
        if (curr > prev) {
          const extraGain = (curr - prev) * pos.shares * gainMult
          updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + extraGain }
        }
      }
    }

    // 스킬: 포트폴리오 헤지 — 3개 이상 섹터 보유 시 손실 20% 감소
    if (unlockedSkills.includes('portfolio_hedge')) {
      const heldSectors = new Set(
        updatedPortfolio.positions.map(p => STOCKS.find(s => s.id === p.stockId)?.sector).filter(Boolean)
      )
      if (heldSectors.size >= 3) {
        const valueAfterHedge = updatedPortfolio.cash + updatedPortfolio.positions.reduce(
          (s, p) => s + (newMarket.prices[p.stockId] || 0) * p.shares, 0
        )
        const turnLoss = valueBefore - valueAfterHedge
        if (turnLoss > 0) {
          updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + turnLoss * 0.2 }
        }
      }
    }

    // 자동 매매 실행
    const { autoTradeRules } = get()
    let autoTradeResult: AutoTradeResult = { executedTrades: [], educationalNotes: [] }
    let newAutoTradeRules = autoTradeRules
    if (autoTradeRules.length > 0) {
      const atResult = processAutoTrades(autoTradeRules, updatedPortfolio, newMarket.prices)
      autoTradeResult = atResult.result
      newAutoTradeRules = atResult.updatedRules
      updatedPortfolio = atResult.updatedPortfolio
    }

    // 평판 포인트 계산 (기본 2)
    let rpEarned = 2
    for (const pos of updatedPortfolio.positions) {
      const prevPrice = market.prices[pos.stockId] || 0
      const newPrice = newMarket.prices[pos.stockId] || 0
      if (newPrice > prevPrice) rpEarned += 1
    }
    const hasFakeNews = currentNews.some((n) => !n.isReal)
    if (!hasFakeNews) rpEarned += 1

    // 뉴스 판단 정확도 RP
    const { newsJudgments } = get()
    for (const judgment of newsJudgments) {
      const news = currentNews.find(n => n.id === judgment.newsId)
      if (!news || judgment.type === 'skip') {
        judgment.accuracy = 'skipped'
        continue
      }

      if (judgment.type === 'fake') {
        if (!news.isReal) {
          rpEarned += 3; judgment.rpEarned = 3; judgment.accuracy = 'fake_correct'
          stats.fakeNewsDetected += 1
        } else {
          judgment.rpEarned = 0; judgment.accuracy = 'wrong'
        }
        continue
      }

      // 호재/악재 판단: 가장 지배적인 영향과 비교
      const dominantImpact = news.actualImpact.length > 0
        ? news.actualImpact.reduce((max, si) => Math.abs(si.impact) > Math.abs(max.impact) ? si : max)
        : null
      const actualValue = dominantImpact?.impact ?? 0
      const playerValue = judgment.sliderValue

      const sameDirection = (playerValue > 0 && actualValue > 0) || (playerValue < 0 && actualValue < 0)
      const strengthAccurate = Math.abs(playerValue - actualValue) <= 0.2

      if (sameDirection && strengthAccurate) {
        rpEarned += 2; judgment.rpEarned = 2; judgment.accuracy = 'strength'
        stats.correctPredictions += 1
      } else if (sameDirection) {
        rpEarned += 1; judgment.rpEarned = 1; judgment.accuracy = 'direction'
        stats.correctPredictions += 1
      } else {
        judgment.rpEarned = 0; judgment.accuracy = 'wrong'
      }
    }

    // RP 부스터 효과
    const rpDoubled = activeEffects.includes('double_rp_next')
    if (rpDoubled) {
      rpEarned *= 2
    }

    updatedPortfolio = awardReputation(updatedPortfolio, rpEarned)

    // 스킬: 시장 감각 — 가장 큰 영향 뉴스 하이라이트
    let highlightedNewsId: string | null = null
    if (unlockedSkills.includes('market_intuition')) {
      let maxImpact = 0
      for (const n of currentNews) {
        if (!n.isReal) continue
        const totalImpact = (n.actualImpact || []).reduce((s, i) => s + Math.abs(i.impact), 0)
        if (totalImpact > maxImpact) { maxImpact = totalImpact; highlightedNewsId = n.id }
      }
    }

    // 캐스케이드: 시뮬 후 포트폴리오 가치
    const valueAfter = updatedPortfolio.cash + updatedPortfolio.positions.reduce((s, p) => s + (newMarket.prices[p.stockId] || 0) * p.shares, 0)

    set({
      phase: 'result',
      highlightedNewsId,
      market: newMarket,
      portfolio: updatedPortfolio,
      autoTradeRules: newAutoTradeRules,
      lastFeedback: feedback,
      lastInterestEarned: interestEarned,
      resultCascadeData: {
        portfolioValueBefore: valueBefore,
        portfolioValueAfter: valueAfter,
        stockChanges,
        rpEarned,
        interestEarned,
        dividendEarned: Math.floor(dividendEarned),
        insuranceCompensation: Math.floor(insuranceCompensation),
        rpDoubled,
        breakdowns: simResult.breakdowns,
        effectHistory: newMarket.effectHistory,
        autoTradeResult: autoTradeResult.executedTrades.length > 0 ? autoTradeResult : undefined,
      },
      stats: { ...stats },
    })
  },

  nextTurn: () => {
    const { turn, maxTurns, runConfig, pendingChainEvents, usedEventIds, usedSpecialEventIds, usedWeeklyRuleIds } = get()
    const { equippedCursedItems } = get()
    const newTurn = turn + 1

    // 저주 아이템: 뉴스 수정자
    const hasExtraNews = equippedCursedItems.some(i => i.cursedEffect?.upside === 'extra_news')
    const hasFomoBellDown = equippedCursedItems.some(i => i.cursedEffect?.downside === 'increase_fake_news_10')
    const cursedNewsModifiers = (hasExtraNews || hasFomoBellDown)
      ? { extraNews: hasExtraNews, extraFakeRatio: hasFomoBellDown ? 0.10 : 0 }
      : undefined

    if (newTurn > maxTurns) {
      // 분기 완료 — 메타 진행 업데이트
      const { portfolio, market } = get()
      const totalReturn = (portfolio.cash + portfolio.positions.reduce((sum, pos) => {
        return sum + (market.prices[pos.stockId] || 0) * pos.shares
      }, 0) - 10000) / 10000
      const isSuccess = totalReturn >= runConfig.targetReturn

      const meta = { ...get().meta }
      meta.totalRuns += 1
      if (isSuccess) {
        meta.highestRunCleared = Math.max(meta.highestRunCleared, runConfig.runNumber)
        meta.metaPoints += runConfig.runNumber
      }
      meta.metaPoints += 1
      saveMetaProgress(meta)
      deleteSaveData()

      set({
        screen: 'result',
        meta,
        stats: {
          ...get().stats,
          totalTurns: turn,
        },
      })
      return
    }

    // 상점 턴 체크
    // v3: Run 1~2는 첫 상점 3주차 (이후 13주마다), Run 3+는 기존 13주마다
    // 벤치마크 모드에서는 4주마다
    const isBenchmark = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('benchmark')
    const isEarlyRun = runConfig.runNumber <= 2
    const isFirstShop = isEarlyRun && newTurn === 3 && !get().visitedShopThisTurn
    const shopInterval = isBenchmark ? 4 : 13
    if (isFirstShop || newTurn % shopInterval === 0) {
      const shopItems = generateShopItems(runConfig.runNumber, 3)
      set({ screen: 'shop', turn: newTurn, shopItems, shopSource: 'auto' as const, shopRerollCount: 0, quizLoanUsedThisShop: false })
      return
    }

    // 특수 이벤트 체크
    const specialEvent = rollSpecialEvent(newTurn, runConfig.runNumber, usedSpecialEventIds)
    if (specialEvent) {
      // 블랙스완은 즉시 시장에 영향
      if (specialEvent.type === 'black_swan' && specialEvent.sectorImpacts) {
        const { market } = get()
        let updatedMarket = { ...market }
        updatedMarket = applyNewsEffect(updatedMarket, specialEvent.id, specialEvent.sectorImpacts)
        set({ market: updatedMarket })
      }

      usedSpecialEventIds.add(specialEvent.id)

      // 뉴스도 함께 생성
      const { news, newChainEvents } = generateTurnNews(
        runConfig,
        newTurn,
        pendingChainEvents,
        usedEventIds,
        get().currentWeeklyRule,
        undefined,
        cursedNewsModifiers,
      )
      const remainingChains = pendingChainEvents.filter(
        (c) => c.triggersAtTurn > newTurn,
      )

      set({
        turn: newTurn,
        phase: 'event',
        currentNews: news,
        currentSpecialEvent: specialEvent,
        usedSpecialEventIds: new Set(usedSpecialEventIds),
        lastEventFeedback: null,
        pendingChainEvents: [...remainingChains, ...newChainEvents],
        lastFeedback: [],
        newsJudgments: [],
        currentNewsIndex: 0,
        allNewsJudged: false,
      })
      return
    }

    // 주간 특수 규칙 롤
    const weeklyRule = rollWeeklyRule(newTurn, runConfig.runNumber, usedWeeklyRuleIds)
    const newUsedWeeklyRuleIds = weeklyRule
      ? [...usedWeeklyRuleIds, weeklyRule.id]
      : usedWeeklyRuleIds

    // 다음 턴 뉴스 생성
    const { news, newChainEvents } = generateTurnNews(
      runConfig,
      newTurn,
      pendingChainEvents,
      usedEventIds,
      weeklyRule,
      undefined,
      cursedNewsModifiers,
    )

    const remainingChains = pendingChainEvents.filter(
      (c) => c.triggersAtTurn > newTurn,
    )

    // 저주 아이템 업사이드: 매 턴 최고 종목 공개
    let bestStockId: string | null = null
    if (equippedCursedItems.some(i => i.cursedEffect?.upside === 'reveal_best_stock_every_turn')) {
      const { market } = get()
      let bestReturn = -Infinity
      for (const h of market.priceHistories) {
        if (h.prices.length >= 2) {
          const ret = (h.prices[h.prices.length - 1] - h.prices[h.prices.length - 2]) / h.prices[h.prices.length - 2]
          if (ret > bestReturn) { bestReturn = ret; bestStockId = h.stockId }
        }
      }
    }

    // 저주 아이템 업사이드: 모든 뉴스 진위 공개
    let revealedIds: string[] = []
    if (equippedCursedItems.some(i => i.cursedEffect?.upside === 'reveal_all_news_truth')) {
      revealedIds = news.map(n => n.id)
    }

    // 프라임 브로커 채널: activeEffect 있으면 뉴스 전체 공개
    const { activeEffects: prevEffects } = get()
    if (prevEffects.includes('reveal_all_actual_impacts')) {
      revealedIds = news.map(n => n.id)
    }

    // 시장 상황 갱신
    let updatedConditions = detectSectorConditions(get().market)

    // 전략 주간: 섹터별 강제 분화 (2 상승, 1 횡보, 2 하락)
    if (weeklyRule?.effect.type === 'strategy_week') {
      const sectors = ['tech', 'energy', 'finance', 'consumer', 'healthcare']
      const shuffled = [...sectors].sort(() => Math.random() - 0.5)
      updatedConditions = {
        [shuffled[0]]: 'bull_trend',
        [shuffled[1]]: 'bull_trend',
        [shuffled[2]]: 'range_bound',
        [shuffled[3]]: 'bear_market',
        [shuffled[4]]: 'bear_market',
      }
    }

    const currentValue = getPortfolioValue(get().portfolio, get().market.prices)

    set({
      turn: newTurn,
      phase: 'news',
      currentNews: news,
      pendingChainEvents: [...remainingChains, ...newChainEvents],
      lastFeedback: [],
      lastEventFeedback: null,
      activeEffects: [],
      revealedNewsIds: revealedIds,
      revealedBestStockId: bestStockId,
      highlightedNewsId: null,
      predictions: null,
      lastTrade: null,
      lastTradeError: null,
      tradesThisTurn: 0,
      visitedShopThisTurn: false,
      currentWeeklyRule: weeklyRule,
      usedWeeklyRuleIds: newUsedWeeklyRuleIds,
      marketConditions: updatedConditions,
      newsJudgments: [],
      currentNewsIndex: 0,
      allNewsJudged: false,
      portfolioValueHistory: [...get().portfolioValueHistory, currentValue],
    })

    // 자동 저장
    autoSave(get())
  },

  resolveChoiceEvent: (choiceIndex) => {
    const { currentSpecialEvent, portfolio, market, stats } = get()
    if (!currentSpecialEvent || currentSpecialEvent.type !== 'choice') return
    if (!currentSpecialEvent.choices) return

    const choice = currentSpecialEvent.choices[choiceIndex]
    if (!choice) return

    const effect = choice.effect
    let updatedPortfolio = { ...portfolio }
    let updatedMarket = { ...market }

    updatedPortfolio = applyChoiceEffect(updatedPortfolio, effect)

    if (effect.sectorImpacts) {
      updatedMarket = applyNewsEffect(updatedMarket, currentSpecialEvent.id, effect.sectorImpacts)
    }

    set({
      portfolio: updatedPortfolio,
      market: updatedMarket,
      lastEventFeedback: effect.educationalNote,
      stats: { ...stats, learnedConcepts: [...stats.learnedConcepts, effect.educationalNote] },
    })
  },

  resolveQuizEvent: (answerIndex) => {
    const { currentSpecialEvent, portfolio, stats } = get()
    if (!currentSpecialEvent || currentSpecialEvent.type !== 'quiz') return

    const isCorrect = answerIndex === currentSpecialEvent.correctIndex
    let updatedPortfolio = { ...portfolio }

    if (isCorrect && currentSpecialEvent.rewardRP) {
      updatedPortfolio = awardReputation(updatedPortfolio, currentSpecialEvent.rewardRP)
    }

    const feedback = isCorrect
      ? `정답입니다! +${currentSpecialEvent.rewardRP} RP\n\n${currentSpecialEvent.explanation}`
      : `오답입니다. 정답은 "${currentSpecialEvent.options?.[currentSpecialEvent.correctIndex ?? 0]}"입니다.\n\n${currentSpecialEvent.explanation}`

    set({
      portfolio: updatedPortfolio,
      lastEventFeedback: feedback,
      stats: {
        ...stats,
        correctPredictions: stats.correctPredictions + (isCorrect ? 1 : 0),
        learnedConcepts: [...stats.learnedConcepts, currentSpecialEvent.explanation || ''],
      },
    })
  },

  dismissSpecialEvent: () => {
    set({
      currentSpecialEvent: null,
      lastEventFeedback: null,
      phase: 'news',
    })
  },

  addReputation: (points) => {
    const { portfolio } = get()
    set({ portfolio: awardReputation(portfolio, points) })
  },

  unlockSkill: (skillId, cost) => {
    const { portfolio, unlockedSkills, meta } = get()
    if (unlockedSkills.includes(skillId)) return

    // 메타 업그레이드: 스킬 할인
    const discountLevel = getMetaUpgradeCount(meta, 'skill_discount_1')
    const discountedCost = Math.floor(cost * (1 - 0.15 * discountLevel))

    if (portfolio.reputationPoints < discountedCost) return
    set({
      portfolio: awardReputation(portfolio, -discountedCost),
      unlockedSkills: [...unlockedSkills, skillId],
    })
  },

  hasSkill: (skillId) => {
    return get().unlockedSkills.includes(skillId)
  },

  buyMetaUpgrade: (upgradeId, cost) => {
    const meta = { ...get().meta }
    if (meta.metaPoints < cost) return
    meta.metaPoints -= cost
    meta.unlockedMetaUpgrades = [...meta.unlockedMetaUpgrades, upgradeId]
    saveMetaProgress(meta)
    set({ meta })
  },

  buyItem: (item) => {
    const { portfolio, inventory, equippedCursedItems } = get()
    // 저주 아이템: 상점 가격 2배
    const priceMultiplier = equippedCursedItems.some(i => i.cursedEffect?.downside === 'double_shop_prices') ? 2 : 1
    const actualCost = item.cost * priceMultiplier
    if (portfolio.reputationPoints < actualCost) return

    if (item.isCursed) {
      // 저주 아이템은 장착 (소비하지 않음)
      set({
        portfolio: awardReputation(portfolio, -actualCost),
        equippedCursedItems: [...equippedCursedItems, item],
      })
    } else {
      set({
        portfolio: awardReputation(portfolio, -actualCost),
        inventory: [...inventory, item],
      })
    }
  },

  useItem: (itemId) => {
    const { inventory, portfolio, currentNews, activeEffects, market, runConfig, turn, pendingChainEvents, usedEventIds, lastTrade } = get()
    const idx = inventory.findIndex((i) => i.id === itemId)
    if (idx === -1) return

    const item = inventory[idx]
    const newInventory = [...inventory]
    newInventory.splice(idx, 1)

    let updatedPortfolio = { ...portfolio }
    const updates: Partial<GameState> = { inventory: newInventory }

    switch (item.effect) {
      case 'cash_boost_percent':
      case 'cash_500': {
        const portfolioValue = updatedPortfolio.cash + updatedPortfolio.positions.reduce((sum, p) => {
          return sum + (market.prices[p.stockId] || 0) * p.shares
        }, 0)
        const boost = item.effect === 'cash_boost_percent' ? Math.floor(portfolioValue * 0.05) : 500
        updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + boost }
        break
      }

      case 'reveal_one_news': {
        // Reveal a random unrevealed news's real/fake status
        const unrevealed = currentNews.filter(n => !get().revealedNewsIds.includes(n.id))
        if (unrevealed.length > 0) {
          const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)]
          updates.revealedNewsIds = [...get().revealedNewsIds, pick.id]
        }
        break
      }

      case 'reroll_news': {
        // Regenerate this turn's news
        const { news, newChainEvents } = generateTurnNews(runConfig, turn, pendingChainEvents, usedEventIds, get().currentWeeklyRule)
        const remainingChains = pendingChainEvents.filter(c => c.triggersAtTurn > turn)
        updates.currentNews = news
        updates.pendingChainEvents = [...remainingChains, ...newChainEvents]
        updates.revealedNewsIds = []
        break
      }

      case 'loss_insurance_50':
        updates.activeEffects = [...activeEffects, 'loss_insurance_50']
        break

      case 'double_rp_next':
        updates.activeEffects = [...activeEffects, 'double_rp_next']
        break

      case 'reveal_all_trends':
        updates.activeEffects = [...activeEffects, 'reveal_all_trends']
        break

      case 'reveal_best_stock': {
        // Find the stock that will gain the most next turn
        // We simulate to peek — use current market trends to estimate
        let bestStockId = ''
        let bestGain = -Infinity
        for (const hist of market.priceHistories) {
          const prices = hist.prices
          if (prices.length < 2) continue
          const recent = prices[prices.length - 1]
          const prev = prices[prices.length - 2]
          const trend = (recent - prev) / prev
          if (trend > bestGain) {
            bestGain = trend
            bestStockId = hist.stockId
          }
        }
        updates.revealedBestStockId = bestStockId || null
        break
      }

      case 'undo_last_trade': {
        if (lastTrade) {
          if (lastTrade.type === 'buy') {
            // Undo buy: remove shares and restore cash
            const pos = updatedPortfolio.positions.find(p => p.stockId === lastTrade.stockId)
            if (pos) {
              const cost = lastTrade.amount
              updatedPortfolio = {
                ...updatedPortfolio,
                cash: updatedPortfolio.cash + cost,
                positions: lastTrade.prevPosition
                  ? updatedPortfolio.positions.map(p =>
                      p.stockId === lastTrade.stockId
                        ? { ...p, shares: lastTrade.prevPosition!.shares, avgBuyPrice: lastTrade.prevPosition!.avgBuyPrice }
                        : p
                    )
                  : updatedPortfolio.positions.filter(p => p.stockId !== lastTrade.stockId),
              }
            }
          } else {
            // Undo sell: restore shares and remove cash
            const cashReturn = lastTrade.amount * lastTrade.price
            const existingPos = updatedPortfolio.positions.find(p => p.stockId === lastTrade.stockId)
            updatedPortfolio = {
              ...updatedPortfolio,
              cash: updatedPortfolio.cash - cashReturn,
              positions: lastTrade.prevPosition
                ? (existingPos
                    ? updatedPortfolio.positions.map(p =>
                        p.stockId === lastTrade.stockId
                          ? { ...p, shares: lastTrade.prevPosition!.shares, avgBuyPrice: lastTrade.prevPosition!.avgBuyPrice }
                          : p
                      )
                    : [...updatedPortfolio.positions, { stockId: lastTrade.stockId, shares: lastTrade.prevPosition.shares, avgBuyPrice: lastTrade.prevPosition.avgBuyPrice }]
                  )
                : updatedPortfolio.positions,
            }
          }
          updates.lastTrade = null
        }
        break
      }

      case 'auto_dca_3_turns': {
        // 선택된 종목에 3턴 자동 매수 룰 등록
        const { selectedStockId, autoTradeRules: currentAutoRules } = get()
        if (selectedStockId) {
          const newRule: AutoTradeRule = {
            id: `auto_dca_${Date.now()}`,
            type: 'dca',
            stockId: selectedStockId,
            params: { dcaAmount: 500, remainingTurns: 3 },
          }
          updates.autoTradeRules = [...currentAutoRules, newRule]
        }
        break
      }

      case 'reveal_market_condition':
        updates.activeEffects = [...activeEffects, 'reveal_market_condition']
        break

      case 'nullify_panic':
        updates.activeEffects = [...activeEffects, 'nullify_panic']
        break

      case 'predict_5_turns':
      case 'predict_3_turns': {
        // Generate predictions based on market momentum
        const lookback = item.effect === 'predict_5_turns' ? 5 : 3
        const preds: Record<string, 'up' | 'down'> = {}
        for (const hist of market.priceHistories) {
          const prices = hist.prices
          if (prices.length < lookback) continue
          const recent = prices.slice(-lookback)
          const avgChange = (recent[recent.length - 1] - recent[0]) / recent[0]
          preds[hist.stockId] = avgChange >= 0 ? 'up' : 'down'
        }
        updates.predictions = preds
        break
      }

      case 'emergency_fund':
        if (updatedPortfolio.cash < 500) {
          updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + 2000 }
        }
        break

      case 'sector_trend_hint':
        updates.activeEffects = [...activeEffects, 'sector_trend_hint']
        break

      case 'volatility_cap':
        updates.activeEffects = [...activeEffects, 'volatility_cap']
        break

      case 'reveal_all_actual_impacts':
        updates.revealedNewsIds = currentNews.map(n => n.id)
        updates.activeEffects = [...activeEffects, 'reveal_all_actual_impacts']
        break

      default:
        // Unknown effect — restore item to prevent silent consumption
        newInventory.splice(idx, 0, item)
        console.warn(`Unknown item effect: ${item.effect}`)
        break
    }

    updates.portfolio = updatedPortfolio
    set(updates as any)
  },

  openShop: () => {
    const { visitedShopThisTurn, runConfig } = get()
    if (visitedShopThisTurn) return
    const shopItems = generateShopItems(runConfig.runNumber, 3)
    set({
      screen: 'shop',
      shopItems,
      shopSource: 'manual',
      visitedShopThisTurn: true,
      shopRerollCount: 0,
    })
  },

  rerollShopItems: () => {
    const { portfolio, shopRerollCount, runConfig } = get()
    const cost = 2 + shopRerollCount
    if (portfolio.reputationPoints < cost) return
    const newItems = generateShopItems(runConfig.runNumber, 3)
    set({
      portfolio: { ...portfolio, reputationPoints: portfolio.reputationPoints - cost },
      shopItems: newItems,
      shopRerollCount: shopRerollCount + 1,
    })
  },

  attemptQuizLoan: (quizId, answerIndex, shortfall) => {
    const { usedQuizIds, portfolio, quizLoanUsedThisShop } = get()

    // 상점 방문당 퀴즈 론 1회 제한
    if (quizLoanUsedThisShop) return false

    const newUsedIds = new Set(usedQuizIds)
    newUsedIds.add(quizId)

    const quiz = QUIZ_EVENTS.find((q) => q.id === quizId)
    if (!quiz) { set({ usedQuizIds: newUsedIds }); return false }

    // 최대 보전: 아이템 비용의 50%까지
    const cappedShortfall = Math.min(shortfall, Math.ceil(shortfall * 2 * 0.5))

    const isCorrect = answerIndex === quiz.correctIndex
    if (isCorrect) {
      set({
        usedQuizIds: newUsedIds,
        quizLoanUsedThisShop: true,
        portfolio: awardReputation(portfolio, cappedShortfall),
      })
      return true
    } else {
      // 오답 시 -2 RP 페널티
      set({
        usedQuizIds: newUsedIds,
        quizLoanUsedThisShop: true,
        portfolio: { ...portfolio, reputationPoints: Math.max(0, portfolio.reputationPoints - 2) },
      })
      return false
    }
  },

  dismissBreakingNews: () => {
    set({ breakingNewsDismissed: true })
  },

  setGuideMode: (mode) => set({ guideMode: mode, guideStep: 0 }),
  advanceGuide: () => set((s) => ({ guideStep: s.guideStep + 1 })),
  dismissGuide: () => set({ guideMode: null, guideStep: 0 }),

  startInfiniteMode: () => {
    // 무한 모드: runNumber 9부터 시작, 점진적으로 어려워짐
    get().startNewRun(9)
  },

  refreshMeta: () => {
    // 외부(클라우드 동기화 등)에서 메타 데이터를 갱신한 후 store에 반영
    set({ meta: loadMetaProgress() })
  },

  loadDebugResult: () => {
    const config = RUN_CONFIGS[0]
    const market = createInitialMarketState(config)
    // mock prices with some variation
    for (const stock of STOCKS) {
      market.prices[stock.id] = stock.basePrice * (1 + (Math.random() - 0.4) * 0.3)
    }
    set({
      screen: 'result',
      runConfig: config,
      turn: 52,
      maxTurns: 52,
      market,
      portfolio: {
        cash: 5200,
        positions: [
          { stockId: 'pixeltech', shares: 20, avgBuyPrice: 140 },
          { stockId: 'greenpower', shares: 35, avgBuyPrice: 62 },
        ],
        reputationPoints: 18,
      },
      stats: {
        totalTurns: 52,
        correctPredictions: 31,
        fakeNewsDetected: 7,
        fakeNewsTotal: 10,
        pumpDumpAvoided: 3,
        pumpDumpTotal: 4,
        fudAvoided: 2,
        fudTotal: 3,
        learnedConcepts: ['분산 투자의 중요성', '가짜 뉴스 식별법', '펌프앤덤프 패턴'],
      },
    })
  },

  // ═══ 실시간 모드 주간 정산 ═══
  // WEEK_END 이벤트 시 TradingTerminal에서 호출
  // turnを 1 올리고, 뉴스 갱신, RP 적립, 상점 체크, 패시브 스킬 적용
  advanceWeek: () => {
    const {
      turn, maxTurns, runConfig, portfolio, unlockedSkills,
      pendingChainEvents, usedEventIds, usedWeeklyRuleIds,
      equippedCursedItems,
    } = get()
    const newTurn = turn + 1

    // 분기 종료 체크 (13주)
    if (newTurn > maxTurns) {
      // isQuarterEnded는 timeStore에서 처리됨 — 여기서는 turn만 갱신
      set({ turn: newTurn })
      return
    }

    // 뉴스 수정자
    const hasExtraNews = equippedCursedItems.some(i => i.cursedEffect?.upside === 'extra_news')
    const hasFomoBellDown = equippedCursedItems.some(i => i.cursedEffect?.downside === 'increase_fake_news_10')
    const cursedNewsModifiers = (hasExtraNews || hasFomoBellDown)
      ? { extraNews: hasExtraNews, extraFakeRatio: hasFomoBellDown ? 0.10 : 0 }
      : undefined

    // 위클리 룰
    const weeklyRule = rollWeeklyRule(newTurn, runConfig.runNumber, usedWeeklyRuleIds)
    const newUsedWeeklyRuleIds = weeklyRule
      ? [...usedWeeklyRuleIds, weeklyRule.id]
      : usedWeeklyRuleIds

    // 뉴스 생성 (gameStore.currentNews 갱신)
    const { news, newChainEvents } = generateTurnNews(
      runConfig, newTurn, pendingChainEvents, usedEventIds,
      weeklyRule, undefined, cursedNewsModifiers,
    )
    const remainingChains = pendingChainEvents.filter(c => c.triggersAtTurn > newTurn)

    // RP 적립 (기본 2 + 보유종목 상승 보너스)
    const rtMarket = useMarketStore.getState().market
    const prices = rtMarket?.prices ?? get().market.prices
    let rpEarned = 2
    for (const pos of portfolio.positions) {
      const hist = rtMarket?.priceHistories?.find(h => h.stockId === pos.stockId)
      if (hist && hist.prices.length >= 2) {
        const prev = hist.prices[hist.prices.length - 2]
        const curr = hist.prices[hist.prices.length - 1]
        if (curr > prev) rpEarned += 1
      }
    }
    // RP 부스터
    if (get().activeEffects.includes('double_rp_next')) rpEarned *= 2

    let updatedPortfolio = awardReputation({ ...portfolio }, rpEarned)

    // 패시브: 배당
    if (unlockedSkills.includes('dividend')) {
      for (const pos of updatedPortfolio.positions) {
        const price = prices[pos.stockId] || 0
        updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + price * pos.shares * 0.005 }
      }
    }
    // 패시브: 이자
    if (unlockedSkills.includes('interest')) {
      const interestCap = 25
      const interest = Math.min(Math.floor(updatedPortfolio.cash / 2000), interestCap)
      if (interest > 0) {
        updatedPortfolio = { ...updatedPortfolio, cash: updatedPortfolio.cash + interest }
      }
    }

    // 시장 상황 갱신
    const updatedConditions = detectSectorConditions(rtMarket ?? get().market)

    // 상점 체크
    const isBenchmark = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('benchmark')
    const isEarlyRun = runConfig.runNumber <= 2
    const isFirstShop = isEarlyRun && newTurn === 3 && !get().visitedShopThisTurn
    const shopInterval = isBenchmark ? 4 : 13
    if (isFirstShop || newTurn % shopInterval === 0) {
      const shopItems = generateShopItems(runConfig.runNumber, 3)
      set({
        turn: newTurn,
        portfolio: updatedPortfolio,
        currentNews: news,
        pendingChainEvents: [...remainingChains, ...newChainEvents],
        currentWeeklyRule: weeklyRule,
        usedWeeklyRuleIds: newUsedWeeklyRuleIds,
        marketConditions: updatedConditions,
        activeEffects: [],
        screen: 'shop',
        shopItems,
        shopSource: 'auto' as const,
        shopRerollCount: 0,
        quizLoanUsedThisShop: false,
        visitedShopThisTurn: false,
      })
      return
    }

    // 포트폴리오 가치 기록
    const currentValue = getPortfolioValue(updatedPortfolio, prices)

    set({
      turn: newTurn,
      portfolio: updatedPortfolio,
      currentNews: news,
      pendingChainEvents: [...remainingChains, ...newChainEvents],
      currentWeeklyRule: weeklyRule,
      usedWeeklyRuleIds: newUsedWeeklyRuleIds,
      marketConditions: updatedConditions,
      activeEffects: [],
      visitedShopThisTurn: false,
      portfolioValueHistory: [...get().portfolioValueHistory, currentValue],
    })

    // 자동 저장
    autoSave(get())
  },

  loadDebugResultSuccess: () => {
    const config = RUN_CONFIGS[0] // 목표 수익률 5%
    const market = createInitialMarketState(config)
    // 주가를 높여서 수익률이 목표를 넘도록 설정
    for (const stock of STOCKS) {
      market.prices[stock.id] = stock.basePrice * (1.1 + Math.random() * 0.2)
    }
    set({
      screen: 'result',
      runConfig: config,
      turn: 52,
      maxTurns: 52,
      market,
      portfolio: {
        cash: 3500,
        positions: [
          { stockId: 'pixeltech', shares: 30, avgBuyPrice: 130 },
          { stockId: 'greenpower', shares: 40, avgBuyPrice: 58 },
          { stockId: 'neonsoft', shares: 25, avgBuyPrice: 78 },
        ],
        reputationPoints: 24,
      },
      stats: {
        totalTurns: 52,
        correctPredictions: 38,
        fakeNewsDetected: 9,
        fakeNewsTotal: 10,
        pumpDumpAvoided: 4,
        pumpDumpTotal: 4,
        fudAvoided: 3,
        fudTotal: 3,
        learnedConcepts: ['분산 투자의 중요성', '가짜 뉴스 식별법', '펌프앤덤프 패턴', 'FUD 대응 전략', '모멘텀 투자'],
      },
    })
  },
}))

/** 무한 모드 난이도 동적 생성 */
function generateInfiniteConfig(runNumber: number): import('../data/types').RunConfig {
  const wave = runNumber - 8 // 1, 2, 3, ...
  const INFINITE_NAMES = ['격동 시장', '폭풍 시장', '절망 시장', '지옥 시장', '심연 시장', '종말 시장']
  const name = wave <= INFINITE_NAMES.length
    ? `∞ ${INFINITE_NAMES[wave - 1]}`
    : `∞ Lv.${wave}`

  return {
    runNumber,
    name,
    targetReturn: Math.min(0.30 + 0.05 * Math.log2(wave + 1), 0.60),  // 로그 스케일, max 60%
    volatilityMultiplier: 2.5 + 0.3 * Math.sqrt(wave),               // 제곱근 스케일
    fakeNewsRatio: Math.min(0.40 + wave * 0.05, 0.80),               // 45%, 50%... max 80%
    maxTurns: 52,
  }
}

function applyChoiceEffect(portfolio: Portfolio, effect: ChoiceEffect): Portfolio {
  let updated = { ...portfolio }
  if (effect.cash) {
    updated = { ...updated, cash: updated.cash + effect.cash }
  }
  if (effect.cashPercent) {
    updated = { ...updated, cash: updated.cash * (1 + effect.cashPercent) }
  }
  if (effect.rp) {
    updated = awardReputation(updated, effect.rp)
  }
  return updated
}

function autoSave(state: GameState): void {
  const data: SaveData = {
    version: 1,
    turn: state.turn,
    runNumber: state.runConfig.runNumber,
    cash: state.portfolio.cash,
    positions: state.portfolio.positions,
    reputationPoints: state.portfolio.reputationPoints,
    unlockedSkills: state.unlockedSkills,
    prices: state.market.prices,
    priceHistories: state.market.priceHistories,
    stats: state.stats,
    usedEventIds: Array.from(state.usedEventIds),
    usedSpecialEventIds: Array.from(state.usedSpecialEventIds),
    macro: useMacroStore.getState().macro,
    prevMacro: useMacroStore.getState().prevMacro,
    timestamp: Date.now(),
  }
  writeSaveData(data)
}

function createInitialStats(): RunStats {
  return {
    totalTurns: 0,
    correctPredictions: 0,
    fakeNewsDetected: 0,
    fakeNewsTotal: 0,
    pumpDumpAvoided: 0,
    pumpDumpTotal: 0,
    fudAvoided: 0,
    fudTotal: 0,
    learnedConcepts: [],
  }
}
