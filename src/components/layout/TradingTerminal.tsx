import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useTimeStore } from '../../stores/timeStore'
import { useMarketStore } from '../../stores/marketStore'
import { useMacroStore } from '../../stores/macroStore'
import { useGameStore } from '../../stores/gameStore'
import { STOCKS } from '../../data/stocks'
import { getPortfolioValue, getTotalReturn } from '../../engine/portfolio'
import RealtimeLineChart from '../charts/RealtimeLineChart'
import CandlestickChart from '../charts/CandlestickChart'
import { BalPanel } from '../ui/BalPanel'
import { TradingPanel } from '../trade/TradingPanel'
import type { ShortPosition, LeveragedPosition, LimitOrder } from '../../data/types'
import { openShort, coverShort, buyWithLeverage, closeLeveragedPosition, checkOrderFill } from '../../engine/portfolio'
import { StockTabBar } from '../trade/StockTabBar'
import { OrderBookPanel } from '../trade/OrderBookPanel'
import { BottomPanel } from '../trade/BottomPanel'
import { generateMarketTrades } from '../../engine/marketTrades'
import type { MarketTrade } from '../../data/types'
import { MarketConditionModal } from '../ui/MarketConditionModal'
import { SidebarNav, type PageId } from './SidebarNav'
import { NewsPage } from '../pages/NewsPage'
import { SocialPage } from '../pages/SocialPage'
import { UnifiedGuide } from '../tutorial/UnifiedGuide'
import { BalatroBackground } from '../effects/BalatroBackground'
import type { BackgroundMood } from '../effects/BalatroBackground'
import { BalChip } from '../ui/BalChip'
import { BreakingNewsBanner } from '../effects/BreakingNewsBanner'
import { NewsFeedPanel } from '../news/NewsFeedPanel'
import { SectorImpactSummary } from '../news/SectorImpactSummary'
import { useNewsStore } from '../../stores/newsStore'
import { InventoryDropdown } from '../ui/InventoryDropdown'
import { ShopIcon } from '../icons/SkillIcons'
import { SpecialEventOverlay } from './SpecialEventOverlay'
import { TickerTape } from '../stocks/TickerTape'
import { SectorHeatmap } from '../stocks/SectorHeatmap'
import { SECTOR_COLORS } from '../../data/constants'
import { detectStockCondition } from '../../engine/marketCondition'
import { formatGameTime, getQuarterProgress, getMarketSession } from '../../engine/clock'
import { NewsToast } from '../ui/NewsToast'
import { SFX, bgm } from '../../utils/sound'
import type { ClockEvent } from '../../engine/clock'

const INITIAL_CASH = 10000

/**
 * 트레이딩 터미널 — 실시간 멀티패널 게임 화면
 *
 * 발라트로 스타일을 유지하면서 블룸버그 터미널의 기능성을 결합.
 * 유저가 뉴스/차트/매매를 자유롭게 왔다갔다하며 능동적으로 판단.
 *
 * "이 게임은 정답을 알려주지 않습니다.
 *  뉴스를 읽고, 시장을 관찰하고, 스스로 판단하세요."
 */
