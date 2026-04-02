import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '../../stores/gameStore'
import { STOCKS } from '../../data/stocks'
import { getPortfolioValue, getTotalReturn } from '../../engine/portfolio'
import CandlestickChart, { type ChartMarker } from '../charts/CandlestickChart'
import { BalPanel } from '../ui/BalPanel'
import { TradePanel } from '../trade/TradePanel'
import { StockCardStrip } from '../stocks/StockCardStrip'
import { PortfolioOverview } from '../ui/PortfolioOverview'
import { NewsPanel } from '../news/NewsPanel'
import { SectorImpactSummary } from '../news/SectorImpactSummary'
import { SpecialEventOverlay } from './SpecialEventOverlay'
import { BalatroBackground } from '../effects/BalatroBackground'
import type { BackgroundMood } from '../effects/BalatroBackground'
import { useScreenShake } from '../../hooks/useScreenShake'
import { InventoryDropdown } from '../ui/InventoryDropdown'
import { ShopIcon } from '../icons/SkillIcons'
import { BalChip } from '../ui/BalChip'
import { BreakingNewsBanner } from '../effects/BreakingNewsBanner'
import { WeeklyRuleBanner } from '../effects/WeeklyRuleBanner'
import { PhaseProgressBar } from '../ui/PhaseProgressBar'
import { PhaseCTA } from '../ui/PhaseCTA'
import { NewsReferenceDrawer } from '../ui/NewsReferenceDrawer'
import { ScoreCascade } from '../effects/ScoreCascade'
import { UnifiedGuide } from '../tutorial/UnifiedGuide'
import { SECTOR_COLORS } from '../../data/constants'
import { MarketConditionModal } from '../ui/MarketConditionModal'
import { MarketPulseBar } from '../ui/MarketPulseBar'
import { detectStockCondition } from '../../engine/marketCondition'
import { SFX, bgm } from '../../utils/sound'
import { NewsAnalystView } from '../news/NewsAnalystView'

const INITIAL_CASH = 10000

