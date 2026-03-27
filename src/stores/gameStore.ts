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
} from '../data/types'
import { RUN_CONFIGS } from '../data/types'
import { createInitialMarketState, generatePreviousQuarter, simulateTurn, applyNewsEffect, calculateDangerLevel, type MarketState } from '../engine/market'
import { createInitialPortfolio, buyStock, sellStock, awardReputation } from '../engine/portfolio'
import { generateTurnNews } from '../engine/news'
import { rollSpecialEvent, QUIZ_EVENTS } from '../data/specialEvents'
import { rollBreakingNews } from '../data/breakingNews'
import { rollWeeklyRule } from '../data/weeklyRules'
import { loadMetaProgress, saveMetaProgress, getStartingCashBonus, getStartingRPBonus } from '../data/metaUpgrades'
import { writeSaveData, deleteSaveData, type SaveData } from '../utils/save'
import { generateShopItems } from '../data/items'
import { STOCKS } from '../data/stocks'

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
  predictions: Record<string, 'up' | 'down'> | null
  lastTrade: { stockId: string; type: 'buy' | 'sell'; amount: number; price: number; prevPosition: { shares: number; avgBuyPrice: number } | null } | null
  tradesThisTurn: number
  visitedShopThisTurn: boolean

  // 퀴즈 대출 (상점용)
  usedQuizIds: Set<string>
  quizLoanUsedThisShop: boolean

  // 속보 시스템
  breakingNews: BreakingNewsData | null
  breakingNewsDismissed: boolean
  usedBreakingNewsIds: Set<string>

  // 튜토리얼
  tutorialStep: number
  showTutorial: boolean

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
  dismissTutorial: () => void
  advanceTutorial: () => void
  startInfiniteMode: () => void
  refreshMeta: () => void
  loadDebugResult: () => void
  loadDebugResultSuccess: () => void

  // 저주 아이템
  equippedCursedItems: Item[]

  // 주간 특수 규칙
  currentWeeklyRule: WeeklyRule | null
  usedWeeklyRuleIds: string[]

  // 뉴스 참고 드로어
  isNewsDrawerOpen: boolean
  toggleNewsDrawer: () => void
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
  predictions: null,
  lastTrade: null,
  tradesThisTurn: 0,
  visitedShopThisTurn: false,
  usedQuizIds: new Set<string>(),
  quizLoanUsedThisShop: false,
  breakingNews: null,
  breakingNewsDismissed: false,
  usedBreakingNewsIds: new Set<string>(),
  tutorialStep: 0,
  showTutorial: false,
  lastFeedback: [],
  lastInterestEarned: 0,
  resultCascadeData: null,
  meta: loadMetaProgress(),
  equippedCursedItems: [],
  currentWeeklyRule: null,
  usedWeeklyRuleIds: [],
  isNewsDrawerOpen: false,

  toggleNewsDrawer: () => set(s => ({ isNewsDrawerOpen: !s.isNewsDrawerOpen })),

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

    set({
      screen: isFirstEverRun ? 'onboarding' : 'game',
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
      tradesThisTurn: 0,
      visitedShopThisTurn: false,
      usedQuizIds: new Set(),
      quizLoanUsedThisShop: false,
      breakingNews: null,
      breakingNewsDismissed: false,
      usedBreakingNewsIds: new Set(),
      tutorialStep: 0,
      showTutorial: isFirstEverRun,
      lastFeedback: [],
      equippedCursedItems: [],
      currentWeeklyRule: null,
      usedWeeklyRuleIds: [],
    })
  },

  setScreen: (screen) => set({ screen }),
  setPhase: (phase) => set({ phase }),
  selectStock: (stockId) => set({ selectedStockId: stockId }),

  advanceToNewsPhase: () => {
    set({ phase: 'news' })
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
    const { portfolio, market, tradesThisTurn, unlockedSkills } = get()
    const tradeLimit = unlockedSkills.includes('double_trade') ? 2 : 1
    if (tradesThisTurn >= tradeLimit) return
    const price = market.prices[stockId]
    if (!price) return
    const prevPosition = portfolio.positions.find(p => p.stockId === stockId)
    const newPortfolio = buyStock(portfolio, stockId, price, amount)
    set({
      portfolio: newPortfolio,
      tradesThisTurn: tradesThisTurn + 1,
      lastTrade: {
        stockId, type: 'buy', amount, price,
        prevPosition: prevPosition ? { shares: prevPosition.shares, avgBuyPrice: prevPosition.avgBuyPrice } : null,
      },
    })
  },

  executeSell: (stockId, shares) => {
    const { portfolio, market, currentWeeklyRule, tradesThisTurn, unlockedSkills } = get()
    // 주간 규칙: 매도 금지
    if (currentWeeklyRule?.effect.type === 'no_selling') return
    const tradeLimit = unlockedSkills.includes('double_trade') ? 2 : 1
    if (tradesThisTurn >= tradeLimit) return
    const price = market.prices[stockId]
    if (!price) return
    const prevPosition = portfolio.positions.find(p => p.stockId === stockId)
    const newPortfolio = sellStock(portfolio, stockId, price, shares)
    set({
      portfolio: newPortfolio,
      tradesThisTurn: tradesThisTurn + 1,
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

    for (const news of currentNews) {
      const impacts = news.isReal ? news.actualImpact : news.actualImpact
      updatedMarket = applyNewsEffect(updatedMarket, news.id, impacts)

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

    const newMarket = simulateTurn(updatedMarket, runConfig, turn, currentWeeklyRule)

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

    // 평판 포인트 계산 (기본 2)
    let rpEarned = 2
    for (const pos of updatedPortfolio.positions) {
      const prevPrice = market.prices[pos.stockId] || 0
      const newPrice = newMarket.prices[pos.stockId] || 0
      if (newPrice > prevPrice) rpEarned += 1
    }
    const hasFakeNews = currentNews.some((n) => !n.isReal)
    if (!hasFakeNews) rpEarned += 1

    // RP 부스터 효과
    const rpDoubled = activeEffects.includes('double_rp_next')
    if (rpDoubled) {
      rpEarned *= 2
    }

    updatedPortfolio = awardReputation(updatedPortfolio, rpEarned)

    // 캐스케이드: 시뮬 후 포트폴리오 가치
    const valueAfter = updatedPortfolio.cash + updatedPortfolio.positions.reduce((s, p) => s + (newMarket.prices[p.stockId] || 0) * p.shares, 0)

    set({
      phase: 'result',
      market: newMarket,
      portfolio: updatedPortfolio,
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
      },
      stats: { ...stats },
    })
  },

  nextTurn: () => {
    const { turn, maxTurns, runConfig, pendingChainEvents, usedEventIds, usedSpecialEventIds, usedWeeklyRuleIds } = get()
    const newTurn = turn + 1

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

    // 상점 턴 체크 (매 13턴)
    if (newTurn % 13 === 0) {
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
    )

    const remainingChains = pendingChainEvents.filter(
      (c) => c.triggersAtTurn > newTurn,
    )

    // 저주 아이템 업사이드: 매 턴 최고 종목 공개
    const { equippedCursedItems } = get()
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
      predictions: null,
      lastTrade: null,
      tradesThisTurn: 0,
      visitedShopThisTurn: false,
      currentWeeklyRule: weeklyRule,
      usedWeeklyRuleIds: newUsedWeeklyRuleIds,
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
    const { portfolio, unlockedSkills } = get()
    if (unlockedSkills.includes(skillId)) return
    if (portfolio.reputationPoints < cost) return
    set({
      portfolio: awardReputation(portfolio, -cost),
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

  dismissTutorial: () => set({ showTutorial: false }),
  advanceTutorial: () => set((s) => ({ tutorialStep: s.tutorialStep + 1 })),

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
