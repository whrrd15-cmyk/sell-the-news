import { useState } from 'react'
import { PortfolioAnalytics } from './PortfolioAnalytics'
import { TradeHistoryTable } from './TradeHistoryTable'
import type { Portfolio, TradeRecord } from '../../data/types'

interface BottomPanelProps {
  portfolio: Portfolio
  prices: Record<string, number>
  tradeHistory: TradeRecord[]
  totalFees: number
  realizedPnL: number
  portfolioValueHistory: number[]
}

type TabId = 'portfolio' | 'history'

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'portfolio', icon: '📊', label: '포트폴리오' },
  { id: 'history', icon: '📋', label: '히스토리' },
]

export function BottomPanel(props: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('portfolio')

  return (
    <div className="bottom-panel">
      <div className="bottom-panel-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`bottom-panel-tab ${activeTab === tab.id ? 'bottom-panel-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      <div className="bottom-panel-content">
        {activeTab === 'portfolio' && (
          <PortfolioAnalytics
            portfolio={props.portfolio}
            prices={props.prices}
            totalFees={props.totalFees}
            realizedPnL={props.realizedPnL}
            portfolioValueHistory={props.portfolioValueHistory}
          />
        )}
        {activeTab === 'history' && <TradeHistoryTable trades={props.tradeHistory} />}
      </div>
    </div>
  )
}
