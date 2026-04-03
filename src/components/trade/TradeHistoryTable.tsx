import type { TradeRecord } from '../../data/types'

interface TradeHistoryTableProps {
  trades: TradeRecord[]
}

export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  const sorted = [...trades].reverse()

  return (
    <div className="trade-history">
      {sorted.length === 0 ? (
        <div className="trade-history-empty">거래 내역이 없습니다</div>
      ) : (
        <table className="trade-history-table">
          <thead>
            <tr>
              <th>시간</th>
              <th>종목</th>
              <th>방향</th>
              <th>수량</th>
              <th>가격</th>
              <th>수수료</th>
              <th>손익</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(t => (
              <tr key={t.id}>
                <td className="trade-history-time">{t.timestamp}</td>
                <td className="trade-history-ticker">{t.ticker}</td>
                <td style={{ color: t.side === 'buy' ? '#5ec269' : '#e8534a' }}>
                  {t.side === 'buy' ? 'BUY' : 'SELL'}
                </td>
                <td>{t.quantity}</td>
                <td>${t.price.toFixed(2)}</td>
                <td className="pa-gold">${t.fee.toFixed(1)}</td>
                <td style={{ color: (t.realizedPnL ?? 0) >= 0 ? '#5ec269' : '#e8534a' }}>
                  {t.realizedPnL != null
                    ? `${t.realizedPnL >= 0 ? '+' : ''}$${t.realizedPnL.toFixed(0)}`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
