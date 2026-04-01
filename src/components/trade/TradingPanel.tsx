import { useState } from 'react'
import type { Stock, Portfolio, Position, ShortPosition, LeveragedPosition, LimitOrder, MarketCondition, AutoTradeRule } from '../../data/types'
import { TradePanel } from './TradePanel'
import { ShortPanel } from './ShortPanel'
import { LeveragePanel } from './LeveragePanel'
import { OrderPanel } from './OrderPanel'

/**
 * 통합 매매 패널 — 4개 탭
 *
 * 교육 포인트: "투자에는 다양한 도구가 있다.
 * 각 도구의 위험과 보상을 이해하고 상황에 맞게 사용하라."
 *
 * - 현물: 기본 매수/매도 (안전)
 * - 공매도: 하락 베팅 (고위험)
 * - 레버리지: 증폭 매수 (고위험)
 * - 주문: 조건부 자동 실행 (계획적)
 */

type TradeTab = 'spot' | 'short' | 'leverage' | 'orders'

interface TradingPanelProps {
  stock: Stock | null
  currentPrice: number
  priceChange: number
  portfolio: Portfolio
  position: Position | null
  onBuy: (stockId: string, amount: number) => void
  onSell: (stockId: string, shares: number) => void
  // 공매도
  shortPositions: ShortPosition[]
  onOpenShort: (stockId: string, shares: number, price: number) => void
  onCoverShort: (positionId: string, shares: number, price: number) => void
  // 레버리지
  leveragedPositions: LeveragedPosition[]
  onBuyLeverage: (stockId: string, amount: number, leverage: 2 | 5 | 10) => void
  onCloseLeverage: (positionId: string) => void
  maxLeverage: 2 | 5 | 10
  // 주문
  activeOrders: LimitOrder[]
  onCreateOrder: (order: Omit<LimitOrder, 'id' | 'createdAt'>) => void
  onCancelOrder: (orderId: string) => void
  // 기존
  unlockedSkills: string[]
  stockCondition: MarketCondition
  autoTradeRules: AutoTradeRule[]
  onAddAutoTradeRule: (rule: AutoTradeRule) => void
  onRemoveAutoTradeRule: (id: string) => void
  // 거래 횟수 제한
  tradesRemaining?: number
  tradeLimit?: number
}

const TABS: { key: TradeTab; label: string; iconSrc: string; color: string; skillRequired?: string }[] = [
  { key: 'spot', label: '현물', iconSrc: '/icons/tab-spot.png', color: '#5ec269' },
  { key: 'short', label: '공매도', iconSrc: '/icons/tab-short.png', color: '#e8534a', skillRequired: 'short_selling' },
  { key: 'leverage', label: '레버리지', iconSrc: '/icons/tab-leverage.png', color: '#e88c3a', skillRequired: 'leverage' },
  { key: 'orders', label: '주문', iconSrc: '/icons/tab-orders.png', color: '#5b9bd5' },
]

export function TradingPanel(props: TradingPanelProps) {
  const [activeTab, setActiveTab] = useState<TradeTab>('spot')

  // 스킬 잠금 확인
  const availableTabs = TABS.filter(t =>
    !t.skillRequired || props.unlockedSkills.includes(t.skillRequired)
  )

  return (
    <div className="flex flex-col h-full">
      {/* 탭 바 */}
      <div className="flex border-b border-white/5 flex-shrink-0">
        {availableTabs.map(tab => (
          <button
            key={tab.key}
            className={`flex-1 px-2 py-1.5 text-[10px] font-bold transition-all ${
              activeTab === tab.key
                ? 'border-b-2'
                : 'text-bal-text-dim hover:text-bal-text'
            }`}
            style={{
              color: activeTab === tab.key ? tab.color : undefined,
              borderColor: activeTab === tab.key ? tab.color : 'transparent',
              background: activeTab === tab.key ? `${tab.color}08` : 'transparent',
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            <img src={tab.iconSrc} alt="" style={{ width: 14, height: 14, imageRendering: 'pixelated', display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
            {tab.label}
          </button>
        ))}

        {/* 잠긴 탭 표시 */}
        {TABS.filter(t => t.skillRequired && !props.unlockedSkills.includes(t.skillRequired)).map(tab => (
          <button
            key={tab.key}
            className="flex-1 px-2 py-1.5 text-[10px] font-bold text-bal-text-dim/30 cursor-not-allowed"
            title={`${tab.label} 스킬을 언락하세요`}
            disabled
          >
            <img src="/icons/tab-locked.png" alt="" style={{ width: 12, height: 12, imageRendering: 'pixelated', display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'spot' && (
          <TradePanel
            stock={props.stock}
            currentPrice={props.currentPrice}
            priceChange={props.priceChange}
            portfolio={props.portfolio}
            position={props.position}
            phase="investment"
            onBuy={props.onBuy}
            onSell={props.onSell}
            tradesRemaining={props.tradesRemaining ?? 99}
            tradeLimit={props.tradeLimit ?? 99}
            unlockedSkills={props.unlockedSkills}
            stockCondition={props.stockCondition}
            autoTradeRules={props.autoTradeRules}
            onAddAutoTradeRule={props.onAddAutoTradeRule}
            onRemoveAutoTradeRule={props.onRemoveAutoTradeRule}
          />
        )}
        {activeTab === 'short' && (
          <ShortPanel
            stock={props.stock}
            currentPrice={props.currentPrice}
            cash={props.portfolio.cash}
            shortPositions={props.shortPositions}
            onOpenShort={props.onOpenShort}
            onCoverShort={props.onCoverShort}
          />
        )}
        {activeTab === 'leverage' && (
          <LeveragePanel
            stock={props.stock}
            currentPrice={props.currentPrice}
            cash={props.portfolio.cash}
            leveragedPositions={props.leveragedPositions}
            onBuyLeverage={props.onBuyLeverage}
            onCloseLeverage={props.onCloseLeverage}
            maxLeverage={props.maxLeverage}
          />
        )}
        {activeTab === 'orders' && (
          <OrderPanel
            stock={props.stock}
            currentPrice={props.currentPrice}
            activeOrders={props.activeOrders}
            onCreateOrder={props.onCreateOrder}
            onCancelOrder={props.onCancelOrder}
          />
        )}
      </div>
    </div>
  )
}
