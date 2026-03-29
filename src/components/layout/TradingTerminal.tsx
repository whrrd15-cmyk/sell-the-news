import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useTimeStore } from '../../stores/timeStore'
import { useMarketStore } from '../../stores/marketStore'
import { useGameStore } from '../../stores/gameStore'
import { STOCKS } from '../../data/stocks'
import { getPortfolioValue, getTotalReturn } from '../../engine/portfolio'
import CandlestickChart from '../charts/CandlestickChart'
import { BalPanel } from '../ui/BalPanel'
import { TradingPanel } from '../trade/TradingPanel'
import type { ShortPosition, LeveragedPosition, LimitOrder } from '../../data/types'
import { openShort, coverShort, buyWithLeverage, closeLeveragedPosition, checkOrderFill } from '../../engine/portfolio'
import { StockTabBar } from '../trade/StockTabBar'
import { OrderBookPanel } from '../trade/OrderBookPanel'
import { TradeLogPanel } from '../trade/TradeLogPanel'
import { MarketConditionModal } from '../ui/MarketConditionModal'
import { SidebarNav, type PageId } from './SidebarNav'
import { NewsPage } from '../pages/NewsPage'
import { SocialPage } from '../pages/SocialPage'
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
  } = useGameStore()

  // ═══ 초기화 ═══
  const initialized = useRef(false)
  useEffect(() => {
    if (!initialized.current && runConfig) {
      initializeMarket(runConfig)
      generateWeekPool(1, runConfig, null)
      initialized.current = true
    }
  }, [runConfig, initializeMarket, generateWeekPool])

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

  // ═══ 모달 ═══
  const [showMarketModal, setShowMarketModal] = useState(false)
  const [activePage, setActivePage] = useState<PageId>('trading')
  const [toastNews, setToastNews] = useState<import('../../data/types').NewsCard | null>(null)

  // 새 임팩트 뉴스 도착 시 토스트
  const prevNewsCount = useRef(0)
  useEffect(() => {
    if (dripNews.length > prevNewsCount.current && prevNewsCount.current > 0) {
      const newest = dripNews[0]
      if (newest && !newest.isNoise && activePage === 'trading') {
        setToastNews(newest)
      }
    }
    prevNewsCount.current = dripNews.length
  }, [dripNews.length, activePage])

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

  if (!market) return null

  const allNews = dripNews.length > 0 ? dripNews : currentNews

  return (
    <div className="h-screen w-screen overflow-hidden font-pixel text-white relative">
      <BalatroBackground mood={bgMood} />

      <div className="relative z-10 flex h-full">
        {/* ═══ 사이드바 네비게이션 ═══ */}
        <SidebarNav
          activePage={activePage}
          onNavigate={setActivePage}
          unreadNewsCount={newsUnreadCount}
        />

        {/* ═══ 메인 콘텐츠 ═══ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* ═══ HUD 바 (모든 페이지 공통) ═══ */}
          <div className="trading-hud">
            <div className="trading-hud-left">
              <BalChip color="gold" label="현금">${Math.floor(portfolio.cash).toLocaleString()}</BalChip>
              <BalChip color={isPositive ? 'green' : 'red'} label="수익률">
                {isPositive ? '+' : ''}{(totalReturn * 100).toFixed(1)}%
              </BalChip>
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
              <div className="trading-speed-controls">
                {(['paused', '1x', '2x', '4x'] as const).map(s => (
                  <button key={s}
                    className={`trading-speed-btn ${speed === s ? 'trading-speed-btn--active' : ''}`}
                    onClick={() => setSpeed(s)}
                  >{s === 'paused' ? '⏸' : s}</button>
                ))}
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

          {/* ═══ 페이지 콘텐츠 ═══ */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activePage === 'trading' && (
              /* ════ 매매 페이지: 바이낸스 스타일 ════ */
              <div className="trading-page">
                {/* 종목 탭바 */}
                <div style={{ gridArea: 'tabs' }}>
                  <StockTabBar
                    stocks={STOCKS} prices={market.prices} positions={portfolio.positions}
                    selectedStockId={selectedStockId} onSelectStock={handleSelectStock}
                  />
                </div>

                {/* 호가창 */}
                <div className="trading-crt-panel" style={{ gridArea: 'book' }}>
                  <div className="trading-crt-label">호가</div>
                  <OrderBookPanel
                    currentPrice={currentPrice}
                    volatility={selectedStock?.volatility ?? 0.3}
                    ticker={selectedStock?.ticker ?? ''}
                  />
                </div>

                {/* 차트 */}
                <div style={{ gridArea: 'chart' }}>
                  <BalPanel
                    label={selectedStock
                      ? `${selectedStock.ticker}  $${currentPrice.toFixed(0)}  ${priceChange >= 0 ? '▲' : '▼'}${(priceChange * 100).toFixed(1)}%`
                      : '차트'}
                    accentColor={selectedStock ? SECTOR_COLORS[selectedStock.sector] : undefined}
                    className="flex flex-col h-full"
                  >
                    <div ref={chartContainerRef} className="flex-1 min-h-0">
                      {selectedHistory.length > 1 ? (
                        <CandlestickChart prices={selectedHistory} volatility={selectedStock?.volatility ?? 0.3} width={chartSize.w} height={chartSize.h} markers={[]} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-bal-text-dim text-sm">
                          종목을 선택하면 차트가 표시됩니다
                        </div>
                      )}
                    </div>
                  </BalPanel>
                </div>

                {/* 주문서 (인라인 — 별도 패널 없음) */}
                <div className="trading-order-area" style={{ gridArea: 'order' }}>
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
                  />
                </div>

                {/* 체결/포지션 */}
                <div className="trading-crt-panel" style={{ gridArea: 'log' }}>
                  <TradeLogPanel portfolio={portfolio} prices={market.prices} />
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
          </div>
        </div>

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
