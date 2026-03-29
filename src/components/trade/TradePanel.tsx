import { useState, useCallback, useMemo } from 'react'
import type { Stock, Portfolio, Position, AutoTradeRule, MarketCondition } from '../../data/types'

interface TradePanelProps {
  stock: Stock | null
  currentPrice: number
  priceChange: number
  portfolio: Portfolio
  position: Position | null
  phase: string
  onBuy: (stockId: string, amount: number) => void
  onSell: (stockId: string, shares: number) => void
  sellDisabled?: boolean
  tradesRemaining: number
  tradeLimit: number
  // 자동 매매 관련
  unlockedSkills?: string[]
  stockCondition?: MarketCondition
  autoTradeRules?: AutoTradeRule[]
  onAddAutoTradeRule?: (rule: AutoTradeRule) => void
  onRemoveAutoTradeRule?: (id: string) => void
}

export function TradePanel({
  stock, currentPrice, priceChange, portfolio, position,
  phase, onBuy, onSell, sellDisabled, tradesRemaining, tradeLimit,
  unlockedSkills = [], stockCondition = 'neutral',
  autoTradeRules = [], onAddAutoTradeRule, onRemoveAutoTradeRule,
}: TradePanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState(0)
  const [showAutoTrade, setShowAutoTrade] = useState(false)

  const maxBuy = useMemo(() =>
    currentPrice > 0 ? Math.floor(portfolio.cash / currentPrice) : 0,
    [portfolio.cash, currentPrice]
  )
  const maxSell = position?.shares ?? 0
  const maxQty = mode === 'buy' ? maxBuy : maxSell
  const orderAmount = quantity * currentPrice
  const isPositive = priceChange >= 0

  const positionReturn = useMemo(() => {
    if (!position || position.shares === 0 || position.avgBuyPrice === 0) return null
    return (currentPrice - position.avgBuyPrice) / position.avgBuyPrice
  }, [position, currentPrice])

  const clampQty = useCallback((v: number) =>
    Math.max(0, Math.min(v, mode === 'buy' ? maxBuy : maxSell)),
    [mode, maxBuy, maxSell]
  )

  const adjustQty = useCallback((delta: number) => {
    setQuantity(prev => clampQty(prev + delta))
  }, [clampQty])

  const handleModeSwitch = useCallback((m: 'buy' | 'sell') => {
    setMode(m)
    setQuantity(0)
  }, [])

  const handlePercentage = useCallback((pct: number) => {
    setQuantity(clampQty(Math.floor(maxQty * pct)))
  }, [clampQty, maxQty])

  const handleExecute = useCallback(() => {
    if (!stock || quantity <= 0) return
    if (mode === 'buy') {
      onBuy(stock.id, quantity * currentPrice)
    } else {
      onSell(stock.id, quantity)
    }
    setQuantity(0)
  }, [stock, quantity, mode, currentPrice, onBuy, onSell])

  // 추세 매매: 올인 매수
  const handleTrendBuy = useCallback(() => {
    if (!stock || portfolio.cash <= 0) return
    onBuy(stock.id, portfolio.cash)
    setQuantity(0)
  }, [stock, portfolio.cash, onBuy])

  // 자동 매매 관련
  const hasStopLoss = unlockedSkills.includes('stop_loss')
  const hasTrailingStop = unlockedSkills.includes('trailing_stop')
  const hasDCA = unlockedSkills.includes('dca_strategy')
  const hasRebalance = unlockedSkills.includes('range_rebalance')
  const hasTrendFollowing = unlockedSkills.includes('trend_following')
  const hasAnyAutoSkill = hasStopLoss || hasTrailingStop || hasDCA || hasRebalance
  const showTrendBuy = hasTrendFollowing && stockCondition === 'bull_trend' && mode === 'buy'

  const stockRules = useMemo(() =>
    stock ? autoTradeRules.filter(r => r.stockId === stock.id) : [],
    [autoTradeRules, stock]
  )

  const handleAddStopLoss = useCallback(() => {
    if (!stock || !onAddAutoTradeRule) return
    if (stockRules.some(r => r.type === 'stop_loss')) return
    onAddAutoTradeRule({
      id: `sl_${stock.id}_${Date.now()}`,
      type: 'stop_loss',
      stockId: stock.id,
      params: { threshold: -0.10 },
    })
  }, [stock, onAddAutoTradeRule, stockRules])

  const handleAddTrailingStop = useCallback(() => {
    if (!stock || !onAddAutoTradeRule) return
    if (stockRules.some(r => r.type === 'trailing_stop')) return
    onAddAutoTradeRule({
      id: `ts_${stock.id}_${Date.now()}`,
      type: 'trailing_stop',
      stockId: stock.id,
      params: { threshold: 0.10 },
    })
  }, [stock, onAddAutoTradeRule, stockRules])

  const handleAddDCA = useCallback(() => {
    if (!stock || !onAddAutoTradeRule) return
    if (stockRules.some(r => r.type === 'dca')) return
    onAddAutoTradeRule({
      id: `dca_${stock.id}_${Date.now()}`,
      type: 'dca',
      stockId: stock.id,
      params: {
        dcaAmount: Math.floor(portfolio.cash / 10),
        dcaBasePrice: currentPrice,
        portionsBought: 0,
        maxPortions: 10,
      },
    })
  }, [stock, onAddAutoTradeRule, stockRules, portfolio.cash, currentPrice])

  const handleAddRebalance = useCallback(() => {
    if (!stock || !onAddAutoTradeRule) return
    if (stockRules.some(r => r.type === 'rebalance')) return
    const range = currentPrice * 0.1
    onAddAutoTradeRule({
      id: `reb_${stock.id}_${Date.now()}`,
      type: 'rebalance',
      stockId: stock.id,
      params: {
        rangeHigh: Math.round(currentPrice + range),
        rangeLow: Math.round(currentPrice - range),
      },
    })
  }, [stock, onAddAutoTradeRule, stockRules, currentPrice])

  const accentColor = mode === 'buy' ? '#5ec269' : '#e8534a'
  const accentDim = mode === 'buy' ? '#5ec26922' : '#e8534a22'

  if (phase !== 'investment') return null

  return (
    <div className="flex flex-col gap-1.5">
      {/* ═══ 매수/매도 패널 ═══ */}
      <div className="bal-panel overflow-hidden" style={{ borderColor: `${accentColor}44` }}>
        {/* 탭 + 종목 정보 한 줄 */}
        <div className="flex items-stretch border-b" style={{ borderColor: accentDim }}>
          <button
            className={`px-3 py-1.5 text-xs font-bold transition-all ${
              mode === 'buy'
                ? 'text-bal-green bg-bal-green/10 border-b-2 border-bal-green'
                : 'text-bal-text-dim hover:text-bal-text'
            }`}
            onClick={() => handleModeSwitch('buy')}
          >매수</button>
          <button
            className={`px-3 py-1.5 text-xs font-bold transition-all ${
              sellDisabled
                ? 'text-bal-text-dim/30 cursor-not-allowed'
                : mode === 'sell'
                  ? 'text-bal-red bg-bal-red/10 border-b-2 border-bal-red'
                  : 'text-bal-text-dim hover:text-bal-text'
            }`}
            onClick={() => !sellDisabled && handleModeSwitch('sell')}
            title={sellDisabled ? '이번 주는 매도가 금지되어 있습니다' : undefined}
          >매도{sellDisabled && ' 🔒'}</button>

          {stock && (
            <div className="ml-auto flex items-center gap-2 px-2 text-xs">
              <span className="text-white font-bold">{stock.ticker}</span>
              <span className="font-bold" style={{ color: accentColor }}>${currentPrice.toFixed(0)}</span>
              <span className={`text-[10px] ${isPositive ? 'text-bal-green' : 'text-bal-red'}`}>
                {isPositive ? '▲' : '▼'}{(priceChange * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {stock ? (
          <div className="p-2 space-y-2">
            {/* 추세 매매: 올인 매수 버튼 */}
            {showTrendBuy && tradesRemaining > 0 && (
              <button
                className="w-full py-2 text-xs font-bold rounded-lg transition-all"
                style={{
                  background: 'linear-gradient(135deg, #f0b429, #e88c3a)',
                  color: '#1a1a2e',
                  boxShadow: '0 0 12px rgba(240,180,41,0.3)',
                }}
                onClick={handleTrendBuy}
              >
                🚀 설명할 시간이 없다, 사자! (올인 ${Math.floor(portfolio.cash).toLocaleString()})
              </button>
            )}

            {/* 수량 입력 */}
            <div className="flex items-center gap-1">
              <button
                className="w-7 h-7 rounded text-xs font-bold flex items-center justify-center transition-all"
                style={{ background: accentDim, color: accentColor }}
                onClick={() => adjustQty(-1)}
              >-</button>
              <input
                type="number"
                className="bal-input flex-1 text-sm py-1"
                style={{ borderColor: accentDim, color: accentColor, fontSize: '14px' }}
                value={quantity}
                onChange={e => setQuantity(clampQty(Math.max(0, parseInt(e.target.value) || 0)))}
                min={0}
                max={maxQty}
              />
              <button
                className="w-7 h-7 rounded text-xs font-bold flex items-center justify-center transition-all"
                style={{ background: accentDim, color: accentColor }}
                onClick={() => adjustQty(1)}
              >+</button>
            </div>

            {/* % 빠른 버튼 */}
            <div className="flex gap-1">
              {[
                { label: '25%', pct: 0.25 },
                { label: '50%', pct: 0.5 },
                { label: '전량', pct: 1 },
              ].map(({ label, pct }) => (
                <button
                  key={label}
                  className="flex-1 py-1 text-[10px] rounded transition-all font-bold"
                  style={{ background: accentDim, color: accentColor }}
                  onClick={() => handlePercentage(pct)}
                >{label}</button>
              ))}
            </div>

            {/* 요약 한 줄 */}
            <div className="flex items-center justify-between text-[10px] px-0.5">
              <span>
                <span className="text-bal-text-dim">주문 </span>
                <span className="font-bold" style={{ color: accentColor }}>${Math.floor(orderAmount).toLocaleString()}</span>
              </span>
              <span>
                <span className="text-bal-text-dim">현금 </span>
                <span className="text-bal-gold font-bold">${Math.floor(portfolio.cash).toLocaleString()}</span>
              </span>
              <span>
                <span className="text-bal-text-dim">보유 </span>
                <span className="text-bal-blue font-bold">{position?.shares ?? 0}주</span>
              </span>
            </div>

            {/* 수익률 (포지션 있을 때) */}
            {mode === 'sell' && positionReturn !== null && (
              <div className="text-[10px] text-center">
                <span className="text-bal-text-dim">평단 ${position!.avgBuyPrice.toFixed(0)} → </span>
                <span className={`font-bold ${positionReturn >= 0 ? 'text-bal-green' : 'text-bal-red'}`}>
                  {positionReturn >= 0 ? '+' : ''}{(positionReturn * 100).toFixed(1)}%
                </span>
              </div>
            )}

            {/* 남은 거래 횟수 */}
            <div className="flex items-center justify-center gap-1 text-[10px]">
              <span className="text-bal-text-dim">거래</span>
              {Array.from({ length: tradeLimit }, (_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${i < tradesRemaining ? 'bg-[#f0b429]' : 'bg-[#ffffff15]'}`}
                />
              ))}
              <span className={tradesRemaining > 0 ? 'text-[#f0b429]' : 'text-bal-red'}>{tradesRemaining}/{tradeLimit}</span>
            </div>

            {/* 실행 버튼 */}
            <button
              className={`w-full py-2 text-xs font-bold rounded-lg transition-all ${
                quantity > 0 && tradesRemaining > 0 ? '' : 'opacity-30 cursor-not-allowed'
              }`}
              style={{
                background: quantity > 0 && tradesRemaining > 0 ? accentColor : 'var(--color-bal-panel-light)',
                color: quantity > 0 && tradesRemaining > 0 ? '#1a1a2e' : 'var(--color-bal-text-dim)',
              }}
              onClick={handleExecute}
              disabled={quantity <= 0 || tradesRemaining <= 0}
            >
              {tradesRemaining <= 0
                ? '거래 횟수 소진'
                : <>
                    {mode === 'buy' ? '매수' : '매도'}
                    {quantity > 0 && ` ${quantity}주 ($${Math.floor(orderAmount).toLocaleString()})`}
                  </>
              }
            </button>
          </div>
        ) : (
          <div className="p-3 text-center text-bal-text-dim text-xs">
            종목을 선택하세요
          </div>
        )}
      </div>

      {/* ═══ 자동 매매 패널 ═══ */}
      {hasAnyAutoSkill && stock && (
        <div className="bal-panel overflow-hidden" style={{ borderColor: '#7799ff33' }}>
          <button
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-[#7799ff]"
            onClick={() => setShowAutoTrade(!showAutoTrade)}
          >
            <span>🤖 자동 매매</span>
            <span style={{ fontSize: 10, color: '#8888aa' }}>
              {stockRules.length > 0 && `${stockRules.length}개 활성`}
              {showAutoTrade ? ' ▲' : ' ▼'}
            </span>
          </button>

          {showAutoTrade && (
            <div className="px-2 pb-2 space-y-1.5">
              {/* 손절매 */}
              {hasStopLoss && position && position.shares > 0 && (
                <AutoTradeToggle
                  label="🛡️ 손절매 (-10%)"
                  active={stockRules.some(r => r.type === 'stop_loss')}
                  onActivate={handleAddStopLoss}
                  onDeactivate={() => {
                    const rule = stockRules.find(r => r.type === 'stop_loss')
                    if (rule && onRemoveAutoTradeRule) onRemoveAutoTradeRule(rule.id)
                  }}
                />
              )}

              {/* 목표 수익률 매도 */}
              {hasTrailingStop && position && position.shares > 0 && (
                <AutoTradeToggle
                  label="🎯 목표 수익률 매도 (+10%)"
                  active={stockRules.some(r => r.type === 'trailing_stop')}
                  onActivate={handleAddTrailingStop}
                  onDeactivate={() => {
                    const rule = stockRules.find(r => r.type === 'trailing_stop')
                    if (rule && onRemoveAutoTradeRule) onRemoveAutoTradeRule(rule.id)
                  }}
                />
              )}

              {/* 분할 매수 (DCA) */}
              {hasDCA && (
                <AutoTradeToggle
                  label={`📥 분할 매수 (10분할 ×$${Math.floor(portfolio.cash / 10).toLocaleString()})`}
                  active={stockRules.some(r => r.type === 'dca')}
                  onActivate={handleAddDCA}
                  onDeactivate={() => {
                    const rule = stockRules.find(r => r.type === 'dca')
                    if (rule && onRemoveAutoTradeRule) onRemoveAutoTradeRule(rule.id)
                  }}
                />
              )}

              {/* 박스권 리밸런싱 */}
              {hasRebalance && stockCondition === 'range_bound' && (
                <AutoTradeToggle
                  label={`⚖️ 박스권 리밸런싱 ($${Math.round(currentPrice * 0.9)}~$${Math.round(currentPrice * 1.1)})`}
                  active={stockRules.some(r => r.type === 'rebalance')}
                  onActivate={handleAddRebalance}
                  onDeactivate={() => {
                    const rule = stockRules.find(r => r.type === 'rebalance')
                    if (rule && onRemoveAutoTradeRule) onRemoveAutoTradeRule(rule.id)
                  }}
                />
              )}

              {/* 활성 룰 상세 */}
              {stockRules.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {stockRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between text-[9px] px-1 py-0.5 rounded" style={{ background: '#7799ff0a' }}>
                      <span style={{ color: '#7799ff' }}>
                        {rule.type === 'stop_loss' && `손절매 ${((rule.params.threshold ?? -0.1) * 100).toFixed(0)}%`}
                        {rule.type === 'trailing_stop' && `수익매도 +${((rule.params.threshold ?? 0.1) * 100).toFixed(0)}%`}
                        {rule.type === 'dca' && `분할매수 ${rule.params.portionsBought ?? 0}/${rule.params.maxPortions ?? 10}`}
                        {rule.type === 'rebalance' && `리밸런싱 $${rule.params.rangeLow}~$${rule.params.rangeHigh}`}
                      </span>
                      <button
                        className="text-[#e8534a] hover:text-[#ff6666]"
                        onClick={() => onRemoveAutoTradeRule?.(rule.id)}
                        title="해제"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AutoTradeToggle({ label, active, onActivate, onDeactivate }: {
  label: string
  active: boolean
  onActivate: () => void
  onDeactivate: () => void
}) {
  return (
    <button
      className="w-full flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold transition-all"
      style={{
        background: active ? '#7799ff15' : '#ffffff06',
        color: active ? '#7799ff' : '#8888aa',
        border: `1px solid ${active ? '#7799ff33' : '#ffffff0a'}`,
      }}
      onClick={active ? onDeactivate : onActivate}
    >
      <span>{label}</span>
      <span style={{ fontSize: 9, color: active ? '#5ec269' : '#666' }}>
        {active ? '● ON' : '○ OFF'}
      </span>
    </button>
  )
}