export function GameScreen() {
  const {
    turn, maxTurns, phase, runConfig, market, portfolio,
    currentNews, selectedStockId, selectStock,
    advanceToInvestmentPhase, executeBuy, executeSell,
    advanceToResultPhase, nextTurn,
    unlockedSkills, currentSpecialEvent,
    inventory, useItem, openShop, visitedShopThisTurn,
    breakingNews, breakingNewsDismissed,
    lastFeedback, resultCascadeData,
    isNewsDrawerOpen, toggleNewsDrawer,
    currentWeeklyRule, equippedCursedItems, tradesThisTurn,
    autoTradeRules, addAutoTradeRule, removeAutoTradeRule,
    activeEffects, marketConditions,
  } = useGameStore()

  // BGM
  useEffect(() => { bgm.crossFadeTo('game-main') }, [])

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartSize, setChartSize] = useState({ w: 500, h: 280 })
  const [showMarketModal, setShowMarketModal] = useState(false)

  // 시장 상황 리포트 아이템 사용 시 자동 표시
  useEffect(() => {
    if (activeEffects.includes('reveal_market_condition')) {
      setShowMarketModal(true)
    }
  }, [activeEffects])
  const portfolioValue = useMemo(() => getPortfolioValue(portfolio, market.prices), [portfolio, market.prices])
  const totalReturn = useMemo(() => getTotalReturn(portfolio, market.prices, INITIAL_CASH), [portfolio, market.prices])
  const selectedStock = useMemo(() => selectedStockId ? STOCKS.find(s => s.id === selectedStockId) ?? null : null, [selectedStockId])
  const selectedHistory = useMemo(() => {
    if (!selectedStockId) return []
    return market.priceHistories.find(h => h.stockId === selectedStockId)?.prices ?? []
  }, [selectedStockId, market.priceHistories])
  const selectedPosition = useMemo(() => portfolio.positions.find(p => p.stockId === selectedStockId) ?? null, [portfolio.positions, selectedStockId])
  const currentPrice = selectedStockId ? market.prices[selectedStockId] ?? 0 : 0
  const priceChange = useMemo(() => {
    if (!selectedStockId) return 0
    const hist = market.priceHistories.find(h => h.stockId === selectedStockId)
    if (!hist || hist.prices.length < 2) return 0
    const prev = hist.prices[hist.prices.length - 2]
    return prev > 0 ? (currentPrice - prev) / prev : 0
  }, [selectedStockId, market.priceHistories, currentPrice])

  // 선택 종목의 시장 상황 감지 (technical_analysis 스킬 필요)
  const selectedStockCondition = useMemo(() => {
    if (!selectedStockId || !unlockedSkills.includes('technical_analysis')) return 'neutral' as const
    return detectStockCondition(selectedStockId, market)
  }, [selectedStockId, market, unlockedSkills])

  // 차트 이벤트 마커 (effectHistory → 선택 종목 섹터 관련만 필터)
  const chartMarkers: ChartMarker[] = useMemo(() => {
    if (!selectedStock || !market.effectHistory) return []
    const sector = selectedStock.sector
    // priceHistories의 시작점 기준으로 turnIndex 매핑
    const histLen = selectedHistory.length
    if (histLen < 2) return []
    // effectHistory의 turnApplied는 절대 턴 번호
    // priceHistory는 generatePreviousQuarter부터 시작하므로 첫 가격의 턴은 대략 turn - histLen + 1
    const startTurn = turn - histLen + 1
    return market.effectHistory
      .filter(e => e.sectorImpacts.some(si => si.sector === sector))
      .map(e => {
        const impact = e.sectorImpacts.find(si => si.sector === sector)
        const idx = e.turnApplied - startTurn
        if (idx < 0 || idx >= histLen - 1) return null
        const isPositive = (impact?.impact ?? 0) >= 0
        return {
          turnIndex: idx,
          label: e.headline.length > 8 ? e.headline.slice(0, 8) + '…' : e.headline,
          color: isPositive ? '#5ec269' : '#e8534a',
          position: (isPositive ? 'belowBar' : 'aboveBar') as const,
        }
      })
      .filter((m): m is ChartMarker => m !== null)
  }, [selectedStock, market.effectHistory, selectedHistory.length, turn])

  // Auto-select first stock
  const hasAutoSelected = useRef(false)
  useEffect(() => {
    if (!hasAutoSelected.current && !selectedStockId && market.priceHistories.length > 0) {
      hasAutoSelected.current = true
      selectStock(market.priceHistories[0].stockId)
    }
  }, [selectedStockId, market.priceHistories, selectStock])

  // Resize chart
  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        setChartSize({ w: Math.floor(width), h: Math.floor(height) })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [phase])

  const { ref: shakeRef, shake } = useScreenShake({ intensity: 5, duration: 250 })

  // Shake on breaking news
  useEffect(() => {
    if (breakingNews && !breakingNewsDismissed) {
      shake()
    }
  }, [breakingNews, breakingNewsDismissed, shake])

  const handleAdvanceToInvestment = useCallback(() => { SFX.phaseChange(); advanceToInvestmentPhase() }, [advanceToInvestmentPhase])
  const handleBuy = useCallback((stockId: string, amount: number) => { SFX.buy(); executeBuy(stockId, amount); shake() }, [executeBuy, shake])
  const handleSell = useCallback((stockId: string, shares: number) => { SFX.sell(); executeSell(stockId, shares); shake() }, [executeSell, shake])
  const handleAdvanceToResult = useCallback(() => { SFX.phaseChange(); advanceToResultPhase() }, [advanceToResultPhase])
  const handleNextTurn = useCallback(() => { SFX.nextTurn(); nextTurn() }, [nextTurn])
  const handleSelectStock = useCallback((stockId: string) => {
    SFX.click()
    selectStock(selectedStockId === stockId ? null : stockId)
  }, [selectStock, selectedStockId])

  const isPositive = totalReturn >= 0

  const bgMood: BackgroundMood = useMemo(() => {
    if (phase === 'event') return 'danger'
    if (totalReturn >= 0.1) return 'profit'
    if (totalReturn <= -0.1) return 'loss'
    return 'neutral'
  }, [phase, totalReturn])

  const isFogOfWar = currentWeeklyRule?.effect.type === 'fog_of_war'
  const isNoSelling = currentWeeklyRule?.effect.type === 'no_selling'

  // Chart panel (reused across investment & result phases)
  const chartPanel = (
    <BalPanel
      label={selectedStock
        ? `${selectedStock.name} (${selectedStock.ticker})  $${currentPrice.toFixed(0)}  ${priceChange >= 0 ? '▲' : '▼'}${(priceChange * 100).toFixed(1)}%`
        : '차트'
      }
      accentColor={selectedStock ? SECTOR_COLORS[selectedStock.sector] : undefined}
      className="flex flex-col min-h-0 flex-1"
    >
      <div ref={chartContainerRef} className="flex-1 min-h-0" style={{ minHeight: 200 }}>
        {isFogOfWar ? (
          <div className="w-full h-full flex items-center justify-center text-bal-red text-sm">
            <span>안개 속의 시장 — 이번 주는 차트를 볼 수 없습니다</span>
          </div>
        ) : selectedHistory.length > 1 ? (
          <CandlestickChart
            prices={selectedHistory}
            volatility={selectedStock?.volatility ?? 0.3}
            width={chartSize.w}
            height={chartSize.h}
            markers={chartMarkers}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-bal-text-dim text-sm">
            종목을 선택하면 차트가 표시됩니다
          </div>
        )}
      </div>
    </BalPanel>
  )

  return (
    <div className="h-screen w-screen overflow-hidden font-pixel text-white relative">
      <BalatroBackground mood={bgMood} />

      <div ref={shakeRef} className="relative z-10 flex flex-col h-full">
        {/* ═══ 상단 바: 자산 정보 ═══ */}
        <div className="flex items-center justify-between px-2 pt-1 pb-0 flex-shrink-0" style={{ background: 'rgba(21,21,40,0.9)' }}>
          {/* 좌측: 자산 정보 */}
          <div className="flex items-center gap-2 px-1" data-guide="asset-bar">
            <BalChip color="gold" label="현금" small>${Math.floor(portfolio.cash).toLocaleString()}</BalChip>
            <BalChip color={isPositive ? 'green' : 'red'} label="수익률" small>
              {isPositive ? '+' : ''}{(totalReturn * 100).toFixed(1)}%
            </BalChip>
            <BalChip color="purple" label="RP" small>{portfolio.reputationPoints}</BalChip>
          </div>

          {/* 우측: 뉴스 + 인벤토리 + 상점 */}
          <div className="flex items-center gap-2 flex-shrink-0 pr-1">
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-xs text-bal-blue hover:bg-white/5 cursor-pointer"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={toggleNewsDrawer}
              title="뉴스 다시 보기"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
              </svg>
            </button>
            <InventoryDropdown inventory={inventory} phase={phase} onUseItem={useItem} />
            <button
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-xs ${
                visitedShopThisTurn
                  ? 'text-bal-text-dim/50 cursor-not-allowed'
                  : 'text-bal-purple hover:bg-white/5 cursor-pointer'
              }`}
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => { if (!visitedShopThisTurn) { SFX.click(); openShop() } }}
              disabled={visitedShopThisTurn}
              title={visitedShopThisTurn ? '이번 턴에 이미 방문했습니다' : '상점 열기'}
            >
              <ShopIcon size={14} />
            </button>
          </div>
        </div>

        {/* ═══ 페이즈 진행 바 ═══ */}
        <PhaseProgressBar phase={phase} turn={turn} maxTurns={maxTurns} runName={runConfig.name} />

        {/* ═══ 속보 배너 ═══ */}
        <BreakingNewsBanner />

        {/* ═══ 주간 규칙 배너 + 통합 시장 상태 바 ═══ */}
        <div className="flex items-center gap-2 px-2 flex-shrink-0">
          <WeeklyRuleBanner rule={currentWeeklyRule} />
          <MarketPulseBar
            marketConditions={marketConditions}
            herdSentiment={market.herdSentiment}
            panicLevel={market.panicLevel}
            maxBubble={Math.max(...Object.values(market.sectorBubble), 0)}
            dangerLevel={market.dangerLevel}
            activeEffects={market.activeEffects}
            onOpenConditionModal={() => setShowMarketModal(true)}
          />
          {equippedCursedItems.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              {equippedCursedItems.map((item, i) => (
                <span key={i} className="cursed-item-badge" title={`${item.name}: ${item.cursedEffect?.description}`}>
                  {item.name.slice(0, 1)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ═══ 페이즈별 콘텐츠 ═══ */}
        <div className="flex-1 min-h-0 flex flex-col">
          <AnimatePresence mode="wait">
            {phase === 'news' ? (
              /* ────── 뉴스 페이즈: 뉴스 분석관 ────── */
              <motion.div
                key="news"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-h-0 flex flex-col"
                data-guide="news-panel"
              >
                <NewsAnalystView />
              </motion.div>
            ) : phase === 'investment' ? (
              /* ────── 투자 페이즈: 차트+트레이드 | 종목카드 | 포트폴리오 ────── */
              <motion.div
                key="investment"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="game-dashboard game-dashboard--investment flex-1 min-h-0"
              >
                <div data-guide="chart-panel" style={{ gridArea: 'chart', display: 'flex', flexDirection: 'column', minHeight: 0 }}>{chartPanel}</div>

                {/* 매매 패널 (사이드바) */}
                <div style={{ gridArea: 'trade', minHeight: 0, overflow: 'auto' }} data-guide="trade-panel">
                  <TradePanel
                    stock={selectedStock}
                    currentPrice={currentPrice}
                    priceChange={priceChange}
                    portfolio={portfolio}
                    position={selectedPosition}
                    phase={phase}
                    onBuy={handleBuy}
                    onSell={handleSell}
                    sellDisabled={isNoSelling}
                    tradesRemaining={(unlockedSkills.includes('double_trade') ? 2 : 1) - tradesThisTurn}
                    tradeLimit={unlockedSkills.includes('double_trade') ? 2 : 1}
                    unlockedSkills={unlockedSkills}
                    stockCondition={selectedStockCondition}
                    autoTradeRules={autoTradeRules}
                    onAddAutoTradeRule={addAutoTradeRule}
                    onRemoveAutoTradeRule={removeAutoTradeRule}
                  />
                </div>

                {/* 종목 카드 스트립 (가로 스크롤) */}
                <div style={{ gridArea: 'stocks' }}>
                  <StockCardStrip
                    stocks={STOCKS}
                    prices={market.prices}
                    priceHistories={market.priceHistories}
                    positions={portfolio.positions}
                    selectedStockId={selectedStockId}
                    onSelectStock={handleSelectStock}
                  />
                </div>

                {/* 포트폴리오 개요 */}
                <div style={{ gridArea: 'portfolio' }}>
                  <PortfolioOverview portfolio={portfolio} prices={market.prices} />
                </div>

              </motion.div>
            ) : (
              /* ────── 결과 페이즈: 통합 스코어링 캐스케이드 ────── */
              <motion.div
                key="result"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-h-0 flex items-center justify-center bg-[rgba(10,10,20,0.75)] rounded-lg"
              >
                {resultCascadeData && (
                  <ScoreCascade
                    data={resultCascadeData}
                    feedback={lastFeedback}
                    onComplete={() => { SFX.nextTurn(); nextTurn() }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ 하단 CTA 버튼 (뉴스/결과 페이즈는 자체 CTA 사용) ═══ */}
          {phase !== 'result' && phase !== 'news' && (
            <div className="flex-shrink-0 px-2 pb-2" data-guide="phase-cta">
              <PhaseCTA
                phase={phase}
                onAdvanceToInvestment={handleAdvanceToInvestment}
                onAdvanceToResult={handleAdvanceToResult}
                onNextTurn={handleNextTurn}
              />
            </div>
          )}
        </div>
      </div>

      {/* 뉴스 참고 드로어 (투자 페이즈) */}
      <AnimatePresence>
        {isNewsDrawerOpen && (
          <NewsReferenceDrawer
            isOpen={isNewsDrawerOpen}
            onClose={toggleNewsDrawer}
            news={currentNews}
            unlockedSkills={unlockedSkills}
          />
        )}
      </AnimatePresence>

      <UnifiedGuide onNavigate={() => {}} />

      <AnimatePresence>{currentSpecialEvent && <SpecialEventOverlay />}</AnimatePresence>

      {showMarketModal && (
        <MarketConditionModal
          conditions={marketConditions}
          onClose={() => setShowMarketModal(false)}
        />
      )}
    </div>
  )
}

