import { useState, useCallback, useMemo } from 'react'
import type { Stock, ShortPosition } from '../../data/types'
import { openShort, coverShort, checkShortMarginCall } from '../../engine/portfolio'

interface ShortPanelProps {
  stock: Stock | null
  currentPrice: number
  cash: number
  shortPositions: ShortPosition[]
  onOpenShort: (stockId: string, shares: number, price: number) => void
  onCoverShort: (positionId: string, shares: number, price: number) => void
}

export function ShortPanel({
  stock, currentPrice, cash, shortPositions, onOpenShort, onCoverShort,
}: ShortPanelProps) {
  const [shares, setShares] = useState(0)

  const stockShorts = useMemo(() =>
    stock ? shortPositions.filter(p => p.stockId === stock.id) : [],
  [shortPositions, stock])

  const maxShares = useMemo(() => {
    if (!currentPrice) return 0
    // 마진 150% 필요: shares * price * 1.5 <= cash + proceeds
    // proceeds = shares * price * 0.995
    // → shares * price * (1.5 - 0.995) <= cash
    // → shares <= cash / (price * 0.505)
    return Math.floor(cash / (currentPrice * 0.505))
  }, [cash, currentPrice])

  const handleOpen = useCallback(() => {
    if (!stock || shares <= 0) return
    onOpenShort(stock.id, shares, currentPrice)
    setShares(0)
  }, [stock, shares, currentPrice, onOpenShort])

  if (!stock) {
    return <div className="p-3 text-center text-bal-text-dim text-xs">종목을 선택하세요</div>
  }

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-bal-text-dim text-center">
        📉 주가 하락에 베팅합니다
      </div>

      {/* 수량 입력 */}
      <div className="flex items-center gap-1">
        <button className="w-7 h-7 rounded text-xs font-bold flex items-center justify-center"
          style={{ background: '#e8534a22', color: '#e8534a' }}
          onClick={() => setShares(Math.max(0, shares - 1))}
        >-</button>
        <input type="number" className="bal-input flex-1 text-sm py-1"
          style={{ borderColor: '#e8534a22', color: '#e8534a', fontSize: '14px' }}
          value={shares} onChange={e => setShares(Math.max(0, Math.min(maxShares, parseInt(e.target.value) || 0)))}
        />
        <button className="w-7 h-7 rounded text-xs font-bold flex items-center justify-center"
          style={{ background: '#e8534a22', color: '#e8534a' }}
          onClick={() => setShares(Math.min(maxShares, shares + 1))}
        >+</button>
      </div>

      {/* 빠른 버튼 */}
      <div className="flex gap-1">
        {[0.25, 0.5, 1].map(pct => (
          <button key={pct} className="flex-1 py-1 text-[10px] rounded font-bold"
            style={{ background: '#e8534a22', color: '#e8534a' }}
            onClick={() => setShares(Math.floor(maxShares * pct))}
          >{pct === 1 ? '최대' : `${pct * 100}%`}</button>
        ))}
      </div>

      {/* 요약 */}
      <div className="text-[10px] px-1 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-bal-text-dim">매도 대금</span>
          <span className="text-[#e8534a] font-bold">${Math.floor(shares * currentPrice).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-bal-text-dim">필요 마진</span>
          <span className="font-bold">${Math.floor(shares * currentPrice * 0.505).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-bal-text-dim">일 대여료</span>
          <span className="text-bal-text-dim">${(shares * currentPrice * 0.0002).toFixed(2)}</span>
        </div>
      </div>

      {/* 실행 */}
      <button
        className={`w-full py-2 text-xs font-bold rounded-lg transition-all ${shares > 0 ? '' : 'opacity-30 cursor-not-allowed'}`}
        style={{ background: shares > 0 ? '#e8534a' : 'var(--color-bal-panel-light)', color: shares > 0 ? '#1a1a2e' : 'var(--color-bal-text-dim)' }}
        onClick={handleOpen} disabled={shares <= 0}
      >
        {shares > 0 ? `공매도 ${shares}주` : '공매도'}
      </button>

      {/* 기존 공매도 포지션 */}
      {stockShorts.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[9px] text-bal-text-dim font-bold">활성 공매도</div>
          {stockShorts.map(pos => {
            const pnl = (pos.entryPrice - currentPrice) * pos.shares - pos.accruedFees
            const pnlPct = (pos.entryPrice - currentPrice) / pos.entryPrice
            const isMarginCall = checkShortMarginCall(pos, currentPrice)
            return (
              <div key={pos.id} className="flex items-center justify-between text-[9px] p-1.5 rounded"
                style={{ background: isMarginCall ? 'rgba(232,83,74,0.15)' : 'rgba(255,255,255,0.03)', border: isMarginCall ? '1px solid rgba(232,83,74,0.3)' : '1px solid rgba(255,255,255,0.05)' }}
              >
                <div>
                  <span className="font-bold">{pos.shares}주</span>
                  <span className="text-bal-text-dim ml-1">@${pos.entryPrice.toFixed(0)}</span>
                  {isMarginCall && <span className="text-[#e8534a] font-bold ml-1">⚠ 마진콜</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${pnl >= 0 ? 'text-bal-green' : 'text-bal-red'}`}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}
                  </span>
                  <button className="text-[8px] px-2 py-0.5 rounded bg-[#5b9bd522] text-[#5b9bd5] font-bold"
                    onClick={() => onCoverShort(pos.id, pos.shares, currentPrice)}
                  >커버</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