export function TradingTerminal() {
  // ═══ 스토어 연결 ═══
  const gameTime = useTimeStore(s => s.gameTime)
  const speed = useTimeStore(s => s.speed)
  const session = useTimeStore(s => s.session)
  const isQuarterEnded = useTimeStore(s => s.isQuarterEnded)
  const setSpeed = useTimeStore(s => s.setSpeed)
  const togglePause = useTimeStore(s => s.togglePause)
  const timeTick = useTimeStore(s => s.tick)
  const timeSubscribe = useTimeStore(s => s.subscribe)

  const rtMarket = useMarketStore(s => s.market)
  const rtConditions = useMarketStore(s => s.marketConditions)
  const handleClockEvents = useMarketStore(s => s.handleClockEvents)
  const initializeMarket = useMarketStore(s => s.initialize)
  const initializeMacro = useMacroStore(s => s.initialize)

  const dripNews = useNewsStore(s => s.publishedNews)
  const newsFreshness = useNewsStore(s => s.freshness)
  const newsUnreadCount = useNewsStore(s => s.unreadCount)
  const newsMarkRead = useNewsStore(s => s.markAsRead)
  const newsHandleClock = useNewsStore(s => s.handleClockEvents)
  const generateWeekPool = useNewsStore(s => s.generateWeekPool)

  const {
    portfolio, runConfig, selectedStockId, selectStock,
    unlockedSkills, currentNews, currentSpecialEvent,
    inventory, useItem, openShop, visitedShopThisTurn,
    breakingNews, lastFeedback,
    equippedCursedItems, tradesThisTurn,
    autoTradeRules, addAutoTradeRule, removeAutoTradeRule,
    executeBuy, executeSell,
    pickedStockId,
  } = useGameStore()

  const [marketTrades, setMarketTrades] = useState<MarketTrade[]>([])
  const tradeHistory = useGameStore(s => s.tradeHistory)
  const totalFeesVal = useGameStore(s => s.totalFees)
  const realizedPnLVal = useGameStore(s => s.realizedPnL)
  const portfolioValueHistory = useGameStore(s => s.portfolioValueHistory)
  const lastTrade = useGameStore(s => s.lastTrade)

  // ═══ 초기화 ═══
  const initialized = useRef(false)
  useEffect(() => {
    if (!initialized.current && runConfig) {
      initializeMarket(runConfig)
      initializeMacro(runConfig)
      generateWeekPool(1, runConfig, null)
      // pickedStockId가 있으면 자동 선택
      if (pickedStockId && !selectedStockId) {
        selectStock(pickedStockId)
      }
      initialized.current = true
    }
  }, [runConfig, initializeMarket, initializeMacro, generateWeekPool, pickedStockId, selectedStockId, selectStock])

  // ═══ BGM ═══
  useEffect(() => { bgm.crossFadeTo('game-main') }, [])

  // ═══ 시계 루프 ═══
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    clockRef.current = setInterval(() => {
      timeTick(100) // 100ms 간격
    }, 100)
    return () => { if (clockRef.current) clearInterval(clockRef.current) }
  }, [timeTick])

  // ═══ 시계 이벤트 → 시장 + 뉴스 업데이트 연결 ═══
  useEffect(() => {
    return timeSubscribe((events: ClockEvent[]) => {
      const gt = useTimeStore.getState().gameTime
      handleClockEvents(events, gt.tickCount)
      newsHandleClock(events, gt)

      // 주 시작 시 뉴스 풀 생성
      for (const e of events) {
        if (e.type === 'WEEK_END' || e.type === 'MARKET_OPEN') {
          const config = useGameStore.getState().runConfig
          if (config) {
            generateWeekPool(gt.week, config, useMarketStore.getState().currentWeeklyRule)
          }
        }
      }
    })
  }, [timeSubscribe, handleClockEvents, newsHandleClock, generateWeekPool])

  // 시뮬레이션 체결 생성 (장중에만)
  useEffect(() => {
    if (!gameTime || gameTime.hour < 9 || gameTime.hour >= 16) return
    const newTrades = generateMarketTrades(
      gameTime.tickCount,
      market.prices,
      market.herdSentiment,
      gameTime.hour,
      gameTime.minute,
    )
    setMarketTrades(prev => [...prev.slice(-47), ...newTrades])
  }, [gameTime.tickCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // 유저 거래 시 체결내역에 삽입
  useEffect(() => {
    if (!lastTrade) return
    const stock = STOCKS.find(s => s.id === lastTrade.stockId)
    const hh = String(gameTime.hour).padStart(2, '0')
    const mm = String(gameTime.minute).padStart(2, '0')
    const ss = String(Math.floor(Math.random() * 60)).padStart(2, '0')
    const userTrade: MarketTrade = {
      time: `${hh}:${mm}:${ss}`,
      stockId: lastTrade.stockId,
      ticker: stock?.ticker ?? lastTrade.stockId,
      side: lastTrade.type,
      quantity: lastTrade.amount,
      price: lastTrade.price,
      isUserTrade: true,
    }
    setMarketTrades(prev => [...prev.slice(-49), userTrade])
  }, [lastTrade]) // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ 시장 데이터 (실시간 또는 기존 gameStore fallback) ═══
  const legacyMarket = useGameStore(s => s.market)
  const market = rtMarket ?? legacyMarket
  const legacyConditions = useGameStore(s => s.marketConditions)
  const marketConditions = (rtConditions && Object.keys(rtConditions).length > 0) ? rtConditions : legacyConditions

  // ═══ 선택 종목 ═══
  const selectedStock = useMemo(() =>
    selectedStockId ? STOCKS.find(s => s.id === selectedStockId) ?? null : null,
  [selectedStockId])

  const currentPrice = selectedStockId && market ? (market.prices[selectedStockId] ?? 0) : 0
  const selectedHistory = useMemo(() => {
    if (!selectedStockId || !market) return []
    return market.priceHistories.find(h => h.stockId === selectedStockId)?.prices ?? []
  }, [selectedStockId, market?.priceHistories])

  const priceChange = useMemo(() => {
    if (selectedHistory.length < 2) return 0
    const prev = selectedHistory[selectedHistory.length - 2]
    const curr = selectedHistory[selectedHistory.length - 1]
    return prev > 0 ? (curr - prev) / prev : 0
  }, [selectedHistory])

  const openPrice = useMemo(() => {
    if (selectedHistory.length === 0) return 0
    return selectedHistory[0]
  }, [selectedHistory])

  const selectedPosition = useMemo(() =>
    selectedStockId ? portfolio.positions.find(p => p.stockId === selectedStockId) ?? null : null,
  [selectedStockId, portfolio.positions])

  const selectedStockCondition = useMemo(() => {
    if (!selectedStockId || !market) return 'neutral' as const
    if (!unlockedSkills.includes('technical_analysis')) return 'neutral' as const
    return detectStockCondition(selectedStockId, market)
  }, [selectedStockId, market?.prices, unlockedSkills])

  // ═══ 포트폴리오 ═══
  const portfolioValue = market ? getPortfolioValue(portfolio, market.prices) : INITIAL_CASH
  const totalReturn = market ? getTotalReturn(portfolio, market.prices, INITIAL_CASH) : 0
  const isPositive = totalReturn >= 0

  // ═══ 배경 무드 ═══
  const bgMood: BackgroundMood = useMemo(() => {
    if (totalReturn > 0.1) return 'profit'
    if (totalReturn < -0.05) return 'loss'
    if (market?.dangerLevel > 0.5) return 'danger'
    return 'neutral'
  }, [totalReturn, market?.dangerLevel])

  // ═══ 차트 크기 ═══
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartSize, setChartSize] = useState({ w: 600, h: 350 })
  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setChartSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ═══ 차트 모드 ═══
  const [chartType, setChartType] = useState<'line' | 'candle'>('line')
  const [showMA, setShowMA] = useState(false)
  const [showBollinger, setShowBollinger] = useState(false)
  const hasTA = unlockedSkills.includes('technical_analysis')

  // ═══ 모달 ═══
  const [showMarketModal, setShowMarketModal] = useState(false)
  const [activePage, setActivePage] = useState<PageId>('trading')
  const guideMode = useGameStore(s => s.guideMode)
  const setGuideMode = useGameStore(s => s.setGuideMode)
  const dismissGuide = useGameStore(s => s.dismissGuide)
  const [toastNews, setToastNews] = useState<import('../../data/types').NewsCard | null>(null)

  // 새 임팩트 뉴스 도착 시 토스트 (선택 종목 관련 뉴스만)
  const prevNewsCount = useRef(0)
  useEffect(() => {
    if (dripNews.length > prevNewsCount.current && prevNewsCount.current > 0) {
      const newest = dripNews[0]
      if (newest && !newest.isNoise && activePage === 'trading') {
        // pickedStockId가 있으면 관련 뉴스만 토스트
        const _pickedSector = pickedStockId ? STOCKS.find(s => s.id === pickedStockId)?.sector : null
        const _globals = new Set(['economic', 'government', 'geopolitics', 'commodity', 'disaster', 'social'])
        const _catSector: Record<string, string> = { technology: 'tech' }
        const isRelevant = !_pickedSector
          || _globals.has(newest.category)
          || _catSector[newest.category] === _pickedSector
          || newest.actualImpact?.some(si => si.sector === _pickedSector || si.sector === 'all')
          || newest.perceivedImpact?.some(si => si.sector === _pickedSector || si.sector === 'all')
        if (isRelevant) setToastNews(newest)
      }
    }
    prevNewsCount.current = dripNews.length
  }, [dripNews.length, activePage, pickedStockId])

  // ═══ 공매도/레버리지/주문 상태 ═══
  const [shortPositions, setShortPositions] = useState<ShortPosition[]>([])
  const [leveragedPositions, setLeveragedPositions] = useState<LeveragedPosition[]>([])
  const [activeOrders, setActiveOrders] = useState<LimitOrder[]>([])

  const handleOpenShort = useCallback((stockId: string, shares: number, price: number) => {
    const result = openShort(portfolio.cash, stockId, shares, price)
    if (!result) return
    useGameStore.setState(s => ({ portfolio: { ...s.portfolio, cash: result.newCash } }))
    setShortPositions(prev => [...prev, result.position])
    SFX.sell()
  }, [portfolio.cash])

  const handleCoverShort = useCallback((positionId: string, shares: number, price: number) => {
    const pos = shortPositions.find(p => p.id === positionId)
    if (!pos) return
    const result = coverShort(portfolio.cash, pos, price, shares)
    if (!result) return
    useGameStore.setState(s => ({ portfolio: { ...s.portfolio, cash: result.newCash } }))
    setShortPositions(prev => result.remaining
      ? prev.map(p => p.id === positionId ? result.remaining! : p)
      : prev.filter(p => p.id !== positionId)
    )
    SFX.buy()
  }, [portfolio.cash, shortPositions])

  const handleBuyLeverage = useCallback((stockId: string, amount: number, leverage: 2 | 5 | 10) => {
    const result = buyWithLeverage(portfolio.cash, stockId, amount, market?.prices[stockId] ?? 0, leverage)
    if (!result) return
    useGameStore.setState(s => ({ portfolio: { ...s.portfolio, cash: result.newCash } }))
    setLeveragedPositions(prev => [...prev, result.position])
    SFX.buy()
  }, [portfolio.cash, market?.prices])

  const handleCloseLeverage = useCallback((positionId: string) => {
    const pos = leveragedPositions.find(p => p.id === positionId)
    if (!pos || !market) return
    const newCash = closeLeveragedPosition(portfolio.cash, pos, market.prices[pos.stockId] ?? 0)
    useGameStore.setState(s => ({ portfolio: { ...s.portfolio, cash: newCash } }))
    setLeveragedPositions(prev => prev.filter(p => p.id !== positionId))
    SFX.sell()
  }, [portfolio.cash, leveragedPositions, market?.prices])

  const handleCreateOrder = useCallback((order: Omit<LimitOrder, 'id' | 'createdAt'>) => {
    const newOrder: LimitOrder = {
      ...order,
      id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: gameTime.tickCount,
    }
    setActiveOrders(prev => [...prev, newOrder])
    SFX.click()
  }, [gameTime.tickCount])

  const handleCancelOrder = useCallback((orderId: string) => {
    setActiveOrders(prev => prev.filter(o => o.id !== orderId))
  }, [])

  // 최대 레버리지 (스킬 기반)
  const maxLeverage: 2 | 5 | 10 = unlockedSkills.includes('leverage_extreme') ? 10
    : unlockedSkills.includes('leverage_pro') ? 5 : 2

  // ═══ 매매 핸들러 ═══
  const handleBuy = useCallback((stockId: string, amount: number) => {
    SFX.buy(); executeBuy(stockId, amount)
  }, [executeBuy])
  const handleSell = useCallback((stockId: string, shares: number) => {
    SFX.sell(); executeSell(stockId, shares)
  }, [executeSell])
  const handleSelectStock = useCallback((stockId: string) => {
    SFX.click(); selectStock(stockId)
  }, [selectStock])

  // ═══ 분기 진행률 ═══
  const quarterProgress = getQuarterProgress(gameTime)

  // ═══ 로딩 화면 ═══
  const [loadingDone, setLoadingDone] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [loadingText, setLoadingText] = useState('')

  // ─── 종목 데이터 (로딩 중 실시간 수신 연출) ───
  const STOCK_FEED = STOCKS.filter(s => !s.isETF).map(s => ({
    id: s.id, ticker: s.ticker, name: s.name, base: s.basePrice, sector: s.sector,
  }))

  // 종목이 하나씩 수신되는 상태
  const [receivedStocks, setReceivedStocks] = useState<number>(0)
  // 각 종목의 실시간 가격 변동
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change: number; flash: 'up' | 'down' | null }>>({})
  // 스파크라인 포인트 진행 (히스토리 데이터를 점진적으로 표시)
  const [sparklineProgress, setSparklineProgress] = useState(0)

  // 종목 하나씩 수신 (0.4초 간격)
  useEffect(() => {
    if (loadingDone) return
    if (receivedStocks >= STOCK_FEED.length) return
    const t = setTimeout(() => {
      const stock = STOCK_FEED[receivedStocks]
      const change = (Math.random() - 0.45) * 4 // -1.8% ~ +2.2% 범위
      setLivePrices(prev => ({
        ...prev,
        [stock.ticker]: {
          price: stock.base * (1 + change / 100),
          change,
          flash: change >= 0 ? 'up' : 'down',
        },
      }))
      setReceivedStocks(n => n + 1)
    }, receivedStocks === 0 ? 800 : 350)
    return () => clearTimeout(t)
  }, [receivedStocks, loadingDone])

  // 수신 완료된 종목들의 가격이 계속 틱틱 변하는 효과
  useEffect(() => {
    if (loadingDone || receivedStocks < 3) return
    const interval = setInterval(() => {
      setLivePrices(prev => {
        const tickers = Object.keys(prev)
        if (tickers.length === 0) return prev
        // 랜덤 1~2개 종목의 가격 변동
        const count = Math.random() > 0.5 ? 2 : 1
        const next = { ...prev }
        for (let i = 0; i < count; i++) {
          const ticker = tickers[Math.floor(Math.random() * tickers.length)]
          const entry = next[ticker]
          const delta = (Math.random() - 0.5) * 0.8
          const newPrice = entry.price * (1 + delta / 100)
          const stock = STOCK_FEED.find(s => s.ticker === ticker)
          const totalChange = stock ? ((newPrice - stock.base) / stock.base) * 100 : entry.change
          next[ticker] = { price: newPrice, change: totalChange, flash: delta >= 0 ? 'up' : 'down' }
        }
        return next
      })
    }, 600)
    return () => clearInterval(interval)
  }, [receivedStocks, loadingDone])

  // flash 효과 리셋 (0.3초 후)
  useEffect(() => {
    if (Object.values(livePrices).every(v => v.flash === null)) return
    const t = setTimeout(() => {
      setLivePrices(prev => {
        const next: typeof prev = {}
        for (const [k, v] of Object.entries(prev)) {
          next[k] = { ...v, flash: null }
        }
        return next
      })
    }, 300)
    return () => clearTimeout(t)
  }, [livePrices])

  // 스파크라인: 히스토리 포인트를 하나씩 드러냄
  useEffect(() => {
    if (loadingDone || receivedStocks < 1) return
    const maxPoints = rtMarket?.priceHistories?.[0]?.prices?.length ?? 13
    if (sparklineProgress >= maxPoints) return
    const t = setTimeout(() => setSparklineProgress(n => n + 1), 250)
    return () => clearTimeout(t)
  }, [sparklineProgress, receivedStocks, loadingDone, rtMarket])

  // 전체 로딩 완료 판정: 모든 종목 수신 + 1초 대기
  useEffect(() => {
    if (loadingDone) return
    if (!market) return
    if (receivedStocks < STOCK_FEED.length) return
    const t = setTimeout(() => setLoadingDone(true), 1200)
    return () => clearTimeout(t)
  }, [receivedStocks, market, loadingDone])

  // 뉴스 필터링 (hook이므로 early return 전에 위치해야 함)
  const rawNews = dripNews.length > 0 ? dripNews : currentNews
  const pickedSector = pickedStockId ? STOCKS.find(s => s.id === pickedStockId)?.sector : null
  const allNews = useMemo(() => {
    if (!pickedSector) return rawNews
    // 글로벌 뉴스는 항상 표시 (경제, 정부, 지정학, 원자재, 재해, 사회)
    const globals = new Set(['economic', 'government', 'geopolitics', 'commodity', 'disaster', 'social'])
    // 카테고리↔섹터 매핑 (technology 카테고리 = tech 섹터 등)
    const categoryToSector: Record<string, string> = {
      technology: 'tech',
    }
    return rawNews.filter(n => {
      if (globals.has(n.category)) return true
      if (n.isNoise) return true // 노이즈는 표시 (시장 영향 없음)
      if (categoryToSector[n.category] === pickedSector) return true
      const touchesSector = n.actualImpact?.some(si => si.sector === pickedSector || si.sector === 'all')
      const perceivedTouches = n.perceivedImpact?.some(si => si.sector === pickedSector || si.sector === 'all')
      return touchesSector || perceivedTouches
    })
  }, [rawNews, pickedSector])

  if (!market || !loadingDone) {
    const progress = Math.min(100, Math.round((receivedStocks / STOCK_FEED.length) * 100))
    const statusText =
      receivedStocks === 0 ? '거래소 연결 중...' :
      receivedStocks < STOCK_FEED.length ? `시세 수신 중... (${receivedStocks}/${STOCK_FEED.length})` :
      '장 개시 준비 완료'
    return (
      <div className="loading-screen">
        <div className="loading-title">SELL THE NEWS</div>
        <div className="loading-subtitle">{runConfig?.name ?? '시장'} — 장 개시 준비</div>

        {/* 실시간 주가 수신 보드 + 미니 차트 */}
        <div className="loading-stock-board">
          {STOCK_FEED.map((stock, i) => {
            const live = livePrices[stock.ticker]
            const visible = i < receivedStocks
            // 스파크라인 데이터: market 히스토리에서 점진적으로 표시
            const history = rtMarket?.priceHistories?.find(h => h.stockId === stock.id)
            const sparkData = history ? history.prices.slice(0, sparklineProgress) : []
            // 현재 라이브 가격도 스파크라인 끝에 추가
            if (live && sparkData.length > 0) sparkData.push(live.price)
            const sparkColor = sparkData.length >= 2
              ? (sparkData[sparkData.length - 1] >= sparkData[0] ? 'var(--color-bal-green)' : 'var(--color-bal-red)')
              : 'var(--color-bal-text-dim)'
            return (
              <div
                key={stock.ticker}
                className={`loading-stock-row ${visible ? 'loading-stock-row--visible' : ''} ${live?.flash === 'up' ? 'loading-stock-flash-up' : ''} ${live?.flash === 'down' ? 'loading-stock-flash-down' : ''}`}
              >
                <span className="loading-stock-ticker">{stock.ticker}</span>
                <span className="loading-stock-sparkline">
                  {visible && <LoadingSparkline data={sparkData} width={80} height={20} color={sparkColor} />}
                </span>
                <span className="loading-stock-price">
                  {live ? `$${live.price.toFixed(2)}` : '---'}
                </span>
                <span className={`loading-stock-change ${live ? (live.change >= 0 ? 'loading-ticker-up' : 'loading-ticker-down') : ''}`}>
                  {live ? `${live.change >= 0 ? '+' : ''}${live.change.toFixed(2)}%` : ''}
                </span>
              </div>
            )
          })}
        </div>

        <div className="loading-bar-container">
          <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="loading-text">{statusText}</div>
        <div className="loading-percent">{progress}%</div>
        {progress >= 100 && market && (
          <button
            type="button"
            onClick={() => setLoadingDone(true)}
            className="mt-4 px-6 py-2 bg-bal-green/20 border-2 border-bal-green text-bal-green font-bold rounded hover:bg-bal-green/30 transition-colors animate-pulse"
            aria-label="게임 시작"
          >
            시작 ▶
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden font-pixel text-white relative">
      <BalatroBackground mood={bgMood} />

      <div className="relative z-10 flex h-full">
        {/* ═══ 사이드바 네비게이션 ═══ */}
        <SidebarNav
          activePage={activePage}
          onNavigate={setActivePage}
          unreadNewsCount={newsUnreadCount}
          guideActive={guideMode === 'manual'}
          onToggleGuide={() => guideMode === 'manual' ? dismissGuide() : setGuideMode('manual')}
        />

        {/* ═══ 메인 콘텐츠 ═══ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* ═══ HUD 바 (모든 페이지 공통) ═══ */}
          <div className="trading-hud" data-guide="hud">
            <div className="trading-hud-left">
              <span title="현재 보유 현금 (매도 대금 포함)">
                <BalChip color="gold" label="현금">${Math.floor(portfolio.cash).toLocaleString()}</BalChip>
              </span>
              <span title="총 수익률 = (현금 + 보유종목 평가액 - 초기자본) / 초기자본. 미실현 손익 포함.">
                <BalChip color={isPositive ? 'green' : 'red'} label="총 수익률">
                  {isPositive ? '+' : ''}{(totalReturn * 100).toFixed(1)}%
                </BalChip>
              </span>
              <BalChip color="purple" label="RP">{portfolio.reputationPoints}</BalChip>
            </div>

            <div className="trading-hud-center">
              <div className="trading-time-display">
                <span className="trading-time-week">{runConfig?.name ?? '분기'}</span>
                <span className="trading-time-clock">{formatGameTime(gameTime)}</span>
                <span className={`trading-time-session ${session.isOpen ? 'trading-time-session--open' : ''}`}>
                  {session.isOpen ? '장중' : session.preMarket ? '장전' : '장후'}
                </span>
              </div>
              <div className="trading-speed-controls" role="group" aria-label="게임 속도 조절">
                {(['paused', '1x', '2x', '4x'] as const).map(s => {
                  const label = s === 'paused' ? '일시정지' : `${s} 배속`
                  return (
                    <button key={s}
                      className={`trading-speed-btn ${speed === s ? 'trading-speed-btn--active' : ''}`}
                      onClick={() => setSpeed(s)}
                      aria-label={label}
                      aria-pressed={speed === s}
                      title={label}
                    >{s === 'paused' ? '⏸' : s}</button>
                  )
                })}
              </div>
              <div className="trading-quarter-bar">
                <div className="trading-quarter-fill" style={{ width: `${quarterProgress * 100}%` }} />
              </div>
            </div>

            <div className="trading-hud-right">
              <InventoryDropdown
                inventory={inventory}
                onUseItem={(id) => { SFX.click(); useItem(id) }}
                phase="investment"
              />
              <button
                className={`p-1.5 rounded-lg transition-all ${visitedShopThisTurn ? 'text-bal-text-dim/50 cursor-not-allowed' : 'text-bal-purple hover:bg-white/5 cursor-pointer'}`}
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={() => { if (!visitedShopThisTurn) { SFX.click(); openShop() } }}
              >
                <ShopIcon size={14} />
              </button>
            </div>
          </div>

          {/* ═══ 틱 테이프 ═══ */}
          <TickerTape />

          {/* ═══ 페이지 콘텐츠 ═══ */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activePage === 'trading' && (
              /* ════ 매매 페이지: 바이낸스 스타일 ════ */
              <div className="trading-page">
                {/* 종목 탭바 */}
                <div style={{ gridArea: 'tabs' }}>
                  <StockTabBar
                    stocks={STOCKS} prices={market.prices} positions={portfolio.positions}
                    selectedStockId={selectedStockId} pickedStockId={pickedStockId}
                    onSelectStock={handleSelectStock}
                  />
                </div>

                {/* 호가창 */}
                <div className="trading-crt-panel" data-guide="orderbook" style={{ gridArea: 'book' }}>
                  <div className="trading-crt-label">호가</div>
                  <OrderBookPanel
                    currentPrice={currentPrice}
                    volatility={selectedStock?.volatility ?? 0.3}
                    ticker={selectedStock?.ticker ?? ''}
                  />
                </div>

                {/* 차트 */}
                <div data-guide="chart" style={{ gridArea: 'chart' }}>
                  <BalPanel
                    label={selectedStock
                      ? `${selectedStock.ticker}  $${currentPrice.toFixed(2)}  ${priceChange >= 0 ? '▲' : '▼'}${(priceChange * 100).toFixed(2)}%`
                      : '차트'}
                    accentColor={selectedStock ? SECTOR_COLORS[selectedStock.sector] : undefined}
                    className="flex flex-col h-full"
                  >
                    {/* 차트 유형/지표 토글 */}
                    <div className="chart-toolbar">
                      <div className="chart-toolbar-group">
                        <button className={`chart-toolbar-btn ${chartType === 'line' ? 'chart-toolbar-btn--active' : ''}`} onClick={() => setChartType('line')}>Line</button>
                        <button className={`chart-toolbar-btn ${chartType === 'candle' ? 'chart-toolbar-btn--active' : ''}`} onClick={() => setChartType('candle')}>Candle</button>
                      </div>
                      {hasTA && chartType === 'candle' && (
                        <div className="chart-toolbar-group">
                          <button className={`chart-toolbar-btn ${showMA ? 'chart-toolbar-btn--active' : ''}`} onClick={() => setShowMA(!showMA)}>MA</button>
                          <button className={`chart-toolbar-btn ${showBollinger ? 'chart-toolbar-btn--active' : ''}`} onClick={() => setShowBollinger(!showBollinger)}>BB</button>
                        </div>
                      )}
                    </div>
                    <div ref={chartContainerRef} className="flex-1 min-h-0">
                      {selectedHistory.length > 0 && selectedStock ? (
                        chartType === 'candle' ? (
                          <CandlestickChart
                            prices={selectedHistory}
                            volatility={selectedStock.volatility}
                            width={chartSize.w}
                            height={chartSize.h - 28}
                            showMA={showMA && hasTA}
                            showBollinger={showBollinger && hasTA}
                          />
                        ) : (
                          <RealtimeLineChart
                            prices={selectedHistory}
                            currentPrice={currentPrice}
                            openPrice={openPrice}
                            width={chartSize.w}
                            height={chartSize.h}
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-bal-text-dim text-sm">
                          종목을 선택하면 차트가 표시됩니다
                        </div>
                      )}
                    </div>
                  </BalPanel>
                </div>

                {/* 주문서 (인라인 — 별도 패널 없음) */}
                <div className="trading-order-area" data-guide="order" style={{ gridArea: 'order' }}>
                  <TradingPanel
                    stock={selectedStock} currentPrice={currentPrice} priceChange={priceChange}
                    portfolio={portfolio} position={selectedPosition}
                    onBuy={handleBuy} onSell={handleSell}
                    shortPositions={shortPositions} onOpenShort={handleOpenShort} onCoverShort={handleCoverShort}
                    leveragedPositions={leveragedPositions} onBuyLeverage={handleBuyLeverage} onCloseLeverage={handleCloseLeverage}
                    maxLeverage={maxLeverage}
                    activeOrders={activeOrders} onCreateOrder={handleCreateOrder} onCancelOrder={handleCancelOrder}
                    unlockedSkills={unlockedSkills} stockCondition={selectedStockCondition}
                    autoTradeRules={autoTradeRules} onAddAutoTradeRule={addAutoTradeRule} onRemoveAutoTradeRule={removeAutoTradeRule}
                    tradesRemaining={99}
                    tradeLimit={99}
                  />
                </div>

                {/* 체결/포지션 */}
                <div className="trading-crt-panel" style={{ gridArea: 'log' }}>
                  <BottomPanel
                    portfolio={portfolio}
                    prices={market.prices}
                    tradeHistory={tradeHistory}
                    totalFees={totalFeesVal}
                    realizedPnL={realizedPnLVal}
                    portfolioValueHistory={portfolioValueHistory}
                  />
                </div>
              </div>
            )}

            {activePage === 'news' && (
              /* ════ 뉴스 페이지: 상세 읽기 + 인과관계 ════ */
              <NewsPage
                news={allNews}
                freshness={newsFreshness}
                unlockedSkills={unlockedSkills}
                onNavigateToTrading={(sectorFilter) => {
                  setActivePage('trading')
                  // 섹터 필터가 있으면 해당 섹터 첫 종목 선택
                  if (sectorFilter) {
                    const sectorStock = STOCKS.find(s => s.sector === sectorFilter && !s.isETF)
                    if (sectorStock) selectStock(sectorStock.id)
                  }
                }}
              />
            )}

            {activePage === 'analysis' && (
              /* ════ 사회정보 페이지: 원문 데이터 ════ */
              <SocialPage
                herdSentiment={market.herdSentiment}
                panicLevel={market.panicLevel}
                tickCount={gameTime.tickCount}
                runNumber={runConfig?.runNumber ?? 1}
                week={gameTime.week}
                marketTrend={market.marketTrend}
              />
            )}

            {activePage === 'market' && (
              /* ════ 마켓 페이지: 섹터 히트맵 ════ */
              <SectorHeatmap onSelectSector={(sector) => {
                // 섹터 클릭 시 해당 섹터 첫 종목 선택 후 트레이딩으로 이동
                const sectorStock = STOCKS.find(s => s.sector === sector && !s.isETF)
                if (sectorStock) handleSelectStock(sectorStock.id)
                setActivePage('trading')
              }} />
            )}

          </div>
        </div>

        {/* ═══ 가이드 오버레이 ═══ */}
        <UnifiedGuide
          onNavigate={setActivePage}
        />

        {/* ═══ 뉴스 토스트 알림 ═══ */}
        <NewsToast
          news={toastNews}
          onRead={(id) => { setToastNews(null); setActivePage('news'); }}
          onDismiss={() => setToastNews(null)}
        />

        {/* ═══ 전역 오버레이 ═══ */}
        <BreakingNewsBanner />
        {currentSpecialEvent && <SpecialEventOverlay />}
        {showMarketModal && <MarketConditionModal conditions={marketConditions} onClose={() => setShowMarketModal(false)} />}

        {isQuarterEnded && (
          <div className="trading-quarter-end-overlay">
            <div className="trading-quarter-end-card">
              <h2 className="text-xl font-bold text-bal-gold mb-2">📊 분기 종료</h2>
              <div className="text-sm mb-4">
                <div>최종 자산: <span className="text-bal-gold font-bold">${Math.floor(portfolioValue).toLocaleString()}</span></div>
                <div>수익률: <span className={`font-bold ${isPositive ? 'text-bal-green' : 'text-bal-red'}`}>
                  {isPositive ? '+' : ''}{(totalReturn * 100).toFixed(1)}%
                </span></div>
                <div className="mt-2 text-bal-text-dim text-xs">
                  목표: {((runConfig?.targetReturn ?? 0.05) * 100).toFixed(0)}%
                  {totalReturn >= (runConfig?.targetReturn ?? 0.05) ? ' ✅ 달성!' : ' ❌ 미달성'}
                </div>
              </div>
              <div className="text-[10px] text-bal-text-dim mb-4 italic">
                "시장은 당신이 배운 것을 시험합니다. 다음 분기에서 더 나은 판단을 하세요."
              </div>
              <button className="bal-btn bal-btn-gold w-full" onClick={() => useGameStore.getState().setScreen('result')}>
                결과 확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══ 로딩 화면 미니 스파크라인 ═══

function LoadingSparkline({ data, width, height, color }: {
  data: number[]
  width: number
  height: number
  color: string
}) {
  if (data.length < 2) return <svg width={width} height={height} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 2) - 1
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  )
}
