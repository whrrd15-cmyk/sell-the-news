import { useState, useCallback, useMemo } from 'react'
import type { Stock, LeveragedPosition } from '../../data/types'
import { checkLiquidation } from '../../engine/portfolio'

interface LeveragePanelProps {
  stock: Stock | null
  currentPrice: number
  cash: number
  leveragedPositions: LeveragedPosition[]
  onBuyLeverage: (stockId: string, amount: number, leverage: 2 | 5 | 10) => void
  onCloseLeverage: (positionId: string) => void
  maxLeverage: 2 | 5 | 10
}

export function LeveragePanel({
  stock, currentPrice, cash, leveragedPositions,
  onBuyLeverage, onCloseLeverage, maxLeverage,
}: LeveragePanelProps) {
  const [amount, setAmount] = useState(0)
  const [leverage, setLeverage] = useState<2 | 5 | 10>(2)

  const stockPositions = useMemo(() =>
    stock ? leveragedPositions.filter(p => p.stockId === stock.id) : [],
  [leveragedPositions, stock])

  const totalBuyPower = amount * leverage
  const shares = currentPrice > 0 ? Math.floor(totalBuyPower / currentPrice) : 0
  const liquidationPrice = currentPrice > 0 && shares > 0
    ? Math.max(0, currentPrice - (amount - totalBuyPower * 0.005) / shares)
    : 0

  const handleBuy = useCallback(() => {
    if (!stock || amount <= 0) return
    onBuyLeverage(stock.id, amount, leverage)
    setAmount(0)
  }, [stock, amount, leverage, onBuyLeverage])

  if (!stock) {
    return <div className="p-3 text-center text-bal-text-dim text-xs">종목을 선택하세요</div>
  }

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-bal-text-dim text-center">
        🔥 레버리지로 수익을 증폭합니다 (위험도 함께 증폭)
      </div>

      {/* 배율 선택 */}
      <div className="flex gap-1">
        {([2, 5, 10] as const).filter(l => l <= maxLeverage).map(l => (
          <button key={l}
            className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
              leverage === l ? 'text-[#1a1a2e]' : 'text-bal-text-dim'
            }`}
            style={{
              background: leverage === l
                ? l === 2 ? '#5ec269' : l === 5 ? '#e88c3a' : '#e8534a'
                : 'rgba(255,255,255,0.05)',
            }}
            onClick={() => setLeverage(l)}
          >
            {l}배
          </button>
        ))}
      </div>

      {/* 투자금(자기자본) 입력 */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-bal-text-dim w-12">자기자본</span>
        <input type="number" className="bal-input flex-1 text-sm py-1"
          style={{ fontSize: '13px' }}
          value={amount} onChange={e => setAmount(Math.max(0, Math.min(cash, parseInt(e.target.value) || 0)))}
        />
      </div>
      <div className="flex gap-1">
        {[0.1, 0.25, 0.5].map(pct => (
          <button key={pct} className="flex-1 py-1 text-[10px] rounded font-bold"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-bal-text-dim)' }}
            onClick={() => setAmount(Math.floor(cash * pct))}
          >${Math.floor(cash * pct).toLocaleString()}</button>
        ))}
      </div>

      {/* 요약 */}
      <div className="text-[10px] px-1 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-bal-text-dim">총 매수력</span>
          <span className="font-bold text-bal-gold">${Math.floor(totalBuyPower).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-bal-text-dim">예상 수량</span>
          <span className="font-bold">{shares}주</span>
        </div>
        <div className="flex justify-between">
          <span className="text-bal-text-dim">청산가</span>
          <span className="font-bold text-bal-red">${liquidationPrice.toFixed(0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-bal-text-dim">일 이자</span>
          <span className="text-bal-text-dim">
            ${(totalBuyPower * (leverage === 2 ? 0.0001 : leverage === 5 ? 0.0002 : 0.0005)).toFixed(2)}
          </span>
        </div>
      </div>

      {/* 실행 */}
      <button
        className={`w-full py-2 text-xs font-bold rounded-lg transition-all ${amount > 0 ? '' : 'opacity-30 cursor-not-allowed'}`}
        style={{
          background: amount > 0
            ? leverage === 2 ? '#5ec269' : leverage === 5 ? '#e88c3a' : '#e8534a'
            : 'var(--color-bal-panel-light)',
          color: amount > 0 ? '#1a1a2e' : 'var(--color-bal-text-dim)',
        }}
        onClick={handleBuy} disabled={amount <= 0}
      >
        {amount > 0 ? `${leverage}배 레버리지 매수 ${shares}주` : '레버리지 매수'}
      </button>

      {/* 기존 레버리지 포지션 */}
      {stockPositions.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[9px] text-bal-text-dim font-bold">레버리지 포지션</div>
          {stockPositions.map(pos => {
            const pnl = (currentPrice - pos.avgBuyPrice) * pos.shares * pos.leverage - pos.accruedInterest
            const isLiquidation = checkLiquidation(pos, currentPrice)
            const dangerColor = isLiquidation ? '#e8534a' : pos.leverage >= 5 ? '#e88c3a' : '#5ec269'
            return (
              <div key={pos.id} className="flex items-center justify-between text-[9px] p-1.5 rounded"
                style={{
                  background: isLiquidation ? 'rgba(232,83,74,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${dangerColor}33`,
                }}
              >
                <div>
                  <span className="font-bold" style={{ color: dangerColor }}>{pos.leverage}배</span>
                  <span className="font-bold ml-1">{pos.shares}주</span>
                  <span className="text-bal-text-dim ml-1">@${pos.avgBuyPrice.toFixed(0)}</span>
                  {isLiquidation && <span className="text-[#e8534a] font-bold ml-1">⚠ 청산위험</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${pnl >= 0 ? 'text-bal-green' : 'text-bal-red'}`}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}
                  </span>
                  <button className="text-[8px] px-2 py-0.5 rounded bg-[#f0b42922] text-[#f0b429] font-bold"
                    onClick={() => onCloseLeverage(pos.id)}
                  >청산</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
