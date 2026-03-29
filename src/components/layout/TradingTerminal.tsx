import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useTimeStore } from '../../stores/timeStore'
import { useMarketStore } from '../../stores/marketStore'
import { useGameStore } from '../../stores/gameStore'
import { STOCKS } from '../../data/stocks'
import { getPortfolioValue, getTotalReturn } from '../../engine/portfolio'
import CandlestickChart from '../charts/CandlestickChart'
import { BalPanel } from '../ui/BalPanel'
import { TradePanel } from '../trade/TradePanel'
import { StockCardStrip } from '../stocks/StockCardStrip'
import { PortfolioOverview } from '../ui/PortfolioOverview'
import { MarketPulseBar } from '../ui/MarketPulseBar'
import { MarketConditionModal } from '../ui/MarketConditionModal'
import { BalatroBackground } from '../effects/BalatroBackground'
import type { BackgroundMood } from '../effects/BalatroBackground'
import { BalChip } from '../ui/BalChip'
import { BreakingNewsBanner } from '../effects/BreakingNewsBanner'
import { NewsPanel } from '../news/NewsPanel'
import { SectorImpactSummary } from '../news/SectorImpactSummary'
import { InventoryDropdown } from '../ui/InventoryDropdown'
import { ShopIcon } from '../icons/SkillIcons'
import { SpecialEventOverlay } from './SpecialEventOverlay'
import { SECTOR_COLORS } from '../../data/constants'
import { detectStockCondition } from '../../engine/marketCondition'
import { formatGameTime, getQuarterProgress, getMarketSession } from '../../engine/clock'
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
      initialized.current = true
    }
  }, [runConfig, initializeMarket])

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

  // ═══ 시계 이벤트 → 시장 업데이트 연결 ═══
  useEffect(() => {
    return timeSubscribe((events: ClockEvent[]) => {
      handleClockEvents(events, useTimeStore.getState().gameTime.tickCount)
    })
  }, [timeSubscribe, handleClockEvents])

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

  return (
    <div className="h-screen w-screen overflow-hidden font-pixel text-white relative">
      <BalatroBackground mood={bgMood} />

      <div className="relative z-10 trading-terminal">
        {/* ═══ HUD 바 ═══ */}
        <div className="trading-hud" style={{ gridArea: 'hud' }}>
          <div className="trading-hud-left">
            <BalChip color="gold" label="현금">${Math.floor(portfolio.cash).toLocaleString()}</BalChip>
            <BalChip color={isPositive ? 'green' : 'red'} label="수익률">
              {isPositive ? '+' : ''}{(totalReturn * 100).toFixed(1)}%
            </BalChip>
            <BalChip color="purple" label="RP">{portfolio.reputationPoints}</BalChip>
          </div>

          <div className="trading-hud-center">
            {/* 시간 표시 */}
            <div className="trading-time-display">
              <span className="trading-time-week">{runConfig?.name ?? '분기'}</span>
              <span className="trading-time-clock">{formatGameTime(gameTime)}</span>
              <span className={`trading-time-session ${session.isOpen ? 'trading-time-session--open' : ''}`}>
                {session.isOpen ? '장중' : session.preMarket ? '장전' : '장후'}
              </span>
            </div>
            {/* 속도 조절 */}
            <div className="trading-speed-controls">
              {(['paused', '1x', '2x', '4x'] as const).map(s => (
                <button
                  key={s}
                  className={`trading-speed-btn ${speed === s ? 'trading-speed-btn--active' : ''}`}
                  onClick={() => setSpeed(s)}
                >
                  {s === 'paused' ? '⏸' : s}
                </button>
              ))}
            </div>
            {/* 분기 진행 바 */}
            <div className="trading-quarter-bar">
              <div
                className="trading-quarter-fill"
                style={{ width: `${quarterProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="trading-hud-right">
            <MarketPulseBar
              marketConditions={marketConditions}
              herdSentiment={market.herdSentiment}
              panicLevel={market.panicLevel}
              maxBubble={Math.max(...Object.values(market.sectorBubble), 0)}
              dangerLevel={market.dangerLevel}
              activeEffects={market.activeEffects}
              onOpenConditionModal={() => setShowMarketModal(true)}
            />
            <InventoryDropdown
              inventory={inventory}
              onUseItem={(id) => { SFX.click(); useItem(id) }}
              phase="investment"
            />
            <button
              className={`p-1.5 rounded-lg transition-all ${
                visitedShopThisTurn
                  ? 'text-bal-text-dim/50 cursor-not-allowed'
                  : 'text-bal-purple hover:bg-white/5 cursor-pointer'
              }`}
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => { if (!visitedShopThisTurn) { SFX.click(); openShop() } }}
            >
              <ShopIcon size={14} />
            </button>
          </div>
        </div>

        {/* ═══ 뉴스 피드 (왼쪽) ═══ */}
        <div className="trading-news" style={{ gridArea: 'news' }}>
          <BalPanel label="뉴스 피드" className="flex flex-col h-full overflow-hidden">
            <NewsPanel news={currentNews} unlockedSkills={unlockedSkills} />
          </BalPanel>
        </div>

        {/* ═══ 차트 (중앙 상단) ═══ */}
        <div className="trading-chart" style={{ gridArea: 'chart' }}>
          <BalPanel
            label={selectedStock
              ? `${selectedStock.name} (${selectedStock.ticker})  $${currentPrice.toFixed(0)}  ${priceChange >= 0 ? '▲' : '▼'}${(priceChange * 100).toFixed(1)}%`
              : '차트'
            }
            accentColor={selectedStock ? SECTOR_COLORS[selectedStock.sector] : undefined}
            className="flex flex-col h-full"
          >
            <div ref={chartContainerRef} className="flex-1 min-h-0">
              {selectedHistory.length > 1 ? (
                <CandlestickChart
                  prices={selectedHistory}
                  volatility={selectedStock?.volatility ?? 0.3}
                  width={chartSize.w}
                  height={chartSize.h}
                  markers={[]}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-bal-text-dim text-sm">
                  종목을 선택하면 차트가 표시됩니다
                </div>
              )}
            </div>
          </BalPanel>
        </div>

        {/* ═══ 매매 패널 (오른쪽) ═══ */}
        <div className="trading-trade" style={{ gridArea: 'trading' }}>
          <TradePanel
            stock={selectedStock}
            currentPrice={currentPrice}
            priceChange={priceChange}
            portfolio={portfolio}
            position={selectedPosition}
            phase="investment"
            onBuy={handleBuy}
            onSell={handleSell}
            tradesRemaining={99}
            tradeLimit={99}
            unlockedSkills={unlockedSkills}
            stockCondition={selectedStockCondition}
            autoTradeRules={autoTradeRules}
            onAddAutoTradeRule={addAutoTradeRule}
            onRemoveAutoTradeRule={removeAutoTradeRule}
          />
        </div>

        {/* ═══ 하단: 여론 + 종목 카드 ═══ */}
        <div className="trading-bottom" style={{ gridArea: 'bottom' }}>
          <div className="trading-bottom-inner">
            {/* 섹터 임팩트 */}
            <SectorImpactSummary news={currentNews} />
            {/* 종목 카드 스트립 */}
            <StockCardStrip
              stocks={STOCKS}
              prices={market.prices}
              priceHistories={market.priceHistories}
              positions={portfolio.positions}
              selectedStockId={selectedStockId}
              onSelectStock={handleSelectStock}
            />
            {/* 포트폴리오 개요 */}
            <PortfolioOverview portfolio={portfolio} prices={market.prices} />
          </div>
        </div>

        {/* ═══ 속보 배너 ═══ */}
        <BreakingNewsBanner />

        {/* ═══ 특수 이벤트 ═══ */}
        {currentSpecialEvent && <SpecialEventOverlay />}

        {/* ═══ 시장 상황 모달 ═══ */}
        {showMarketModal && (
          <MarketConditionModal
            conditions={marketConditions}
            onClose={() => setShowMarketModal(false)}
          />
        )}

        {/* ═══ 분기 종료 오버레이 ═══ */}
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
                  {totalReturn >= (runConfig?.targetReturn ?? 0.05)
                    ? ' ✅ 달성!'
                    : ' ❌ 미달성'
                  }
                </div>
              </div>
              <div className="text-[10px] text-bal-text-dim mb-4 italic">
                "시장은 당신이 배운 것을 시험합니다. 다음 분기에서 더 나은 판단을 하세요."
              </div>
              <button
                className="bal-btn bal-btn-gold w-full"
                onClick={() => {
                  useGameStore.getState().setScreen('result')
                }}
              >
                결과 확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
