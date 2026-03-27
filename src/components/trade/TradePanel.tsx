import { useState, useCallback, useMemo } from 'react'
import type { Stock, Portfolio, Position } from '../../data/types'

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
}

export function TradePanel({
  stock, currentPrice, priceChange, portfolio, position,
  phase, onBuy, onSell, sellDisabled, tradesRemaining, tradeLimit,
}: TradePanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [quantity, setQuantity] = useState(0)

  const maxBuy = useMemo(() =>
    currentPrice > 0 ? Math.floor(portfolio.cash / currentPrice) : 0,
    [portfolio.cash, currentPrice]
  )
  const maxSell = position?.shares ?? 0
  const maxQty = mode === 'buy' ? maxBuy : maxSell
  const orderAmount = quantity * currentPrice
  const isPositive = priceChange >= 0

  // 수익률 (매도 시 표시)
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

    </div>
  )
}
