import { useState, useCallback } from 'react'
import type { Stock, LimitOrder, OrderType, TimeInForce } from '../../data/types'

interface OrderPanelProps {
  stock: Stock | null
  currentPrice: number
  activeOrders: LimitOrder[]
  onCreateOrder: (order: Omit<LimitOrder, 'id' | 'createdAt'>) => void
  onCancelOrder: (orderId: string) => void
}

const ORDER_TYPE_LABELS: Record<OrderType, { label: string; color: string; desc: string }> = {
  buy_limit: { label: '지정가 매수', color: '#5ec269', desc: '지정한 가격 이하에서 자동 매수' },
  sell_limit: { label: '지정가 매도', color: '#e8534a', desc: '지정한 가격 이상에서 자동 매도' },
  stop_loss: { label: '손절매', color: '#e88c3a', desc: '지정한 가격 이하로 떨어지면 매도' },
  take_profit: { label: '익절매', color: '#5b9bd5', desc: '지정한 가격 이상이면 매도' },
}

export function OrderPanel({
  stock, currentPrice, activeOrders, onCreateOrder, onCancelOrder,
}: OrderPanelProps) {
  const [orderType, setOrderType] = useState<OrderType>('buy_limit')
  const [targetPrice, setTargetPrice] = useState(0)
  const [shares, setShares] = useState(0)
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('day')

  const typeInfo = ORDER_TYPE_LABELS[orderType]
  const stockOrders = stock ? activeOrders.filter(o => o.stockId === stock.id) : []

  const handleCreate = useCallback(() => {
    if (!stock || targetPrice <= 0 || shares <= 0) return
    onCreateOrder({
      stockId: stock.id,
      type: orderType,
      targetPrice,
      shares,
      timeInForce,
    })
    setTargetPrice(0)
    setShares(0)
  }, [stock, orderType, targetPrice, shares, timeInForce, onCreateOrder])

  // 가격 프리셋: 현재가 기준 ±%
  const presetPrice = (pct: number) => {
    setTargetPrice(Math.round(currentPrice * (1 + pct) * 100) / 100)
  }

  if (!stock) {
    return <div className="p-3 text-center text-bal-text-dim text-xs">종목을 선택하세요</div>
  }

  return (
    <div className="p-2 space-y-2">
      <div className="text-[10px] text-bal-text-dim text-center">
        📋 조건을 설정하면 자동으로 실행됩니다
      </div>

      {/* 주문 유형 */}
      <div className="grid grid-cols-2 gap-1">
        {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map(type => {
          const info = ORDER_TYPE_LABELS[type]
          return (
            <button key={type}
              className={`py-1.5 text-[9px] font-bold rounded transition-all ${orderType === type ? '' : 'opacity-50'}`}
              style={{ background: orderType === type ? `${info.color}22` : 'rgba(255,255,255,0.04)', color: info.color, border: `1px solid ${orderType === type ? `${info.color}44` : 'transparent'}` }}
              onClick={() => setOrderType(type)}
            >{info.label}</button>
          )
        })}
      </div>

      <div className="text-[9px] text-bal-text-dim text-center">{typeInfo.desc}</div>

      {/* 목표가 */}
      <div>
        <div className="text-[9px] text-bal-text-dim mb-0.5">목표가 (현재 ${currentPrice.toFixed(0)})</div>
        <input type="number" className="bal-input w-full text-sm py-1" style={{ fontSize: '13px' }}
          value={targetPrice || ''} onChange={e => setTargetPrice(Math.max(0, parseFloat(e.target.value) || 0))}
          placeholder="목표 가격"
        />
        <div className="flex gap-1 mt-1">
          {(orderType === 'buy_limit' || orderType === 'stop_loss')
            ? [{ label: '-3%', pct: -0.03 }, { label: '-5%', pct: -0.05 }, { label: '-10%', pct: -0.10 }]
            : [{ label: '+3%', pct: 0.03 }, { label: '+5%', pct: 0.05 }, { label: '+10%', pct: 0.10 }]
          .map(({ label, pct }) => (
            <button key={label} className="flex-1 py-0.5 text-[9px] rounded font-bold"
              style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}
              onClick={() => presetPrice(pct)}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* 수량 */}
      <div>
        <div className="text-[9px] text-bal-text-dim mb-0.5">수량</div>
        <input type="number" className="bal-input w-full text-sm py-1" style={{ fontSize: '13px' }}
          value={shares || ''} onChange={e => setShares(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="주문 수량"
        />
      </div>

      {/* 유효기간 */}
      <div className="flex gap-1">
        {([['day', '당일'], ['week', '주간'], ['gtc', '무기한']] as [TimeInForce, string][]).map(([tif, label]) => (
          <button key={tif}
            className={`flex-1 py-1 text-[9px] font-bold rounded ${timeInForce === tif ? 'text-white' : 'text-bal-text-dim'}`}
            style={{ background: timeInForce === tif ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)' }}
            onClick={() => setTimeInForce(tif)}
          >{label}</button>
        ))}
      </div>

      {/* 주문 등록 */}
      <button
        className={`w-full py-2 text-xs font-bold rounded-lg transition-all ${targetPrice > 0 && shares > 0 ? '' : 'opacity-30 cursor-not-allowed'}`}
        style={{ background: targetPrice > 0 && shares > 0 ? typeInfo.color : 'var(--color-bal-panel-light)', color: targetPrice > 0 && shares > 0 ? '#1a1a2e' : 'var(--color-bal-text-dim)' }}
        onClick={handleCreate} disabled={targetPrice <= 0 || shares <= 0}
      >
        {targetPrice > 0 && shares > 0
          ? `${typeInfo.label} ${shares}주 @$${targetPrice.toFixed(0)}`
          : '주문 등록'}
      </button>

      {/* 활성 주문 */}
      {stockOrders.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[9px] text-bal-text-dim font-bold">활성 주문</div>
          {stockOrders.map(order => {
            const info = ORDER_TYPE_LABELS[order.type]
            return (
              <div key={order.id} className="flex items-center justify-between text-[9px] p-1.5 rounded"
                style={{ background: `${info.color}08`, border: `1px solid ${info.color}22` }}
              >
                <div>
                  <span className="font-bold" style={{ color: info.color }}>{info.label}</span>
                  <span className="text-bal-text-dim ml-1">{order.shares}주 @${order.targetPrice.toFixed(0)}</span>
                </div>
                <button className="text-[8px] px-2 py-0.5 rounded text-[#e8534a] font-bold"
                  style={{ background: 'rgba(232,83,74,0.1)' }}
                  onClick={() => onCancelOrder(order.id)}
                >취소</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
